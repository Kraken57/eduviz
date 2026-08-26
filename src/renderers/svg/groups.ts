import type { Entity } from '../../ir/types.js'
import type { EntityIndex } from '../../engine/preprocessing/pipeline.js'
import type { SvgRenderContext } from './types.js'
import { g } from './builders.js'
import {
  extractFill,
  extractHeight,
  extractOpacity,
  extractPosition,
  extractRotation,
  extractScale,
  extractStroke,
  extractStrokeWidth,
  extractVisibility,
  extractWidth,
} from './properties.js'

// ─── Group Renderer ─────────────────────────────────────────────────────────

export function renderGroup(
  entity: Entity,
  index: EntityIndex,
  ctx: SvgRenderContext,
  renderEntity: (e: Entity) => string,
): string {
  if (!extractVisibility(entity.properties)) return ''

  const pos = extractPosition(entity.properties, { x: 0, y: 0 })
  const opacity = extractOpacity(entity.properties, 1)
  const rotation = extractRotation(entity.properties)
  const scale = extractScale(entity.properties)

  ctx.entityMap[entity.id] = {
    elementId: `entity-${entity.id}`,
    entityType: 'group',
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
    'data-entity-type': 'group',
  }
  if (transformParts.length > 0) {
    attrs['transform'] = transformParts.join(' ')
  }
  if (opacity < 1) {
    attrs['opacity'] = opacity
  }

  const children = index.childrenOf.get(entity.id) ?? []
  const childSvgs: string[] = []

  for (const childId of children) {
    const child = index.byId.get(childId)
    if (child) {
      childSvgs.push(renderEntity(child))
    }
  }

  const fill = extractFill(entity.properties, 'none')
  const stroke = extractStroke(entity.properties, 'none')
  const strokeWidth = extractStrokeWidth(entity.properties, 0)
  const w = extractWidth(entity.properties, 0)
  const h = extractHeight(entity.properties, 0)

  if (fill !== 'none' || stroke !== 'none') {
    childSvgs.unshift(
      `<rect x="0" y="0" width="${w}" height="${h}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}" rx="4"/>`,
    )
  }

  return g(attrs, childSvgs)
}

// ─── Check if Entity is Root ────────────────────────────────────────────────

export function isRootEntity(entityId: string, index: EntityIndex): boolean {
  return !index.parentOf.has(entityId)
}
