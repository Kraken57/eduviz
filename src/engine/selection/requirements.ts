import type { Capability } from '../renderer/types.js'
import type {
  EntityType,
  RelationshipType,
  Scene,
} from '../../ir/types.js'

// ─── Requirements Extraction ────────────────────────────────────────────────

export interface SceneRequirements {
  entityTypes: EntityType[]
  relationshipTypes: RelationshipType[]
  features: Capability[]
}

export function extractSceneRequirements(scene: Scene): SceneRequirements {
  const entityTypes = new Set<EntityType>(scene.entities.map((e) => e.type))
  const relationshipTypes = new Set<RelationshipType>()
  const featureSet = new Set<Capability>()

  for (const rel of scene.relationships ?? []) {
    relationshipTypes.add(rel.type)
  }

  if (scene.animations && scene.animations.length > 0) {
    featureSet.add('animations')
  }
  if (scene.timelines && scene.timelines.length > 0) {
    featureSet.add('timelines')
  }

  for (const entity of scene.entities) {
    scanPropertiesForFeatures(entity.properties, featureSet)
  }

  return {
    entityTypes: [...entityTypes].sort(),
    relationshipTypes: [...relationshipTypes].sort(),
    features: [...featureSet].sort(),
  }
}

function scanPropertiesForFeatures(
  properties: Record<string, unknown>,
  features: Set<Capability>,
): void {
  for (const prop of Object.values(properties)) {
    if (prop === null || typeof prop !== 'object' || Array.isArray(prop)) continue
    const obj = prop as Record<string, unknown>
    if ('anim' in obj) features.add('animations')
    if ('interact' in obj) features.add('interactions')
    if ('value' in obj) {
      const val = obj.value
      if (val !== null && typeof val === 'object' && !Array.isArray(val)) {
        const v = val as Record<string, unknown>
        if ('ref' in v) features.add('references')
        if ('expr' in v) features.add('expressions')
      }
    }
  }
}
