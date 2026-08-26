import type { Scene } from '../ir/types.js'
import type {
  Renderer,
  RendererCapabilities,
  RenderContext,
  RenderOutput,
  RenderResult,
  SceneRequirements,
} from './renderer/types.js'
import { rendererCanHandle } from './registry/registry.js'

// ─── Mock Renderer ──────────────────────────────────────────────────────────

export interface MockRendererOptions {
  id?: string
  name?: string
  capabilities?: Partial<RendererCapabilities>
  renderFn?: (context: RenderContext) => RenderResult
}

export class MockRenderer implements Renderer {
  info = {
    id: 'mock',
    name: 'Mock Renderer',
    version: '0.1.0',
    description: 'A mock renderer for testing',
  }

  capabilities: RendererCapabilities = {
    entityTypes: ['shape', 'text', 'data', 'graph', 'connection', 'abstract', 'group'],
    relationshipTypes: ['containment', 'constraint', 'reference', 'edge'],
    features: ['2d', '3d', 'animations', 'interactions', 'timelines', 'expressions', 'references', 'procedural'],
  }

  private renderFn?: (context: RenderContext) => RenderResult
  initialized = false
  disposed = false
  renderCount = 0
  lastContext?: RenderContext

  constructor(options?: MockRendererOptions) {
    if (options?.id) this.info.id = options.id
    if (options?.name) this.info.name = options.name
    if (options?.capabilities) {
      this.capabilities = { ...this.capabilities, ...options.capabilities }
    }
    this.renderFn = options?.renderFn
  }

  async initialize(): Promise<void> {
    this.initialized = true
  }

  canRender(_scene: Scene, requirements?: SceneRequirements): boolean {
    return rendererCanHandle(this.capabilities, requirements ?? {
      entityTypes: [],
      relationshipTypes: [],
      features: [],
    })
  }

  async render(context: RenderContext): Promise<RenderResult> {
    this.renderCount++
    this.lastContext = context

    if (this.renderFn) {
      return this.renderFn(context)
    }

    const output: RenderOutput = {
      kind: 'scene',
      data: {
        rendererId: this.info.id,
        entityCount: context.scene.entities.length,
      },
    }

    return {
      success: true,
      output,
      errors: [],
      metadata: {
        rendererId: this.info.id,
        renderTimeMs: 0,
        warnings: [],
      },
    }
  }

  async dispose(): Promise<void> {
    this.disposed = true
  }
}
