import type { Entity } from '../../ir/types.js'
import type { SvgRenderContext } from './types.js'
import { textElement, tspan } from './builders.js'
import {
  extractFill,
  extractFontFamily,
  extractFontSize,
  extractOpacity,
  extractPosition,
  extractRotation,
  extractScale,
  extractTextAnchor,
  extractTextContent,
  extractVisibility,
} from './properties.js'

// ─── Text Renderer ──────────────────────────────────────────────────────────

export function renderText(entity: Entity, ctx: SvgRenderContext): string {
  if (!extractVisibility(entity.properties)) return ''

  const content = extractTextContent(entity.properties)
  const pos = extractPosition(entity.properties, { x: 0, y: 0 })
  const fill = extractFill(entity.properties, '#000000')
  const fontSize = extractFontSize(entity.properties, 16)
  const fontFamily = extractFontFamily(entity.properties, 'sans-serif')
  const textAnchor = extractTextAnchor(entity.properties, 'start')
  const opacity = extractOpacity(entity.properties, 1)
  const rotation = extractRotation(entity.properties)
  const scale = extractScale(entity.properties)

  ctx.entityMap[entity.id] = {
    elementId: `entity-${entity.id}`,
    entityType: 'text',
  }

  const transformParts: string[] = []
  if (pos.x !== 0 || pos.y !== 0) {
    transformParts.push(`translate(${pos.x}, ${pos.y})`)
  }
  if (rotation !== undefined) {
    transformParts.push(`rotate(${rotation})`)
  }
  if (scale !== undefined) {
    if (typeof scale === 'number') {
      transformParts.push(`scale(${scale})`)
    } else {
      transformParts.push(`scale(${scale.x}, ${scale.y})`)
    }
  }

  const attrs: Record<string, string | number> = {
    id: `entity-${entity.id}`,
    'data-entity-id': entity.id,
    'data-entity-type': 'text',
    x: 0,
    y: 0,
    fill,
    'font-size': fontSize,
    'font-family': fontFamily,
    'text-anchor': textAnchor,
    'dominant-baseline': 'middle',
    opacity,
  }
  if (transformParts.length > 0) {
    attrs['transform'] = transformParts.join(' ')
  }

  const lines = content.split('\n')
  if (lines.length === 1) {
    return textElement(attrs, content)
  }

  const tspans = lines.map((line, i) =>
    tspan({ x: 0, dy: i === 0 ? 0 : fontSize * 1.2 }, line),
  )
  return `<text${Object.entries(attrs).map(([k, v]) => ` ${k}="${v}"`).join('')}>${tspans.join('')}</text>`
}
