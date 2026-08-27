import type {
  Entity,
  EntityId,
  GeneratorDef,
  PropertyBag,
  Relationship,
  RelationshipType,
  Scene,
  Value,
  ValueRef,
} from '../../ir/types.js'
import { validateScene } from '../../ir/validate.js'
import type { Capability, SceneRequirements } from '../renderer/types.js'
import { expandGenerator, type GeneratorLimits, DEFAULT_LIMITS } from './generators/expander.js'

// ─── Entity Index ───────────────────────────────────────────────────────────

export interface EntityIndex {
  byId: Map<EntityId, Entity>
  childrenOf: Map<EntityId, EntityId[]>
  parentOf: Map<EntityId, EntityId>
  outgoingByType: Map<EntityId, Map<RelationshipType, Relationship[]>>
  incomingByType: Map<EntityId, Map<RelationshipType, Relationship[]>>
  outgoing: Map<EntityId, Relationship[]>
  incoming: Map<EntityId, Relationship[]>
}

// ─── Preprocessed Scene ─────────────────────────────────────────────────────

export interface PreprocessedScene {
  scene: Scene
  entityIndex: EntityIndex
  sceneRequirements: SceneRequirements
}

// ─── Index Builders ─────────────────────────────────────────────────────────

function buildEntityById(entities: Entity[]): Map<EntityId, Entity> {
  const map = new Map<EntityId, Entity>()
  for (const entity of entities) {
    map.set(entity.id, entity)
  }
  return map
}

function buildContainmentMaps(
  relationships: Relationship[],
): { childrenOf: Map<EntityId, EntityId[]>; parentOf: Map<EntityId, EntityId> } {
  const childrenOf = new Map<EntityId, EntityId[]>()
  const parentOf = new Map<EntityId, EntityId>()

  for (const rel of relationships) {
    if (rel.type !== 'containment') continue

    if (!childrenOf.has(rel.from)) {
      childrenOf.set(rel.from, [])
    }
    childrenOf.get(rel.from)!.push(rel.to)
    parentOf.set(rel.to, rel.from)
  }

  return { childrenOf, parentOf }
}

function buildRelationshipMaps(
  relationships: Relationship[],
): {
  outgoingByType: Map<EntityId, Map<RelationshipType, Relationship[]>>
  incomingByType: Map<EntityId, Map<RelationshipType, Relationship[]>>
  outgoing: Map<EntityId, Relationship[]>
  incoming: Map<EntityId, Relationship[]>
} {
  const outgoingByType = new Map<EntityId, Map<RelationshipType, Relationship[]>>()
  const incomingByType = new Map<EntityId, Map<RelationshipType, Relationship[]>>()
  const outgoing = new Map<EntityId, Relationship[]>()
  const incoming = new Map<EntityId, Relationship[]>()

  for (const rel of relationships) {
    if (!outgoingByType.has(rel.from)) {
      outgoingByType.set(rel.from, new Map())
    }
    const fromMap = outgoingByType.get(rel.from)!
    if (!fromMap.has(rel.type)) {
      fromMap.set(rel.type, [])
    }
    fromMap.get(rel.type)!.push(rel)

    if (!incomingByType.has(rel.to)) {
      incomingByType.set(rel.to, new Map())
    }
    const toMap = incomingByType.get(rel.to)!
    if (!toMap.has(rel.type)) {
      toMap.set(rel.type, [])
    }
    toMap.get(rel.type)!.push(rel)

    if (!outgoing.has(rel.from)) {
      outgoing.set(rel.from, [])
    }
    outgoing.get(rel.from)!.push(rel)

    if (!incoming.has(rel.to)) {
      incoming.set(rel.to, [])
    }
    incoming.get(rel.to)!.push(rel)
  }

  return { outgoingByType, incomingByType, outgoing, incoming }
}

function buildEntityIndex(scene: Scene): EntityIndex {
  const byId = buildEntityById(scene.entities)
  const { childrenOf, parentOf } = buildContainmentMaps(scene.relationships ?? [])
  const {
    outgoingByType,
    incomingByType,
    outgoing,
    incoming,
  } = buildRelationshipMaps(scene.relationships ?? [])

  return {
    byId,
    childrenOf,
    parentOf,
    outgoingByType,
    incomingByType,
    outgoing,
    incoming,
  }
}

// ─── Requirements Extraction ────────────────────────────────────────────────

