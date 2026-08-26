import type {
  AnimationBinding,
  Camera,
  Color,
  CursorStyle,
  EasingFunction,
  Entity,
  EntityId,
  EntityType,
  Expression,
  GridGeneratorDef,
  InteractionEvent,
  Keyframe,
  ParametricGeneratorDef,
  Primitive,
  PropertyAnim,
  PropertyBag,
  PropertyInteract,
  Prop,
  RepeatGeneratorDef,
  Relationship,
  RelationshipType,
  ScatterGeneratorDef,
  Scene,
  SceneMeta,
  SeriesGeneratorDef,
  Timeline,
  TimelineStep,
  Value,
  ValueRef,
  Viewport,
  VariableRef,
} from '../ir/types.js'

// ─── Property Builders ──────────────────────────────────────────────────────

export function val(v: Value): Prop {
  return { value: v }
}

export function animated(
  v: Value,
  keyframes: Keyframe[],
  duration: number,
  opts?: { easing?: EasingFunction; loop?: boolean; delay?: number; mode?: 'normal' | 'reverse' | 'alternate' },
): Prop {
  const anim: PropertyAnim = { keyframes, duration }
  if (opts?.easing !== undefined) anim.easing = opts.easing
  if (opts?.loop !== undefined) anim.loop = opts.loop
  if (opts?.delay !== undefined) anim.delay = opts.delay
  if (opts?.mode !== undefined) anim.mode = opts.mode
  return { value: v, anim }
}

export function interactive(
  v: Value,
  events: InteractionEvent[],
  opts?: { cursor?: CursorStyle; tooltip?: string },
): Prop {
  const interact: PropertyInteract = { on: events }
  if (opts?.cursor !== undefined) interact.cursor = opts.cursor
  if (opts?.tooltip !== undefined) interact.tooltip = opts.tooltip
  return { value: v, interact }
}

export function ref(entityId: EntityId, property?: string): ValueRef {
  if (property !== undefined) return { ref: entityId, property }
  return { ref: entityId }
}

export function expr(e: string, vars?: Record<string, ValueRef | Primitive>): Expression {
  if (vars !== undefined) return { expr: e, vars }
  return { expr: e }
}

// ─── Keyframe Helpers ───────────────────────────────────────────────────────

export function kf(offset: number, value: Value, easing?: EasingFunction): Keyframe {
  if (easing !== undefined) return { offset, value, easing }
  return { offset, value }
}

// ─── Relationship Builders ──────────────────────────────────────────────────

function rel(type: RelationshipType, from: EntityId, to: EntityId, opts?: {
  label?: string
  properties?: PropertyBag
}): Relationship {
  const r: Relationship = { type, from, to }
  if (opts?.label !== undefined) r.label = opts.label
  if (opts?.properties !== undefined) r.properties = opts.properties
  return r
}

export function edge(from: EntityId, to: EntityId, label?: string, properties?: PropertyBag): Relationship {
  return rel('edge', from, to, { label, properties })
}

export function contains(from: EntityId, to: EntityId, label?: string): Relationship {
  return rel('containment', from, to, { label })
}

export function constrained(from: EntityId, to: EntityId, label?: string): Relationship {
  return rel('constraint', from, to, { label })
}

export function referenced(from: EntityId, to: EntityId, label?: string): Relationship {
  return rel('reference', from, to, { label })
}

// ─── Animation Binding Builder ──────────────────────────────────────────────

export function animBinding(
  target: string,
  keyframes: Keyframe[],
  duration: number,
  opts?: {
    easing?: EasingFunction
    delay?: number
    loop?: boolean
    mode?: 'normal' | 'reverse' | 'alternate'
  },
): AnimationBinding {
  const a: AnimationBinding = { target, keyframes, duration }
  if (opts?.easing !== undefined) a.easing = opts.easing
  if (opts?.delay !== undefined) a.delay = opts.delay
  if (opts?.loop !== undefined) a.loop = opts.loop
  if (opts?.mode !== undefined) a.mode = opts.mode
  return a
}

// ─── Timeline Builder ───────────────────────────────────────────────────────

export function step(time: number, opts?: {
  description?: string
  animations?: string[]
}): TimelineStep {
  const s: TimelineStep = { time }
  if (opts?.description !== undefined) s.description = opts.description
  if (opts?.animations !== undefined) s.animations = opts.animations
  return s
}

export function timeline(id: string, steps: TimelineStep[], opts?: {
  auto?: boolean
  loop?: boolean
}): Timeline {
  const t: Timeline = { id, steps }
  if (opts?.auto !== undefined) t.auto = opts.auto
  if (opts?.loop !== undefined) t.loop = opts.loop
  return t
}

// ─── Entity Builders ────────────────────────────────────────────────────────

function entity(id: EntityId, type: EntityType, properties: PropertyBag, opts?: {
  name?: string
}): Entity {
  const e: Entity = { id, type, properties }
  if (opts?.name !== undefined) e.name = opts.name
  return e
}

export function shape(
  id: EntityId,
  shapeType: string,
  properties?: PropertyBag,
  opts?: { name?: string },
): Entity {
  return entity(id, 'shape', { shape: val(shapeType), ...properties }, opts)
}

export function text(
  id: EntityId,
  content: string,
  properties?: PropertyBag,
  opts?: { name?: string },
): Entity {
  return entity(id, 'text', { text: val(content), ...properties }, opts)
}

