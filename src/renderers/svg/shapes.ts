import type { Entity } from '../../ir/types.js'
import type { SvgRenderContext } from './types.js'
import { circle, ellipse, line, path, polygon, rect } from './builders.js'
import { getAnimationClassName } from './animations.js'
import {
  extractFill,
  extractHeight,
  extractLineCoords,
  extractOpacity,
  extractPathData,
  extractPoints,
  extractPosition,
  extractRadius,
  extractRotation,
  extractScale,
  extractShapeType,
  extractStroke,
  extractStrokeWidth,
  extractVisibility,
  extractWidth,
} from './properties.js'

// ─── Shape Renderer ─────────────────────────────────────────────────────────

export function renderShape(entity: Entity, ctx: SvgRenderContext): string {
  if (!extractVisibility(entity.properties)) return ''

  const shapeType = extractShapeType(entity.properties)
  const pos = extractPosition(entity.properties, { x: 0, y: 0 })
  const fill = extractFill(entity.properties, 'none')
  const stroke = extractStroke(entity.properties, '#000000')
  const strokeWidth = extractStrokeWidth(entity.properties, 1)
  const opacity = extractOpacity(entity.properties, 1)
  const rotation = extractRotation(entity.properties)
  const scale = extractScale(entity.properties)

  const transform = buildTransformStr(rotation, scale)

  ctx.entityMap[entity.id] = {
    elementId: `entity-${entity.id}`,
    entityType: 'shape',
  }

  const commonAttrs: Record<string, string | number> = {
    id: `entity-${entity.id}`,
    'data-entity-id': entity.id,
    'data-entity-type': 'shape',
    fill,
    stroke,
    'stroke-width': strokeWidth,
    opacity,
  }
  if (transform) commonAttrs['transform'] = transform

  // Add CSS animation classes for geometric properties
  const cssClasses = getCssAnimationClasses(entity.id, ctx)
  if (cssClasses) commonAttrs['class'] = cssClasses

  switch (shapeType) {
    case 'circle': {
      const r = extractRadius(entity.properties, 20)
      return circle({ ...commonAttrs, cx: pos.x, cy: pos.y, r })
    }
    case 'ellipse': {
      const rx = extractRadius(entity.properties, 30)
      const ry = extractHeight(entity.properties, 20)
      return ellipse({ ...commonAttrs, cx: pos.x, cy: pos.y, rx, ry })
    }
    case 'rect':
    case 'rectangle': {
      const w = extractWidth(entity.properties, 60)
      const h = extractHeight(entity.properties, 40)
      return rect({ ...commonAttrs, x: pos.x - w / 2, y: pos.y - h / 2, width: w, height: h })
    }
    case 'roundedRect':
    case 'rounded-rect': {
      const w = extractWidth(entity.properties, 60)
      const h = extractHeight(entity.properties, 40)
      const rx = extractRadius(entity.properties, 8)
      return rect({ ...commonAttrs, x: pos.x - w / 2, y: pos.y - h / 2, width: w, height: h, rx })
    }
    case 'line': {
      const coords = extractLineCoords(entity.properties)
      if (coords) {
        return line({ ...commonAttrs, ...coords })
      }
      return line({ ...commonAttrs, x1: pos.x, y1: pos.y, x2: pos.x + 100, y2: pos.y })
    }
    case 'arrow': {
      const coords = extractLineCoords(entity.properties)
      const x1 = coords?.x1 ?? pos.x
      const y1 = coords?.y1 ?? pos.y
      const x2 = coords?.x2 ?? pos.x + 100
      const y2 = coords?.y2 ?? pos.y
      return buildArrowLine(commonAttrs, x1, y1, x2, y2)
    }
    case 'path': {
      const d = extractPathData(entity.properties)
      if (d) {
        return path({ ...commonAttrs, d, fill: 'none' })
      }
      return path({ ...commonAttrs, d: `M ${pos.x} ${pos.y}`, fill: 'none' })
    }
    case 'polygon': {
      const pts = extractPoints(entity.properties)
      if (pts && pts.length > 0) {
        const ptsStr = pts.map(p => `${p.x},${p.y}`).join(' ')
        return polygon({ ...commonAttrs, points: ptsStr })
      }
      return polygon({ ...commonAttrs, points: `${pos.x},${pos.y - 20} ${pos.x - 20},${pos.y + 10} ${pos.x + 20},${pos.y + 10}` })
    }
    default: {
      const w = extractWidth(entity.properties, 60)
      const h = extractHeight(entity.properties, 40)
      ctx.warnings.push(`Unknown shape type "${shapeType}", rendering as rect`)
      return rect({ ...commonAttrs, x: pos.x - w / 2, y: pos.y - h / 2, width: w, height: h, 'stroke-dasharray': '4 2' })
    }
  }
}

// ─── CSS Animation Classes ──────────────────────────────────────────────────

function getCssAnimationClasses(entityId: string, ctx: SvgRenderContext): string | undefined {
  const anims = ctx.cssAnimations?.filter(a => a.entityId === entityId)
  if (!anims || anims.length === 0) return undefined
  return anims.map(a => getAnimationClassName(a.entityId, a.property)).join(' ')
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function buildTransformStr(
  rotation?: number,
  scale?: number | { x: number; y: number },
): string | undefined {
  const parts: string[] = []
  if (rotation !== undefined) {
    parts.push(`rotate(${rotation})`)
  }
  if (scale !== undefined) {
    if (typeof scale === 'number') {
      parts.push(`scale(${scale})`)
    } else {
      parts.push(`scale(${scale.x}, ${scale.y})`)
    }
  }
  if (parts.length === 0) return undefined
  return parts.join(' ')
}

function buildArrowLine(
  baseAttrs: Record<string, string | number>,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): string {
  const angle = Math.atan2(y2 - y1, x2 - x1)
  const headLen = 10
  const headAngle = Math.PI / 6
  const ax1 = x2 - headLen * Math.cos(angle - headAngle)
  const ay1 = y2 - headLen * Math.sin(angle - headAngle)
  const ax2 = x2 - headLen * Math.cos(angle + headAngle)
  const ay2 = y2 - headLen * Math.sin(angle + headAngle)
  const lineEl = line({ ...baseAttrs, x1, y1, x2, y2 })
  const headEl = polygon({
    ...baseAttrs,
    fill: baseAttrs['stroke'] ?? '#000000',
    stroke: 'none',
    points: `${x2},${y2} ${ax1},${ay1} ${ax2},${ay2}`,
  })
  return `<g>${lineEl}${headEl}</g>`
}
