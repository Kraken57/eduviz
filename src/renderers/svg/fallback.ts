import type { Entity } from '../../ir/types.js'
import type { SvgRenderContext } from './types.js'
import { rect, textElement } from './builders.js'
import { extractPosition, extractWidth, extractHeight } from './properties.js'

// ─── Fallback Renderer ──────────────────────────────────────────────────────

export function renderFallback(entity: Entity, ctx: SvgRenderContext): string {
  const pos = extractPosition(entity.properties, { x: 0, y: 0 })
  const w = extractWidth(entity.properties, 120)
  const h = extractHeight(entity.properties, 60)

  ctx.entityMap[entity.id] = {
    elementId: `entity-${entity.id}`,
    entityType: entity.type,
  }

  const label = entity.name ?? entity.id

  const rectEl = rect({
    id: `entity-${entity.id}`,
    'data-entity-id': entity.id,
    'data-entity-type': entity.type,
    x: pos.x - w / 2,
    y: pos.y - h / 2,
    width: w,
    height: h,
    fill: '#F0F0F0',
    stroke: '#999999',
    'stroke-width': 1,
    'stroke-dasharray': '4 2',
    rx: 4,
  })

  const textEl = textElement({
    x: pos.x,
    y: pos.y,
    'text-anchor': 'middle',
    'dominant-baseline': 'middle',
    'font-size': 12,
    fill: '#666666',
    'font-family': 'sans-serif',
  }, label)

  ctx.warnings.push(`Unsupported entity type "${entity.type}" for entity "${entity.id}", rendered as fallback`)

  return `<g>${rectEl}${textEl}</g>`
}
