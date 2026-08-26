import type {
  Entity,
  EntityId,
  GeneratorDef,
  PropertyBag,
  Prop,
  Value,
  ValueRef,
  VariableRef,
} from '../../../ir/types.js'
import { evaluateExpression } from '../expressions/parser.js'
import type { ExprVars } from '../expressions/parser.js'

// ─── Generator Limits ───────────────────────────────────────────────────────

export interface GeneratorLimits {
  maxCount: number
  maxSamples: number
  maxRows: number
  maxCols: number
  maxTotalEntities: number
}

export const DEFAULT_LIMITS: GeneratorLimits = {
  maxCount: 10000,
  maxSamples: 10000,
  maxRows: 1000,
  maxCols: 1000,
  maxTotalEntities: 50000,
}

// ─── Expansion Result ───────────────────────────────────────────────────────

export interface ExpansionResult {
  entities: Entity[]
  errors: string[]
}

// ─── Variable Resolution ────────────────────────────────────────────────────

function isVariableRef(v: unknown): v is VariableRef {
  return v !== null && typeof v === 'object' && !Array.isArray(v) && 'var' in (v as Record<string, unknown>)
}

function isExpression(v: unknown): v is { expr: string } {
  return v !== null && typeof v === 'object' && !Array.isArray(v) && 'expr' in (v as Record<string, unknown>)
}

function isValueRef(v: unknown): v is ValueRef {
  return v !== null && typeof v === 'object' && !Array.isArray(v) && 'ref' in (v as Record<string, unknown>)
}

function resolveValue(value: unknown, vars: ExprVars): unknown {
  if (isVariableRef(value)) {
    const resolved = vars[value.var]
    if (resolved !== undefined) return resolved
    return value
  }
  if (isExpression(value)) {
    return evaluateExpression(value.expr, vars)
  }
  if (isValueRef(value)) {
    return value
  }
  if (Array.isArray(value)) {
    return value.map(v => resolveValue(v, vars))
  }
  if (typeof value === 'object' && value !== null) {
    const result: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      result[k] = resolveValue(v, vars)
    }
    return result
  }
  return value
}

function resolvePropertyBag(bag: PropertyBag, vars: ExprVars): PropertyBag {
  const result: PropertyBag = {}
  for (const [key, prop] of Object.entries(bag)) {
    if (prop !== null && typeof prop === 'object' && !Array.isArray(prop) && 'value' in (prop as Record<string, unknown>)) {
      const p = prop as Prop
      const resolved = resolveValue(p.value, vars)
      const newProp: Prop = { value: resolved as Value }
      if (p.anim) newProp.anim = p.anim
      if (p.interact) newProp.interact = p.interact
      result[key] = newProp
    } else {
      const resolved = resolveValue(prop, vars)
      result[key] = resolved as Value
    }
  }
  return result
}

// ─── Template Cloning ───────────────────────────────────────────────────────

function cloneTemplate(template: PropertyBag | undefined): PropertyBag {
  if (!template) return {}
  return JSON.parse(JSON.stringify(template))
}

// ─── ID Generation ──────────────────────────────────────────────────────────

function generateId(baseId: string, index: number): string {
  return `gen_${baseId}_${index}`
}

// ─── Limits Validation ──────────────────────────────────────────────────────

function clampCount(value: number, max: number): number {
  if (value < 0) return 0
  if (value > max) return max
  return Math.floor(value)
}

// ─── Repeat Generator ───────────────────────────────────────────────────────

function expandRepeat(
  baseId: EntityId,
  generator: GeneratorDef & { type: 'repeat' },
  limits: GeneratorLimits,
): ExpansionResult {
  const count = clampCount(generator.count, limits.maxCount)
  const entities: Entity[] = []

  for (let i = 0; i < count; i++) {
    const template = cloneTemplate(generator.template)
    const vars: ExprVars = { i, seed: generator.seed ?? 0 }
    const resolved = resolvePropertyBag(template, vars)
    entities.push({
      id: generateId(baseId, i),
      type: 'shape',
      properties: resolved,
    })
  }

  return { entities, errors: [] }
}

// ─── Parametric Generator ───────────────────────────────────────────────────

function expandParametric(
  baseId: EntityId,
  generator: GeneratorDef & { type: 'parametric' },
  limits: GeneratorLimits,
): ExpansionResult {
  const samples = clampCount(generator.samples, limits.maxSamples)
  if (samples < 2) return { entities: [], errors: ['parametric requires at least 2 samples'] }

  const tMin = generator.tMin
  const tMax = generator.tMax
  const template = cloneTemplate(generator.template)
  const outputStyle = generator.outputStyle ?? 'polyline'

  if (outputStyle === 'polyline') {
    const points: Array<{ x: number; y: number }> = []
    for (let s = 0; s < samples; s++) {
      const t = tMin + (tMax - tMin) * s / (samples - 1)
      const vars: ExprVars = { t, seed: generator.seed ?? 0 }
      const x = evaluateExpression(generator.xExpr, vars)
      const y = evaluateExpression(generator.yExpr, vars)
      points.push({ x, y })
    }

    const resolved = resolvePropertyBag(template, {})
    const renderData = { kind: 'polyline' as const, points, closed: false }
    return {
      entities: [{
        id: baseId,
        type: 'data',
        properties: { ...resolved, renderData: { value: renderData as unknown as Value } },
      }],
      errors: [],
    }
  }

  const entities: Entity[] = []
  for (let s = 0; s < samples; s++) {
    const t = tMin + (tMax - tMin) * s / (samples - 1)
    const vars: ExprVars = { t, seed: generator.seed ?? 0 }
    const x = evaluateExpression(generator.xExpr, vars)
    const y = evaluateExpression(generator.yExpr, vars)

    const pointTemplate = cloneTemplate(generator.template)
    const resolved = resolvePropertyBag(pointTemplate, vars)
    resolved['x'] = { value: x } as Prop
    resolved['y'] = { value: y } as Prop

    entities.push({
      id: generateId(baseId, s),
      type: 'shape',
      properties: resolved,
    })
  }

  return { entities, errors: [] }
}

