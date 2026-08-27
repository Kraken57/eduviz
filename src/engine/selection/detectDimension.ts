// ─── Dimension Detection ────────────────────────────────────────────────────
// Infers whether a scene is 2D or 3D from its content.
// Used for automatic renderer selection.
// ─────────────────────────────────────────────────────────────────────────────

import type { Scene, Entity } from '../../ir/types.js'
import type { Capability } from '../renderer/types.js'

// ─── Detection ──────────────────────────────────────────────────────────────

export function detectDimension(scene: Scene): '2d' | '3d' {
  // 1. Explicit camera projection
  if (scene.viewport?.camera?.projection === 'perspective') {
    return '3d'
  }

  // 2. Explicit metadata hint
  const meta = scene.meta as unknown as Record<string, unknown>
  if (meta?.dimension === '3d') {
    return '3d'
  }

  // 3. Any entity has z-coordinate in position properties
  for (const entity of scene.entities) {
    if (hasZCoordinate(entity)) {
      return '3d'
    }
  }

  return '2d'
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function hasZCoordinate(entity: Entity): boolean {
  const props = entity.properties
  for (const val of Object.values(props)) {
    if (val !== null && typeof val === 'object' && !Array.isArray(val)) {
      const obj = val as Record<string, unknown>
      // Check for Prop wrapper: { value: ... }
      const inner = obj.value !== undefined && typeof obj.value === 'object' && obj.value !== null && !Array.isArray(obj.value)
        ? obj.value as Record<string, unknown>
        : obj
      if ('z' in inner && typeof inner.z === 'number' && inner.z !== 0) {
        return true
      }
    }
  }
  // Also check top-level x/y/z for data-like entities
  if ('z' in props && typeof (props as Record<string, unknown>).z === 'number') {
    return true
  }
  return false
}

// ─── Feature Tagging ────────────────────────────────────────────────────────

export function getDimensionFeature(scene: Scene): Capability {
  return detectDimension(scene) === '3d' ? '3d' : '2d'
}
