import { validateScene } from '../ir/validate.js'
import type { Renderer, RendererId, RenderRequest, RenderResult, RenderContext } from './renderer/types.js'
import { RendererRegistry } from './registry/registry.js'
import { EventSystem } from './events/system.js'
import { preprocessScene } from './preprocessing/pipeline.js'
import { selectRenderer, type SelectionStrategy } from './selection/selection.js'

// ─── Visualization Engine ───────────────────────────────────────────────────

export interface EngineOptions {
  selectionStrategy?: SelectionStrategy
}

export class VisualizationEngine {
  readonly registry: RendererRegistry
  readonly events: EventSystem
  private options: EngineOptions

  constructor(options?: EngineOptions) {
    this.registry = new RendererRegistry()
    this.events = new EventSystem()
    this.options = options ?? {}
  }

  async render(request: RenderRequest): Promise<RenderResult> {
    const startTime = Date.now()

    const validation = validateScene(request.scene)
    if (!validation.valid) {
      return {
        success: false,
        errors: validation.errors.map((e) => ({
          code: 'INVALID_SCENE',
          message: `${e.path}: ${e.message}`,
        })),
        metadata: {
          rendererId: 'none',
          renderTimeMs: Date.now() - startTime,
          warnings: [],
        },
      }
    }

    const preprocessResult = preprocessScene(request.scene)
    if (!preprocessResult.success || !preprocessResult.preprocessed) {
      return {
        success: false,
        errors: (preprocessResult.errors ?? []).map((msg) => ({
          code: 'PREPROCESS_FAILED',
          message: msg,
        })),
        metadata: {
          rendererId: 'none',
          renderTimeMs: Date.now() - startTime,
          warnings: [],
        },
      }
    }

    const preprocessed = preprocessResult.preprocessed

    let renderer: Renderer | undefined

    if (request.target) {
      renderer = this.registry.get(request.target)
      if (!renderer) {
        return {
          success: false,
          errors: [
            {
              code: 'RENDERER_NOT_FOUND',
              message: `Renderer not found: ${request.target}`,
            },
          ],
          metadata: {
            rendererId: request.target,
            renderTimeMs: Date.now() - startTime,
            warnings: [],
          },
        }
      }
    } else {
      const requirements = request.requirements ?? preprocessed.sceneRequirements
      const selection = selectRenderer(
        this.registry.getAll(),
        requirements,
        this.options.selectionStrategy,
      )
      if (!selection.success || !selection.result) {
        return {
          success: false,
          errors: selection.errors.map((e) => ({
            code: e.code,
            message: e.message,
          })),
          metadata: {
            rendererId: 'none',
            renderTimeMs: Date.now() - startTime,
            warnings: [],
          },
        }
      }
      renderer = selection.result.renderer
    }

    const context: RenderContext = {
      request,
      scene: preprocessed.scene,
      timestamp: startTime,
    }

    try {
      const result = await renderer.render(context)
      return {
        ...result,
        metadata: {
          ...result.metadata,
          renderTimeMs: Date.now() - startTime,
        },
      }
    } catch (err: unknown) {
      return {
        success: false,
        errors: [
          {
            code: 'RENDER_FAILED',
            message: err instanceof Error ? err.message : String(err),
          },
        ],
        metadata: {
          rendererId: renderer.info.id,
          renderTimeMs: Date.now() - startTime,
          warnings: [],
        },
      }
    }
  }

  register(renderer: Renderer, priority?: number): void {
    this.registry.register(renderer, priority)
  }

  unregister(id: RendererId): boolean {
    return this.registry.unregister(id)
  }

  async initialize(): Promise<void> {
    for (const renderer of this.registry.getAll()) {
      await renderer.initialize()
    }
  }

  async dispose(): Promise<void> {
    for (const renderer of this.registry.getAll()) {
      await renderer.dispose()
    }
    this.events.clear()
  }
}
