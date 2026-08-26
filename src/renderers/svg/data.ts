import type { Entity, PolylineRenderData, PointCloudRenderData, RenderData } from '../../ir/types.js'
import type { SvgRenderContext } from './types.js'
import { circle, path, g } from './builders.js'
import { extractFill, extractOpacity, extractStroke, extractStrokeWidth, extractVisibility } from './properties.js'

// ─── RenderData Extraction ──────────────────────────────────────────────────

function extractRenderData(props: Record<string, unknown>): RenderData | undefined {
  const rd = props['renderData']
  if (rd === undefined || rd === null) return undefined

  if (typeof rd === 'object' && 'value' in (rd as Record<string, unknown>)) {
    const val = (rd as { value: unknown }).value
    if (typeof val === 'object' && val !== null && 'kind' in (val as Record<string, unknown>)) {
      return val as RenderData
    }
  }

  if (typeof rd === 'object' && rd !== null && 'kind' in (rd as Record<string, unknown>)) {
    return rd as RenderData
  }

  return undefined
}

// ─── Polyline Renderer ──────────────────────────────────────────────────────

function renderPolyline(
  entity: Entity,
  data: PolylineRenderData,
  ctx: SvgRenderContext,
): string {
  if (!extractVisibility(entity.properties)) return ''

  const stroke = extractStroke(entity.properties, '#000000')
  const strokeWidth = extractStrokeWidth(entity.properties, 2)
  const fill = data.closed ? extractFill(entity.properties, 'none') : 'none'
  const opacity = extractOpacity(entity.properties, 1)

  ctx.entityMap[entity.id] = {
    elementId: `entity-${entity.id}`,
    entityType: 'data',
  }

  const d = pointsToPathData(data.points, data.closed)

  const attrs: Record<string, string | number> = {
    id: `entity-${entity.id}`,
    'data-entity-id': entity.id,
    'data-entity-type': 'data',
    'data-data-kind': 'polyline',
    d,
    fill,
    stroke,
    'stroke-width': strokeWidth,
    opacity,
  }

  return path(attrs)
}

// ─── PointCloud Renderer ────────────────────────────────────────────────────

function renderPointCloud(
  entity: Entity,
  data: PointCloudRenderData,
  ctx: SvgRenderContext,
): string {
  if (!extractVisibility(entity.properties)) return ''

  ctx.entityMap[entity.id] = {
    elementId: `entity-${entity.id}`,
    entityType: 'data',
  }

  const defaultFill = extractFill(entity.properties, '#3498DB')
  const opacity = extractOpacity(entity.properties, 1)

  const circles: string[] = []
  for (let i = 0; i < data.points.length; i++) {
    const pt = data.points[i]
    const r = pt.radius ?? 4
    const fill = pt.fill ?? defaultFill
    circles.push(circle({
      cx: pt.x,
      cy: pt.y,
      r,
      fill,
      'data-entity-id': entity.id,
      'data-entity-type': 'data',
      'data-data-kind': 'pointcloud',
      'data-point-index': i,
      opacity,
    }))
  }

  const attrs: Record<string, string | number> = {
    id: `entity-${entity.id}`,
  }
  return g(attrs, circles)
}

// ─── Main Data Renderer ─────────────────────────────────────────────────────

export function renderData(entity: Entity, ctx: SvgRenderContext): string {
  const renderData = extractRenderData(entity.properties)
  if (!renderData) {
    ctx.warnings.push(`Entity "${entity.id}" has no renderData, rendering as fallback`)
    return ''
  }

  switch (renderData.kind) {
    case 'polyline':
      return renderPolyline(entity, renderData, ctx)
    case 'pointcloud':
      return renderPointCloud(entity, renderData, ctx)
    default:
      ctx.warnings.push(`Unknown renderData kind "${(renderData as RenderData).kind}", rendering as fallback`)
      return ''
  }
}

// ─── Path Data Builder ──────────────────────────────────────────────────────

function pointsToPathData(points: Array<{ x: number; y: number }>, closed: boolean): string {
  if (points.length === 0) return ''
  const d = [`M ${points[0].x} ${points[0].y}`]
  for (let i = 1; i < points.length; i++) {
    d.push(`L ${points[i].x} ${points[i].y}`)
  }
  if (closed) d.push('Z')
  return d.join(' ')
}