function extractRequirements(scene: Scene): SceneRequirements {
  const entityTypes = new Set(scene.entities.map((e) => e.type))
  const relationshipTypes = new Set<RelationshipType>()
  for (const rel of scene.relationships ?? []) {
    relationshipTypes.add(rel.type)
  }

  const features: Capability[] = []

  if (scene.animations && scene.animations.length > 0) {
    features.push('animations')
  }
  if (scene.timelines && scene.timelines.length > 0) {
    features.push('timelines')
  }

  for (const entity of scene.entities) {
    for (const prop of Object.values(entity.properties)) {
      if (prop !== null && typeof prop === 'object' && !Array.isArray(prop)) {
        const p = prop as Record<string, unknown>
        if ('anim' in p) features.push('animations')
        if ('interact' in p) features.push('interactions')
        if ('value' in p) {
          const val = p.value as Value
          if (val !== null && typeof val === 'object' && !Array.isArray(val)) {
            const v = val as Record<string, unknown>
            if ('ref' in v) features.push('references')
            if ('expr' in v) features.push('expressions')
          }
        }
      }
    }
  }

  return {
    entityTypes: [...entityTypes].sort(),
    relationshipTypes: [...relationshipTypes].sort(),
    features: [...new Set(features)].sort(),
  }
}

// ─── Reference Resolution ───────────────────────────────────────────────────

function isValueRef(v: Value): v is ValueRef {
  return v !== null && typeof v === 'object' && !Array.isArray(v) && 'ref' in v
}

function resolveRef(
  ref: ValueRef,
  entityIndex: EntityIndex,
  visited: Set<string> = new Set(),
): Value | undefined {
  if (visited.has(ref.ref)) return undefined
  visited.add(ref.ref)

  const entity = entityIndex.byId.get(ref.ref)
  if (!entity) return undefined

  if (ref.property) {
    const prop = entity.properties[ref.property]
    if (prop === undefined) return undefined
    if (prop !== null && typeof prop === 'object' && !Array.isArray(prop) && 'value' in prop) {
      const innerProp = prop as Record<string, unknown>
      const val = innerProp.value as Value
      if (isValueRef(val)) {
        return resolveRef(val, entityIndex, new Set(visited))
      }
      return val
    }
    return prop as Value
  }

  return entity.properties as Value
}

// ─── Normalization ──────────────────────────────────────────────────────────

function normalizeProperties(props: PropertyBag, entityIndex: EntityIndex): PropertyBag {
  const result: PropertyBag = {}

  for (const [key, prop] of Object.entries(props)) {
    if (prop !== null && typeof prop === 'object' && !Array.isArray(prop)) {
      const p = prop as Record<string, unknown>
      if ('value' in p && isValueRef(p.value as Value)) {
        const resolved = resolveRef(p.value as ValueRef, entityIndex)
        result[key] = { ...p, value: resolved ?? p.value } as Value
      } else {
        result[key] = prop
      }
    } else {
      result[key] = prop
    }
  }

  return result
}

// ─── Deterministic Sort ─────────────────────────────────────────────────────

function sortEntities(entities: Entity[]): Entity[] {
  return [...entities].sort((a, b) => a.id.localeCompare(b.id))
}

function sortRelationships(relationships: Relationship[]): Relationship[] {
  return [...relationships].sort((a, b) => {
    const typeCompare = a.type.localeCompare(b.type)
    if (typeCompare !== 0) return typeCompare
    const fromCompare = a.from.localeCompare(b.from)
    if (fromCompare !== 0) return fromCompare
    return a.to.localeCompare(b.to)
  })
}

// ─── Generator Expansion ────────────────────────────────────────────────────

function expandGenerators(
  entities: Entity[],
  relationships: Relationship[],
  limits: GeneratorLimits = DEFAULT_LIMITS,
): { entities: Entity[]; relationships: Relationship[]; errors: string[] } {
  const expanded: Entity[] = []
  const newRelationships: Relationship[] = []
  const errors: string[] = []
  let totalEntities = entities.length

  for (const entity of entities) {
    const generatorProp = entity.properties['generator']
    if (generatorProp === undefined || generatorProp === null) {
      expanded.push(entity)
      continue
    }

    if (typeof generatorProp !== 'object' || Array.isArray(generatorProp)) {
      expanded.push(entity)
      continue
    }

    // Unwrap the Prop wrapper ({ value: {...} })
    let generator = generatorProp as unknown as GeneratorDef
    const wrapper = generatorProp as unknown as { value?: unknown }
    if (wrapper && typeof wrapper.value === 'object' && !Array.isArray(wrapper.value) && wrapper.value !== null) {
      generator = wrapper.value as unknown as GeneratorDef
    }

    if (!('type' in generator)) {
      expanded.push(entity)
      continue
    }

    if (totalEntities > limits.maxTotalEntities) {
      errors.push(`Total entity limit exceeded (${limits.maxTotalEntities})`)
      break
    }

    const result = expandGenerator(entity.id, generator, limits)
    if (result.errors.length > 0) {
      errors.push(...result.errors.map(e => `${entity.id}: ${e}`))
      continue
    }

    // Merge non-generator "extras" properties (e.g. fill) into each generated child
    const childEntities = result.entities.map(child => ({
      ...child,
      properties: {
        ...child.properties,
        ...propertiesWithoutGenerator(entity.properties),
      },
    }))

    // Keep the generator stub as a group container so containment relationships resolve
    const container: Entity = {
      id: entity.id,
      type: 'group',
      name: entity.name,
      properties: propertiesWithoutGenerator(entity.properties),
    }
    expanded.push(container)
    expanded.push(...childEntities)
    totalEntities += childEntities.length

    for (const childEntity of childEntities) {
      newRelationships.push({
        type: 'containment',
        from: entity.id,
        to: childEntity.id,
      })
    }
  }

  return {
    entities: expanded,
    relationships: [...relationships, ...newRelationships],
    errors,
  }
}

