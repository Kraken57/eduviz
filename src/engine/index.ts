export type {
  RendererId,
  RendererInfo,
  Capability,
  RendererCapabilities,
  SceneRequirements,
  RenderRequest,
  RenderContext,
  RenderOutput,
  RenderResult,
  RenderError,
  RenderMetadata,
  Renderer,
} from './renderer/types.js'

export type {
  EntityIndex,
  PreprocessedScene,
  PreprocessResult,
} from './preprocessing/pipeline.js'
export {
  preprocessScene,
  getEntity,
  getChildren,
  getParent,
  getRelationships,
  getReferencedEntities,
} from './preprocessing/pipeline.js'

export { RendererRegistry, rendererCanHandle } from './registry/registry.js'

export type {
  SelectionStrategy,
  SelectionResult,
  SelectionError,
  SelectionOutput,
} from './selection/selection.js'
export { selectRenderer } from './selection/selection.js'
export type { SceneRequirements as ExtractedSceneRequirements } from './selection/requirements.js'
export { extractSceneRequirements } from './selection/requirements.js'

export type {
  EventSource,
  CoreEvent,
  CoreAction,
  ActionPayload,
  EventHandler,
  ActionHandler,
} from './events/types.js'
export { EventSystem } from './events/system.js'

export type { EngineOptions } from './engine.js'
export { VisualizationEngine } from './engine.js'
export { MockRenderer } from './mock-renderer.js'
