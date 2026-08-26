import type { Entity, Prop } from '../../ir/types.js'

// ─── Interaction Attributes ─────────────────────────────────────────────────

export function getInteractionAttrs(entity: Entity): Record<string, string> {
  const attrs: Record<string, string> = {}

  attrs['data-entity-id'] = entity.id
  attrs['data-entity-type'] = entity.type

  for (const [, prop] of Object.entries(entity.properties)) {
    if (prop === null || typeof prop !== 'object') continue

    if ('interact' in prop) {
      const propObj = prop as Prop
      if (propObj.interact) {
        attrs['data-interactive'] = 'true'
        if (propObj.interact.cursor) attrs['data-cursor'] = propObj.interact.cursor
        if (propObj.interact.tooltip) attrs['data-tooltip'] = propObj.interact.tooltip
        break
      }
    }
  }

  return attrs
}
