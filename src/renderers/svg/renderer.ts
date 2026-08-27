import type { Entity, Scene } from '../../ir/types.js'
import type { EntityIndex } from '../../engine/preprocessing/pipeline.js'
import type {
  Renderer,
  RendererCapabilities,
  RenderContext,
  RenderResult,
  SceneRequirements,
} from '../../engine/renderer/types.js'
import { rendererCanHandle } from '../../engine/registry/registry.js'
import { preprocessScene } from '../../engine/preprocessing/pipeline.js'
import { validateScene } from '../../ir/validate.js'
import type { SvgRenderContext } from './types.js'
import { renderShape } from './shapes.js'
import { renderText } from './text.js'
import { renderRelationship } from './connections.js'
import { renderGroup, isRootEntity } from './groups.js'
import { renderPropertyAnimations, renderAnimationBindings } from './animations.js'
import { renderFallback } from './fallback.js'
import { renderData } from './data.js'
import { resolveViewport, wrapSvgDocument, buildSvgOutput } from './output.js'

// ─── SVG Renderer ───────────────────────────────────────────────────────────

export class SvgRenderer implements Renderer {
  readonly info = {
    id: 'svg-2d',
    name: 'SVG 2D Renderer',
    version: '0.1.0',
    description: 'Renders IR scenes as SVG elements',
  }

  readonly capabilities: RendererCapabilities = {
    entityTypes: ['shape', 'text', 'group', 'data'],
    relationshipTypes: ['edge', 'containment', 'constraint', 'reference'],
    features: ['2d', 'animations', 'interactions'],
  }

  async initialize(): Promise<void> {
    // No-op: SVG renderer requires no initialization
  }

  canRender(_scene: Scene, requirements?: SceneRequirements): boolean {
    return rendererCanHandle(this.capabilities, requirements ?? {
      entityTypes: [],
      relationshipTypes: [],
      features: [],
    })
  }

  async render(context: RenderContext): Promise<RenderResult> {
    const start = Date.now()
    const scene = context.scene
    const warnings: string[] = []

    const validation = validateScene(scene)
    if (!validation.valid) {
      return {
        success: false,
        errors: validation.errors.map(e => ({
          code: 'VALIDATION_ERROR',
          message: e.message,
          path: e.path,
        })),
        metadata: {
          rendererId: this.info.id,
          renderTimeMs: Date.now() - start,
          warnings: [],
        },
      }
    }

    const preprocessResult = preprocessScene(scene)
    if (!preprocessResult.success) {
      return {
        success: false,
        errors: preprocessResult.errors.map(e => ({
          code: 'PREPROCESS_ERROR',
          message: e,
        })),
        metadata: {
          rendererId: this.info.id,
          renderTimeMs: Date.now() - start,
          warnings: [],
        },
      }
    }

    const index = preprocessResult.preprocessed!.entityIndex
    const viewport = resolveViewport(scene.viewport)
    const ctx: SvgRenderContext = {
      viewport,
      entityMap: {},
      animations: [],
      warnings,
    }

    const content = this.renderScene(scene, index, ctx)

    if (scene.animations && scene.animations.length > 0) {
      const bindingSvgs = renderAnimationBindings(scene.animations, ctx)
      if (bindingSvgs.length > 0) {
        content.push(`<g data-layer="animations">${bindingSvgs.join('')}</g>`)
      }
    }

    const svg = wrapSvgDocument(viewport, content, ctx)
    const output = buildSvgOutput(svg, viewport, ctx.entityMap, ctx.animations, warnings)

    return {
      success: true,
      output: {
        kind: 'scene',
        data: output,
      },
      errors: [],
      metadata: {
        rendererId: this.info.id,
        renderTimeMs: Date.now() - start,
        warnings,
      },
    }
  }

  async dispose(): Promise<void> {
    // No-op
  }

  // ─── Internal Render Pipeline ───────────────────────────────────────────

  private renderScene(
    scene: Scene,
    index: EntityIndex,
    ctx: SvgRenderContext,
  ): string[] {
    const content: string[] = []

    const roots: Entity[] = []
    for (const entity of scene.entities) {
      if (isRootEntity(entity.id, index)) {
        roots.push(entity)
      }
    }

    const renderEntity = (e: Entity) => this.renderEntity(e, index, ctx)

    for (const entity of roots) {
      content.push(renderEntity(entity))
    }

    if (scene.relationships && scene.relationships.length > 0) {
      const relSvgs: string[] = []
      for (const rel of scene.relationships) {
        const svg = renderRelationship(rel, index, ctx)
        if (svg) relSvgs.push(svg)
      }
      if (relSvgs.length > 0) {
        content.push(`<g data-layer="relationships">${relSvgs.join('')}</g>`)
      }
    }

    return content
  }

  private renderEntity(entity: Entity, index: EntityIndex, ctx: SvgRenderContext): string {
    const animSvgs = renderPropertyAnimations(entity.id, entity.properties, ctx)

    let mainSvg: string
    switch (entity.type) {
      case 'shape':
        mainSvg = renderShape(entity, ctx)
        break
      case 'text':
        mainSvg = renderText(entity, ctx)
        break
      case 'group':
        mainSvg = renderGroup(entity, index, ctx, (e) => this.renderEntity(e, index, ctx))
        break
      case 'data':
        mainSvg = renderData(entity, ctx)
        break
      case 'graph':
      case 'connection':
      case 'abstract':
        mainSvg = renderFallback(entity, ctx)
        break
      default:
        mainSvg = renderFallback(entity, ctx)
        break
    }

    if (animSvgs.length > 0) {
      const wrapper = `<g data-entity-id="${entity.id}" data-layer="animations">${animSvgs.join('')}</g>`
      return mainSvg + wrapper
    }

    return mainSvg
  }
}