// ─── Extract non-generator properties (extras) from a generator entity ──────

function propertiesWithoutGenerator(properties: PropertyBag): PropertyBag {
  const result: PropertyBag = {}
  for (const [key, value] of Object.entries(properties)) {
    if (key !== 'generator') {
      result[key] = value
    }
  }
  return result
}

// ─── Preprocessing Pipeline ─────────────────────────────────────────────────

export interface PreprocessResult {
  success: boolean
  preprocessed?: PreprocessedScene
  errors: string[]
}

export function preprocessScene(scene: Scene, limits?: GeneratorLimits): PreprocessResult {
  const validation = validateScene(scene)
  if (!validation.valid) {
    return {
      success: false,
      errors: validation.errors.map((e) => `${e.path}: ${e.message}`),
    }
  }

  const { entities: expandedEntities, relationships: expandedRelationships, errors: genErrors } =
    expandGenerators(scene.entities, scene.relationships ?? [], limits)

  if (genErrors.length > 0 && expandedEntities.length === 0) {
    return {
      success: false,
      errors: genErrors,
    }
  }

  const sortedEntities = sortEntities(expandedEntities)
  const sortedRelationships = sortRelationships(expandedRelationships)

  const normalizedScene: Scene = {
    ...scene,
    entities: sortedEntities.map((entity) => ({
      ...entity,
      properties: normalizeProperties(entity.properties, {
        byId: buildEntityById(sortedEntities),
        childrenOf: new Map(),
        parentOf: new Map(),
        outgoingByType: new Map(),
        incomingByType: new Map(),
        outgoing: new Map(),
        incoming: new Map(),
      }),
    })),
    relationships: sortedRelationships,
  }

  const entityIndex = buildEntityIndex(normalizedScene)
  const sceneRequirements = extractRequirements(normalizedScene)

  return {
    success: true,
    preprocessed: {
      scene: normalizedScene,
      entityIndex,
      sceneRequirements,
    },
    errors: genErrors,
  }
}

// ─── Convenience Queries ────────────────────────────────────────────────────

export function getEntity(index: EntityIndex, id: EntityId): Entity | undefined {
  return index.byId.get(id)
}

export function getChildren(index: EntityIndex, id: EntityId): Entity[] {
  const childIds = index.childrenOf.get(id) ?? []
  return childIds.map((cid) => index.byId.get(cid)).filter((e): e is Entity => e !== undefined)
}

export function getParent(index: EntityIndex, id: EntityId): Entity | undefined {
  const parentId = index.parentOf.get(id)
  if (parentId === undefined) return undefined
  return index.byId.get(parentId)
}

export function getRelationships(
  index: EntityIndex,
  id: EntityId,
  opts?: { direction?: 'outgoing' | 'incoming' | 'both'; type?: RelationshipType },
): Relationship[] {
  const direction = opts?.direction ?? 'both'
  const type = opts?.type

  let rels: Relationship[] = []

  if (direction === 'outgoing' || direction === 'both') {
    if (type !== undefined) {
      rels = rels.concat(index.outgoingByType.get(id)?.get(type) ?? [])
    } else {
      rels = rels.concat(index.outgoing.get(id) ?? [])
    }
  }

  if (direction === 'incoming' || direction === 'both') {
    if (type !== undefined) {
      rels = rels.concat(index.incomingByType.get(id)?.get(type) ?? [])
    } else {
      rels = rels.concat(index.incoming.get(id) ?? [])
    }
  }

  return rels
}

export function getReferencedEntities(index: EntityIndex, id: EntityId): Entity[] {
  const outgoing = index.outgoing.get(id) ?? []
  const refs = outgoing.filter((r) => r.type === 'reference')
  return refs
    .map((r) => index.byId.get(r.to))
    .filter((e): e is Entity => e !== undefined)
}
