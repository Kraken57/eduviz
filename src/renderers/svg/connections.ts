import type { Relationship } from '../../ir/types.js'
import type { EntityIndex } from '../../engine/preprocessing/pipeline.js'
import type { SvgRenderContext } from './types.js'
import { line } from './builders.js'
import { extractPosition, extractStroke, extractStrokeWidth, resolvePrimitive } from './properties.js'

// ─── Connection Renderer ────────────────────────────────────────────────────

export function renderRelationship(
  rel: Relationship,
  index: EntityIndex,
  ctx: SvgRenderContext,
): string {
  const fromEntity = index.byId.get(rel.from)
  const toEntity = index.byId.get(rel.to)

  if (!fromEntity || !toEntity) {
    ctx.warnings.push(`Relationship "${rel.from} -> ${rel.to}": entity not found, skipped`)
    return ''
  }

  const fromPos = extractPosition(fromEntity.properties, { x: 0, y: 0 })
  const toPos = extractPosition(toEntity.properties, { x: 100, y: 0 })
  const stroke = extractStroke(rel.properties ?? {}, extractStroke(fromEntity.properties, '#000000'))
  const sw = extractStrokeWidth(rel.properties ?? {}, extractStrokeWidth(fromEntity.properties, 1))

  const lineId = `rel-${rel.from}-${rel.to}`

  const attrs: Record<string, string | number> = {
    id: lineId,
    'data-entity-id': lineId,
    'data-entity-type': 'connection',
    x1: fromPos.x,
    y1: fromPos.y,
    x2: toPos.x,
    y2: toPos.y,
    stroke,
    'stroke-width': sw,
  }

  const strokeStyleProp = rel.properties?.['strokeStyle']
  if (strokeStyleProp !== undefined) {
    const val = resolvePrimitive(strokeStyleProp)
    if (val === 'dashed') attrs['stroke-dasharray'] = '8 4'
    else if (val === 'dotted') attrs['stroke-dasharray'] = '2 2'
  }

  let svg = line(attrs)

  if (rel.label) {
    const mx = (fromPos.x + toPos.x) / 2
    const my = (fromPos.y + toPos.y) / 2
    svg += `<text x="${mx}" y="${my - 6}" text-anchor="middle" font-size="12" fill="${stroke}" font-family="sans-serif">${escapeXmlSimple(rel.label)}</text>`
  }

  return svg
}

// ─── SVG Connection (Entity Type: connection) ───────────────────────────────

export function renderConnection(
  fromPos: { x: number; y: number },
  toPos: { x: number; y: number },
  attrs: Record<string, string | number>,
): string {
  return line({
    ...attrs,
    x1: fromPos.x,
    y1: fromPos.y,
    x2: toPos.x,
    y2: toPos.y,
  })
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function escapeXmlSimple(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
