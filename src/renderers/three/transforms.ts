import type { PropertyBag, Vec2, Vec3 } from '../../ir/types.js'
import { resolveNumber, resolvePrimitive } from './materials.js'

// ─── Position Resolution ──────────────────────────────────────────────────

export function resolvePosition(props: PropertyBag): { x: number; y: number; z: number } {
  const posProp = props.position
  const posVal = resolvePrimitive(posProp)

  if (posVal && typeof posVal === 'object' && !Array.isArray(posVal) && 'x' in posVal) {
    const v = posVal as unknown as Vec2 | Vec3
    return {
      x: typeof v.x === 'number' ? v.x : 0,
      y: typeof v.y === 'number' ? v.y : 0,
      z: 'z' in v && typeof (v as Vec3).z === 'number' ? (v as Vec3).z : 0,
    }
  }

  return {
    x: resolveNumber(props.x, 0),
    y: resolveNumber(props.y, 0),
    z: resolveNumber(props.z, 0),
  }
}

// ─── Rotation Resolution ──────────────────────────────────────────────────

export function resolveRotation(props: PropertyBag): { x: number; y: number; z: number } {
  const rotX = resolveNumber(props.rotationX, 0)
  const rotY = resolveNumber(props.rotationY, 0)
  const rotZ = resolveNumber(props.rotationZ, 0)

  const rot = resolveNumber(props.rotation, 0)
  if (rot !== 0 && rotY === 0) {
    return { x: rotX, y: rot, z: rotZ }
  }

  return { x: rotX, y: rotY, z: rotZ }
}

// ─── Scale Resolution ─────────────────────────────────────────────────────

export function resolveScale(props: PropertyBag): { x: number; y: number; z: number } {
  const scaleX = resolveNumber(props.scaleX, 1)
  const scaleY = resolveNumber(props.scaleY, 1)
  const scaleZ = resolveNumber(props.scaleZ, 1)

  const scaleVal = resolvePrimitive(props.scale)
  if (typeof scaleVal === 'number') {
    return { x: scaleVal, y: scaleVal, z: scaleVal }
  }

  if (scaleVal && typeof scaleVal === 'object' && !Array.isArray(scaleVal) && 'x' in scaleVal) {
    const v = scaleVal as unknown as Vec2 | Vec3
    return {
      x: typeof v.x === 'number' ? v.x : scaleX,
      y: typeof v.y === 'number' ? v.y : scaleY,
      z: 'z' in v && typeof (v as Vec3).z === 'number' ? (v as Vec3).z : scaleZ,
    }
  }

  return { x: scaleX, y: scaleY, z: scaleZ }
}

// ─── Visibility Resolution ────────────────────────────────────────────────

export function resolveVisible(props: PropertyBag): boolean {
  const v = resolvePrimitive(props.visible)
  if (typeof v === 'boolean') return v
  return true
}