export function data(
  id: EntityId,
  dataset: Value,
  properties?: PropertyBag,
  opts?: { name?: string },
): Entity {
  return entity(id, 'data', { dataPoints: val(dataset as Primitive[]), ...properties }, opts)
}

export function graph(
  id: EntityId,
  label?: string,
  properties?: PropertyBag,
  opts?: { name?: string },
): Entity {
  const p: PropertyBag = { ...properties }
  if (label !== undefined) p.label = val(label)
  return entity(id, 'graph', p, opts)
}

export function connection(
  id: EntityId,
  properties?: PropertyBag,
  opts?: { name?: string },
): Entity {
  return entity(id, 'connection', properties ?? {}, opts)
}

export function abstractEntity(
  id: EntityId,
  properties: PropertyBag,
  opts?: { name?: string },
): Entity {
  return entity(id, 'abstract', properties, opts)
}

export function group(
  id: EntityId,
  properties: PropertyBag,
  opts?: { name?: string },
): Entity {
  return entity(id, 'group', properties, opts)
}

// ─── Scene Builder ──────────────────────────────────────────────────────────

export function scene(
  title: string,
  entities: Entity[],
  opts?: {
    description?: string
    author?: string
    tags?: string[]
    variables?: Record<string, Primitive>
    relationships?: Relationship[]
    animations?: AnimationBinding[]
    timelines?: Timeline[]
    viewport?: Viewport
  },
): Scene {
  const meta: SceneMeta = { version: '1.0', title }
  if (opts?.description !== undefined) meta.description = opts.description
  if (opts?.author !== undefined) meta.author = opts.author
  if (opts?.tags !== undefined) meta.tags = opts.tags

  const s: Scene = { meta, entities }
  if (opts?.variables !== undefined) s.variables = opts.variables
  if (opts?.relationships !== undefined) s.relationships = opts.relationships
  if (opts?.animations !== undefined) s.animations = opts.animations
  if (opts?.timelines !== undefined) s.timelines = opts.timelines
  if (opts?.viewport !== undefined) s.viewport = opts.viewport
  return s
}

// ─── Shorthand Viewport ─────────────────────────────────────────────────────

export function viewport(
  width: number,
  height: number,
  background?: Color,
  camera?: Camera,
): Viewport {
  const v: Viewport = { width, height }
  if (background !== undefined) v.background = background
  if (camera !== undefined) v.camera = camera
  return v
}

// ─── Variable Helpers ────────────────────────────────────────────────────────

export function variable(name: string): VariableRef {
  return { var: name }
}

// ─── Generator Builders ──────────────────────────────────────────────────────

export function repeatGenerator(
  count: number,
  template: PropertyBag,
  opts?: { seed?: number },
): RepeatGeneratorDef {
  const g: RepeatGeneratorDef = { type: 'repeat', count, template }
  if (opts?.seed !== undefined) g.seed = opts.seed
  return g
}

export function parametricGenerator(
  xExpr: string,
  yExpr: string,
  tMin: number,
  tMax: number,
  samples: number,
  template?: PropertyBag,
  opts?: {
    seed?: number
    outputStyle?: 'polyline' | 'points'
  },
): ParametricGeneratorDef {
  const g: ParametricGeneratorDef = {
    type: 'parametric',
    xExpr,
    yExpr,
    tMin,
    tMax,
    samples,
  }
  if (template !== undefined) g.template = template
  if (opts?.seed !== undefined) g.seed = opts.seed
  if (opts?.outputStyle !== undefined) g.outputStyle = opts.outputStyle
  return g
}

export function gridGenerator(
  rows: number,
  cols: number,
  cellWidth: number,
  cellHeight: number,
  template: PropertyBag,
  opts?: { seed?: number },
): GridGeneratorDef {
  const g: GridGeneratorDef = {
    type: 'grid',
    rows,
    cols,
    cellWidth,
    cellHeight,
    template,
  }
  if (opts?.seed !== undefined) g.seed = opts.seed
  return g
}

export function seriesGenerator(
  data: number[],
  xExpr: string,
  yExpr: string,
  template?: PropertyBag,
  opts?: {
    seed?: number
    outputStyle?: 'polyline' | 'points'
  },
): SeriesGeneratorDef {
  const g: SeriesGeneratorDef = {
    type: 'series',
    data,
    xExpr,
    yExpr,
  }
  if (template !== undefined) g.template = template
  if (opts?.seed !== undefined) g.seed = opts.seed
  if (opts?.outputStyle !== undefined) g.outputStyle = opts.outputStyle
  return g
}

export function scatterGenerator(
  points: Array<{ x: number; y: number }>,
  template?: PropertyBag,
  opts?: { seed?: number },
): ScatterGeneratorDef {
  const g: ScatterGeneratorDef = {
    type: 'scatter',
    points,
  }
  if (template !== undefined) g.template = template
  if (opts?.seed !== undefined) g.seed = opts.seed
  return g
}

// ─── Generator Entity Builder ────────────────────────────────────────────────

export function generated(
  id: EntityId,
  generator: RepeatGeneratorDef | ParametricGeneratorDef | GridGeneratorDef | SeriesGeneratorDef | ScatterGeneratorDef,
  properties?: PropertyBag,
  opts?: { name?: string },
): Entity {
  return entity(id, 'shape', { generator: val(generator as unknown as Primitive), ...properties }, opts)
}