// ─── Grid Generator ─────────────────────────────────────────────────────────

function expandGrid(
  baseId: EntityId,
  generator: GeneratorDef & { type: 'grid' },
  limits: GeneratorLimits,
): ExpansionResult {
  const rows = clampCount(generator.rows, limits.maxRows)
  const cols = clampCount(generator.cols, limits.maxCols)
  const template = cloneTemplate(generator.template)
  const entities: Entity[] = []
  let idx = 0

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const vars: ExprVars = { row, col, seed: generator.seed ?? 0 }
      const resolved = resolvePropertyBag(template, vars)
      entities.push({
        id: generateId(baseId, idx),
        type: 'shape',
        properties: resolved,
      })
      idx++
    }
  }

  return { entities, errors: [] }
}

// ─── Series Generator ───────────────────────────────────────────────────────

function expandSeries(
  baseId: EntityId,
  generator: GeneratorDef & { type: 'series' },
  limits: GeneratorLimits,
): ExpansionResult {
  const data = generator.data.slice(0, clampCount(generator.data.length, limits.maxSamples))
  if (data.length === 0) return { entities: [], errors: ['series data must not be empty'] }

  const template = cloneTemplate(generator.template)
  const outputStyle = generator.outputStyle ?? 'points'

  if (outputStyle === 'polyline') {
    const points: Array<{ x: number; y: number }> = []
    for (let i = 0; i < data.length; i++) {
      const value = data[i]
      const vars: ExprVars = { i, value, seed: generator.seed ?? 0 }
      const x = evaluateExpression(generator.xExpr, vars)
      const y = evaluateExpression(generator.yExpr, vars)
      points.push({ x, y })
    }

    const resolved = resolvePropertyBag(template, {})
    const renderData = { kind: 'polyline' as const, points, closed: false }
    return {
      entities: [{
        id: baseId,
        type: 'data',
        properties: { ...resolved, renderData: { value: renderData as unknown as Value } },
      }],
      errors: [],
    }
  }

  const entities: Entity[] = []
  for (let i = 0; i < data.length; i++) {
    const value = data[i]
    const vars: ExprVars = { i, value, seed: generator.seed ?? 0 }
    const x = evaluateExpression(generator.xExpr, vars)
    const y = evaluateExpression(generator.yExpr, vars)

    const pointTemplate = cloneTemplate(generator.template)
    const resolved = resolvePropertyBag(pointTemplate, vars)
    resolved['x'] = { value: x } as Prop
    resolved['y'] = { value: y } as Prop

    entities.push({
      id: generateId(baseId, i),
      type: 'shape',
      properties: resolved,
    })
  }

  return { entities, errors: [] }
}

// ─── Scatter Generator ──────────────────────────────────────────────────────

function expandScatter(
  baseId: EntityId,
  generator: GeneratorDef & { type: 'scatter' },
  limits: GeneratorLimits,
): ExpansionResult {
  const points = generator.points.slice(0, clampCount(generator.points.length, limits.maxSamples))
  if (points.length === 0) return { entities: [], errors: ['scatter points must not be empty'] }

  const template = cloneTemplate(generator.template)
  const entities: Entity[] = []

  for (let i = 0; i < points.length; i++) {
    const { x, y } = points[i]
    const vars: ExprVars = { i, x, y, seed: generator.seed ?? 0 }
    const resolved = resolvePropertyBag(template, vars)
    resolved['x'] = { value: x } as Prop
    resolved['y'] = { value: y } as Prop

    entities.push({
      id: generateId(baseId, i),
      type: 'shape',
      properties: resolved,
    })
  }

  return { entities, errors: [] }
}

// ─── Main Expansion Function ────────────────────────────────────────────────

export function expandGenerator(
  baseId: EntityId,
  generator: GeneratorDef,
  limits: GeneratorLimits = DEFAULT_LIMITS,
): ExpansionResult {
  switch (generator.type) {
    case 'repeat':
      return expandRepeat(baseId, generator, limits)
    case 'parametric':
      return expandParametric(baseId, generator, limits)
    case 'grid':
      return expandGrid(baseId, generator, limits)
    case 'series':
      return expandSeries(baseId, generator, limits)
    case 'scatter':
      return expandScatter(baseId, generator, limits)
    default:
      return { entities: [], errors: [`Unknown generator type: ${(generator as GeneratorDef).type}`] }
  }
}