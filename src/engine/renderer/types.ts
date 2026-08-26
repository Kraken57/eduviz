import type {
  EntityType,
  RelationshipType,
  Scene,
  Value,
} from '../../ir/types.js'

// ─── Renderer Identity ──────────────────────────────────────────────────────

export type RendererId = string

export interface RendererInfo {
  id: RendererId
  name: string
  version: string
  description?: string
}

// ─── Capabilities ───────────────────────────────────────────────────────────

export type Capability =
  | EntityType
  | RelationshipType
  | 'animations'
  | 'interactions'
  | 'timelines'
  | '2d'
  | '3d'
  | 'procedural'
  | 'expressions'
  | 'references'

export interface RendererCapabilities {
  entityTypes: EntityType[]
  relationshipTypes: RelationshipType[]
  features: Capability[]
}

// ─── Scene Requirements ─────────────────────────────────────────────────────

export interface SceneRequirements {
  entityTypes: EntityType[]
  relationshipTypes: RelationshipType[]
  features: Capability[]
}

// ─── Render Request ─────────────────────────────────────────────────────────

export interface RenderRequest {
  scene: Scene
  target?: RendererId
  requirements?: SceneRequirements
  options?: Record<string, Value>
}

// ─── Render Context ─────────────────────────────────────────────────────────

export interface RenderContext {
  request: RenderRequest
  scene: Scene
  timestamp: number
}

// ─── Render Result ──────────────────────────────────────────────────────────

export type RenderOutput =
  | { kind: 'scene'; data: unknown }
  | { kind: 'image'; data: unknown }
  | { kind: 'animation'; data: unknown }
  | { kind: 'video'; data: unknown }
  | { kind: 'text'; data: string }
  | { kind: 'structured'; data: Record<string, unknown> }

export interface RenderResult {
  success: boolean
  output?: RenderOutput
  errors: RenderError[]
  metadata: RenderMetadata
}

export interface RenderError {
  code: string
  message: string
  path?: string
}

export interface RenderMetadata {
  rendererId: RendererId
  renderTimeMs: number
  warnings: string[]
}

// ─── Renderer Interface ─────────────────────────────────────────────────────

export interface Renderer {
  info: RendererInfo
  capabilities: RendererCapabilities

  initialize(): Promise<void>
  canRender(scene: Scene, requirements?: SceneRequirements): boolean
  render(context: RenderContext): Promise<RenderResult>
  dispose(): Promise<void>
}
