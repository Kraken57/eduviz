export type EntityId = string
export type PropertyPath = string
export type VariableName = string

// ─── Values ────────────────────────────────────────────────────────────────

export type Primitive = string | number | boolean | null

export type ValueRef = { ref: EntityId; property?: string }

export type Expression = {
  expr: string
  vars?: Record<string, ValueRef | Primitive>
}

export type PrimArray = Primitive[]

export type Value =
  | Primitive
  | ValueRef
  | Expression
  | PrimArray

// ─── Spatial ───────────────────────────────────────────────────────────────

export interface Vec2 {
  x: number
  y: number
}

export interface Vec3 {
  x: number
  y: number
  z: number
}

export type Position = Vec2 | Vec3

export interface Transform {
  translate?: Vec2 | Vec3
  rotate?: number
  scale?: number | Vec2 | Vec3
  origin?: Vec2 | Vec3
}

// ─── Visual ────────────────────────────────────────────────────────────────

export type Color = string

export type StrokeStyle = 'solid' | 'dashed' | 'dotted'

export type Gradient =
  | { type: 'linear'; from: Vec2; to: Vec2; stops: GradientStop[] }
  | { type: 'radial'; center: Vec2; radius: number; stops: GradientStop[] }

export interface GradientStop {
  offset: number
  color: Color
}

// ─── Properties ────────────────────────────────────────────────────────────

export interface PropertyAnim {
  keyframes: Keyframe[]
  duration: number
  easing?: EasingFunction
  delay?: number
  loop?: boolean
  mode?: 'normal' | 'reverse' | 'alternate'
}

export interface PropertyInteract {
  on?: InteractionEvent[]
  cursor?: CursorStyle
  tooltip?: string
}

export type CursorStyle =
  | 'default'
  | 'pointer'
  | 'grab'
  | 'grabbing'
  | 'crosshair'
  | 'text'
  | 'wait'
  | 'help'

export interface Prop {
  value: Value
  anim?: PropertyAnim
  interact?: PropertyInteract
}

export type PropertyBag = Record<string, Prop | Value>

// ─── Animation ─────────────────────────────────────────────────────────────

export interface Keyframe {
  offset: number
  value: Value
  easing?: EasingFunction
}

export type EasingFunction =
  | 'linear'
  | 'easeIn'
  | 'easeOut'
  | 'easeInOut'
  | 'spring'
  | string

export interface AnimationBinding {
  target: PropertyPath
  keyframes: Keyframe[]
  duration: number
  easing?: EasingFunction
  delay?: number
  loop?: boolean
  mode?: 'normal' | 'reverse' | 'alternate'
}

export interface TimelineStep {
  time: number
  description?: string
  animations?: string[]
}

export interface Timeline {
  id: string
  steps?: TimelineStep[]
  auto?: boolean
  loop?: boolean
}

// ─── Interaction ───────────────────────────────────────────────────────────

export interface InteractionEvent {
  event: InteractionEventType
  target?: EntityId
  action: InteractionAction
}

export type InteractionEventType =
  | 'click'
  | 'hover'
  | 'drag'
  | 'input'
  | 'keydown'
  | 'focus'
  | 'blur'

export type InteractionAction =
  | SetPropertyAction
  | ToggleAction
  | ShowTooltipAction
  | EmitAction

export interface SetPropertyAction {
  type: 'set'
  target: PropertyPath
  value: Value
}

export interface ToggleAction {
  type: 'toggle'
  target: PropertyPath
}

export interface ShowTooltipAction {
  type: 'tooltip'
  message: string
}

export interface EmitAction {
  type: 'emit'
  event: string
  data?: Record<string, Value>
}

// ─── Entities ──────────────────────────────────────────────────────────────

export type EntityType = 'shape' | 'text' | 'data' | 'graph' | 'connection' | 'abstract' | 'group'

export interface Entity {
  id: EntityId
  type: EntityType
  name?: string
  properties: PropertyBag
}

// ─── Relationships ─────────────────────────────────────────────────────────

export type RelationshipType = 'edge' | 'containment' | 'constraint' | 'reference'

export interface Relationship {
  type: RelationshipType
  from: EntityId
  to: EntityId
  label?: string
  properties?: PropertyBag
}

// ─── Scene Document ────────────────────────────────────────────────────────

export interface SceneMeta {
  version: string
  title?: string
  description?: string
  created?: string
  author?: string
  tags?: string[]
}

export interface Scene {
  meta: SceneMeta
  variables?: Record<string, Primitive>
  entities: Entity[]
  relationships?: Relationship[]
  animations?: AnimationBinding[]
  timelines?: Timeline[]
  viewport?: Viewport
}

export interface Viewport {
  width: number
  height: number
  background?: Color
  camera?: Camera
}

export interface Camera {
  position?: Vec2 | Vec3
  zoom?: number
  target?: Vec2 | Vec3
}
