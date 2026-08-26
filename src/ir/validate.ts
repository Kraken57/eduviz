import type {
  Entity,
  EntityId,
  Expression,
  Primitive,
  Scene,
  ValueRef,
} from './types.js'

// ─── Result ────────────────────────────────────────────────────────────────

export interface ValidationError {
  path: string
  message: string
}

export interface ValidationResult {
  valid: boolean
  errors: ValidationError[]
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

function isPrimitive(v: unknown): v is Primitive {
  return (
    v === null ||
    typeof v === 'string' ||
    typeof v === 'number' ||
    typeof v === 'boolean'
  )
}

// ─── Value Validators ──────────────────────────────────────────────────────

function isFlatPrimitiveArray(v: unknown): boolean {
  return Array.isArray(v) && v.every((e) => isPrimitive(e))
}

function isNestedArray(v: unknown): boolean {
  if (!Array.isArray(v)) return false
  return v.every((e) => isFlatPrimitiveArray(e) || isNestedArray(e))
}

function validateValue(v: unknown, path: string): ValidationError[] {
  if (isPrimitive(v)) return []

  if (isRecord(v) && 'ref' in v && typeof (v as ValueRef).ref === 'string') {
    return []
  }

  if (isRecord(v) && 'expr' in v && typeof (v as Expression).expr === 'string') {
    return []
  }

  if (isFlatPrimitiveArray(v) || isNestedArray(v)) {
    return []
  }

  if (isRecord(v)) {
    const errors: ValidationError[] = []
    for (const [key, val] of Object.entries(v)) {
      if (!isPrimitive(val) && !Array.isArray(val) && !isRecord(val)) {
        errors.push({
          path: `${path}.${key}`,
          message: `invalid nested value: ${JSON.stringify(val)}`,
        })
      }
    }
    return errors
  }

  return [{ path, message: `invalid value: ${JSON.stringify(v)}` }]
}

// ─── Property Validators ───────────────────────────────────────────────────

function validateProp(v: unknown, path: string): ValidationError[] {
  if (v === undefined) return []

  if (isPrimitive(v) || Array.isArray(v)) {
    return validateValue(v, path)
  }

  if (!isRecord(v)) {
    return [{ path, message: 'property must be a value or Prop object' }]
  }

  const errors: ValidationError[] = []

  if ('value' in v) {
    errors.push(...validateValue(v.value, `${path}.value`))
  }

  if ('anim' in v && isRecord(v.anim)) {
    errors.push(...validatePropAnim(v.anim, `${path}.anim`))
  }

  if ('interact' in v && isRecord(v.interact)) {
    errors.push(...validatePropInteract(v.interact, `${path}.interact`))
  }

  return errors
}

function validateGeneratorProp(v: unknown, path: string): ValidationError[] {
  if (!isRecord(v)) {
    return [{ path, message: 'generator property must be an object' }]
  }

  if ('value' in v) {
    return validateGenerator(v.value, `${path}.value`)
  }

  return validateGenerator(v, path)
}

function validatePropAnim(v: Record<string, unknown>, path: string): ValidationError[] {
  const errors: ValidationError[] = []

  if (!Array.isArray(v.keyframes)) {
    errors.push({ path: `${path}.keyframes`, message: 'must be an array' })
    return errors
  }

  v.keyframes.forEach((kf, i) => {
    errors.push(...validateKeyframe(kf, `${path}.keyframes[${i}]`))
  })

  if (typeof v.duration !== 'number' || v.duration < 0) {
    errors.push({ path: `${path}.duration`, message: 'must be a non-negative number' })
  }

  return errors
}

function validatePropInteract(v: Record<string, unknown>, path: string): ValidationError[] {
  const errors: ValidationError[] = []

  if ('on' in v) {
    if (!Array.isArray(v.on)) {
      errors.push({ path: `${path}.on`, message: 'must be an array' })
    } else {
      v.on.forEach((evt, i) => {
        errors.push(...validateInteractionEvent(evt, `${path}.on[${i}]`))
      })
    }
  }

  return errors
}

// ─── Keyframe Validator ────────────────────────────────────────────────────

function validateKeyframe(v: unknown, path: string): ValidationError[] {
  if (!isRecord(v)) {
    return [{ path, message: 'keyframe must be an object' }]
  }

  const errors: ValidationError[] = []

  if (typeof v.offset !== 'number') {
    errors.push({ path: `${path}.offset`, message: 'must be a number' })
  }

  if (!('value' in v)) {
    errors.push({ path: `${path}.value`, message: 'is required' })
  } else {
    errors.push(...validateValue(v.value, `${path}.value`))
  }

  return errors
}

// ─── Interaction Validators ────────────────────────────────────────────────

function validateInteractionEvent(v: unknown, path: string): ValidationError[] {
  if (!isRecord(v)) {
    return [{ path, message: 'interaction event must be an object' }]
  }

  const errors: ValidationError[] = []

  if (typeof v.event !== 'string') {
    errors.push({ path: `${path}.event`, message: 'must be a string' })
  }

  if (!('action' in v)) {
    errors.push({ path: `${path}.action`, message: 'is required' })
  } else {
    errors.push(...validateInteractionAction(v.action, `${path}.action`))
  }

  return errors
}

function validateInteractionAction(v: unknown, path: string): ValidationError[] {
  if (!isRecord(v)) {
    return [{ path, message: 'action must be an object' }]
  }

  if (typeof v.type !== 'string') {
    return [{ path: `${path}.type`, message: 'must be a string' }]
  }

  const action = v as Record<string, unknown>

  switch (action.type) {
    case 'set':
      if (typeof action.target !== 'string') {
        return [{ path: `${path}.target`, message: 'must be a string' }]
      }
      if (!('value' in action)) {
        return [{ path: `${path}.value`, message: 'is required' }]
      }
      return validateValue(action.value, `${path}.value`)

    case 'toggle':
      if (typeof action.target !== 'string') {
        return [{ path: `${path}.target`, message: 'must be a string' }]
      }
      return []

    case 'tooltip':
      if (typeof action.message !== 'string') {
        return [{ path: `${path}.message`, message: 'must be a string' }]
      }
      return []

    case 'emit':
      if (typeof action.event !== 'string') {
        return [{ path: `${path}.event`, message: 'must be a string' }]
      }
      return []

    default:
      return [{ path: `${path}.type`, message: `unknown action type: ${String(action.type)}` }]
  }
}

// ─── Generator Validator ─────────────────────────────────────────────────────

const VALID_GENERATOR_TYPES = new Set(['repeat', 'parametric', 'grid', 'series', 'scatter'])

function validateGenerator(v: unknown, path: string): ValidationError[] {
  if (!isRecord(v)) {
    return [{ path, message: 'generator must be an object' }]
  }

  const errors: ValidationError[] = []

  if (typeof v.type !== 'string' || !VALID_GENERATOR_TYPES.has(v.type)) {
    errors.push({
      path: `${path}.type`,
      message: `must be one of: ${[...VALID_GENERATOR_TYPES].join(', ')}`,
    })
    return errors
  }

  if (v.seed !== undefined && typeof v.seed !== 'number') {
    errors.push({ path: `${path}.seed`, message: 'must be a number' })
  }

  if (v.template !== undefined && !isRecord(v.template)) {
    errors.push({ path: `${path}.template`, message: 'must be an object' })
  }

  switch (v.type) {
    case 'repeat':
      if (typeof v.count !== 'number' || v.count < 0) {
        errors.push({ path: `${path}.count`, message: 'must be a non-negative number' })
      }
      break
    case 'parametric':
      if (typeof v.xExpr !== 'string') {
        errors.push({ path: `${path}.xExpr`, message: 'must be a string' })
      }
      if (typeof v.yExpr !== 'string') {
        errors.push({ path: `${path}.yExpr`, message: 'must be a string' })
      }
      if (typeof v.tMin !== 'number') {
        errors.push({ path: `${path}.tMin`, message: 'must be a number' })
      }
      if (typeof v.tMax !== 'number') {
        errors.push({ path: `${path}.tMax`, message: 'must be a number' })
      }
      if (typeof v.samples !== 'number' || v.samples < 2) {
        errors.push({ path: `${path}.samples`, message: 'must be a number >= 2' })
      }
      break
    case 'grid':
      if (typeof v.rows !== 'number' || v.rows < 1) {
        errors.push({ path: `${path}.rows`, message: 'must be a number >= 1' })
      }
      if (typeof v.cols !== 'number' || v.cols < 1) {
        errors.push({ path: `${path}.cols`, message: 'must be a number >= 1' })
      }
      if (typeof v.cellWidth !== 'number' || v.cellWidth <= 0) {
        errors.push({ path: `${path}.cellWidth`, message: 'must be a positive number' })
      }
      if (typeof v.cellHeight !== 'number' || v.cellHeight <= 0) {
        errors.push({ path: `${path}.cellHeight`, message: 'must be a positive number' })
      }
      break
    case 'series':
      if (!Array.isArray(v.data)) {
        errors.push({ path: `${path}.data`, message: 'must be an array' })
      } else if (v.data.length === 0) {
        errors.push({ path: `${path}.data`, message: 'must not be empty' })
      }
      if (typeof v.xExpr !== 'string') {
        errors.push({ path: `${path}.xExpr`, message: 'must be a string' })
      }
      if (typeof v.yExpr !== 'string') {
        errors.push({ path: `${path}.yExpr`, message: 'must be a string' })
      }
      break
    case 'scatter':
      if (!Array.isArray(v.points)) {
        errors.push({ path: `${path}.points`, message: 'must be an array' })
      } else if (v.points.length === 0) {
        errors.push({ path: `${path}.points`, message: 'must not be empty' })
      }
      break
  }

  return errors
}

// ─── Entity Validator ──────────────────────────────────────────────────────

const VALID_ENTITY_TYPES = new Set([
  'shape',
  'text',
  'data',
  'graph',
  'connection',
  'abstract',
  'group',
])

function validateEntity(v: unknown, path: string): ValidationError[] {
  if (!isRecord(v)) {
    return [{ path, message: 'entity must be an object' }]
  }

  const errors: ValidationError[] = []

  if (typeof v.id !== 'string' || v.id.length === 0) {
    errors.push({ path: `${path}.id`, message: 'must be a non-empty string' })
  }

  if (typeof v.type !== 'string' || !VALID_ENTITY_TYPES.has(v.type)) {
    errors.push({
      path: `${path}.type`,
      message: `must be one of: ${[...VALID_ENTITY_TYPES].join(', ')}`,
    })
  }

  if (v.name !== undefined && typeof v.name !== 'string') {
    errors.push({ path: `${path}.name`, message: 'must be a string' })
  }

  if ('properties' in v) {
    if (!isRecord(v.properties)) {
      errors.push({ path: `${path}.properties`, message: 'must be an object' })
    } else {
      for (const [key, val] of Object.entries(v.properties)) {
        if (key === 'generator') {
          errors.push(...validateGeneratorProp(val, `${path}.properties.generator`))
        } else {
          errors.push(...validateProp(val, `${path}.properties.${key}`))
        }
      }
    }
  }

  return errors
}

// ─── Relationship Validator ────────────────────────────────────────────────

const VALID_RELATIONSHIP_TYPES = new Set([
  'edge',
  'containment',
  'constraint',
  'reference',
])

function validateRelationship(v: unknown, path: string): ValidationError[] {
  if (!isRecord(v)) {
    return [{ path, message: 'relationship must be an object' }]
  }

  const errors: ValidationError[] = []

  if (typeof v.type !== 'string' || !VALID_RELATIONSHIP_TYPES.has(v.type)) {
    errors.push({
      path: `${path}.type`,
      message: `must be one of: ${[...VALID_RELATIONSHIP_TYPES].join(', ')}`,
    })
  }

  if (typeof v.from !== 'string') {
    errors.push({ path: `${path}.from`, message: 'must be a string (entity id)' })
  }

  if (typeof v.to !== 'string') {
    errors.push({ path: `${path}.to`, message: 'must be a string (entity id)' })
  }

  return errors
}

// ─── Animation Binding Validator ───────────────────────────────────────────

function validateAnimationBinding(v: unknown, path: string): ValidationError[] {
  if (!isRecord(v)) {
    return [{ path, message: 'animation binding must be an object' }]
  }

  const errors: ValidationError[] = []

  if (typeof v.target !== 'string') {
    errors.push({ path: `${path}.target`, message: 'must be a string (property path)' })
  }

  if (!Array.isArray(v.keyframes)) {
    errors.push({ path: `${path}.keyframes`, message: 'must be an array' })
  } else {
    v.keyframes.forEach((kf, i) => {
      errors.push(...validateKeyframe(kf, `${path}.keyframes[${i}]`))
    })
  }

  if (typeof v.duration !== 'number' || v.duration < 0) {
    errors.push({ path: `${path}.duration`, message: 'must be a non-negative number' })
  }

  return errors
}

// ─── Reference Validators ──────────────────────────────────────────────────

function collectEntityIds(entities: Entity[]): Set<EntityId> {
  return new Set(entities.map((e) => e.id))
}

function validateReferences(doc: Scene, entityIds: Set<EntityId>): ValidationError[] {
  const errors: ValidationError[] = []

  for (const rel of doc.relationships ?? []) {
    if (typeof rel.from === 'string' && !entityIds.has(rel.from)) {
      errors.push({
        path: `relationships[${rel.from}→${rel.to}].from`,
        message: `references unknown entity: ${rel.from}`,
      })
    }
    if (typeof rel.to === 'string' && !entityIds.has(rel.to)) {
      errors.push({
        path: `relationships[${rel.from}→${rel.to}].to`,
        message: `references unknown entity: ${rel.to}`,
      })
    }
  }

  for (const anim of doc.animations ?? []) {
    if (typeof anim.target === 'string') {
      const entityId = anim.target.split('.')[0]
      if (entityId && !entityIds.has(entityId)) {
        errors.push({
          path: `animations[${anim.target}].target`,
          message: `references unknown entity: ${entityId}`,
        })
      }
    }
  }

  return errors
}

// ─── Document Validator ────────────────────────────────────────────────────

export function validateScene(doc: unknown): ValidationResult {
  if (!isRecord(doc)) {
    return { valid: false, errors: [{ path: '$', message: 'document must be an object' }] }
  }

  const errors: ValidationError[] = []

  if (!isRecord(doc.meta)) {
    errors.push({ path: '$.meta', message: 'must be an object' })
  } else {
    if (typeof doc.meta.version !== 'string') {
      errors.push({ path: '$.meta.version', message: 'must be a string' })
    }
  }

  if (!Array.isArray(doc.entities)) {
    errors.push({ path: '$.entities', message: 'must be an array' })
    return { valid: errors.length === 0, errors }
  }

  if (doc.entities.length === 0) {
    errors.push({ path: '$.entities', message: 'must contain at least one entity' })
  }

  doc.entities.forEach((ent, i) => {
    errors.push(...validateEntity(ent, `$.entities[${i}]`))
  })

  if (doc.relationships !== undefined) {
    if (!Array.isArray(doc.relationships)) {
      errors.push({ path: '$.relationships', message: 'must be an array' })
    } else {
      doc.relationships.forEach((rel, i) => {
        errors.push(...validateRelationship(rel, `$.relationships[${i}]`))
      })
    }
  }

  if (doc.animations !== undefined) {
    if (!Array.isArray(doc.animations)) {
      errors.push({ path: '$.animations', message: 'must be an array' })
    } else {
      doc.animations.forEach((anim, i) => {
        errors.push(...validateAnimationBinding(anim, `$.animations[${i}]`))
      })
    }
  }

  if (doc.variables !== undefined && !isRecord(doc.variables)) {
    errors.push({ path: '$.variables', message: 'must be an object' })
  }

  if (doc.timelines !== undefined) {
    if (!Array.isArray(doc.timelines)) {
      errors.push({ path: '$.timelines', message: 'must be an array' })
    } else {
      doc.timelines.forEach((tl, i) => {
        if (!isRecord(tl)) {
          errors.push({ path: `$.timelines[${i}]`, message: 'must be an object' })
        } else if (typeof tl.id !== 'string') {
          errors.push({ path: `$.timelines[${i}].id`, message: 'must be a string' })
        }
      })
    }
  }

  if (errors.length === 0) {
    const entityIds = collectEntityIds(doc.entities as Entity[])
    errors.push(...validateReferences(doc as unknown as Scene, entityIds))
  }

  return { valid: errors.length === 0, errors }
}

// ─── Type Guard ────────────────────────────────────────────────────────────

export function isScene(doc: unknown): doc is Scene {
  return validateScene(doc).valid
}
