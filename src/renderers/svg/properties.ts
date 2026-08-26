import type { Prop, Primitive, PropertyBag, Value } from '../../ir/types.js'
import type { Point2D } from './types.js'

// ─── Value Resolution ───────────────────────────────────────────────────────

export function resolvePrimitive(val: Prop | Value): string | number | boolean | null {
  if (val === null || val === undefined) return null
  if (typeof val === 'object' && 'value' in val) {
    const inner = (val as Prop).value
    if (inner === null || inner === undefined) return null
    if (typeof inner === 'object' && 'ref' in inner) return null
    if (typeof inner === 'object' && 'expr' in inner) return null
    return inner as string | number | boolean | null
  }
  if (typeof val === 'object' && 'ref' in val) return null
  if (typeof val === 'object' && 'expr' in val) return null
  return val as string | number | boolean | null
}

export function resolveString(val: Prop | Value, fallback: string): string {
  const p = resolvePrimitive(val)
  if (typeof p === 'string') return p
  return fallback
}

export function resolveNumber(val: Prop | Value, fallback: number): number {
  const p = resolvePrimitive(val)
  if (typeof p === 'number') return p
  return fallback
}

// ─── Position ───────────────────────────────────────────────────────────────

export function extractPosition(props: PropertyBag, defaultPos: Point2D): Point2D {
  const pos = props['position']
  if (pos !== undefined) {
    const resolved = resolvePrimitive(pos)
    if (resolved !== null && typeof resolved === 'object' && !Array.isArray(resolved)) {
      const obj = resolved as Record<string, Primitive>
      const x = typeof obj['x'] === 'number' ? obj['x'] : defaultPos.x
      const y = typeof obj['y'] === 'number' ? obj['y'] : defaultPos.y
      return { x, y }
    }
  }
  const x = resolveNumber(props['x'] ?? defaultPos.x, defaultPos.x)
  const y = resolveNumber(props['y'] ?? defaultPos.y, defaultPos.y)
  return { x, y }
}

// ─── Dimensions ─────────────────────────────────────────────────────────────

export function extractWidth(props: PropertyBag, fallback: number): number {
  return resolveNumber(props['width'] ?? fallback, fallback)
}

export function extractHeight(props: PropertyBag, fallback: number): number {
  return resolveNumber(props['height'] ?? fallback, fallback)
}

export function extractRadius(props: PropertyBag, fallback: number): number {
  return resolveNumber(props['radius'] ?? fallback, fallback)
}

// ─── Style Properties ───────────────────────────────────────────────────────

export function extractFill(props: PropertyBag, fallback: string): string {
  return resolveString(props['fill'] ?? fallback, fallback)
}

export function extractStroke(props: PropertyBag, fallback: string): string {
  return resolveString(props['stroke'] ?? fallback, fallback)
}

export function extractStrokeWidth(props: PropertyBag, fallback: number): number {
  return resolveNumber(props['strokeWidth'] ?? fallback, fallback)
}

export function extractOpacity(props: PropertyBag, fallback: number): number {
  return resolveNumber(props['opacity'] ?? fallback, fallback)
}

// ─── Text Properties ────────────────────────────────────────────────────────

export function extractTextContent(props: PropertyBag): string {
  const raw = props['text'] ?? props['content']
  if (raw === undefined) return ''
  const p = resolvePrimitive(raw)
  if (typeof p === 'string') return p
  if (typeof p === 'number') return String(p)
  return ''
}

export function extractFontSize(props: PropertyBag, fallback: number): number {
  return resolveNumber(props['fontSize'] ?? fallback, fallback)
}

export function extractFontFamily(props: PropertyBag, fallback: string): string {
  return resolveString(props['fontFamily'] ?? fallback, fallback)
}

export function extractTextAnchor(props: PropertyBag, fallback: string): string {
  return resolveString(props['textAnchor'] ?? fallback, fallback)
}

// ─── Transform Properties ───────────────────────────────────────────────────

export function extractRotation(props: PropertyBag): number | undefined {
  const v = resolvePrimitive(props['rotation'] ?? props['rotate'])
  if (typeof v === 'number') return v
  return undefined
}

export function extractScale(
  props: PropertyBag,
): number | { x: number; y: number } | undefined {
  const raw = props['scale']
  if (raw === undefined) return undefined
  const v = resolvePrimitive(raw)
  if (typeof v === 'number') return v
  if (v !== null && typeof v === 'object' && !Array.isArray(v)) {
    const obj = v as Record<string, Primitive>
    const sx = typeof obj['x'] === 'number' ? obj['x'] : 1
    const sy = typeof obj['y'] === 'number' ? obj['y'] : 1
    return { x: sx, y: sy }
  }
  return undefined
}

// ─── Shape Type ─────────────────────────────────────────────────────────────

export function extractShapeType(props: PropertyBag): string {
  return resolveString(props['shape'] ?? '', '')
}

// ─── Line Coordinates ───────────────────────────────────────────────────────

export function extractLineCoords(
  props: PropertyBag,
): { x1: number; y1: number; x2: number; y2: number } | undefined {
  if (
    props['x1'] !== undefined &&
    props['y1'] !== undefined &&
    props['x2'] !== undefined &&
    props['y2'] !== undefined
  ) {
    return {
      x1: resolveNumber(props['x1'], 0),
      y1: resolveNumber(props['y1'], 0),
      x2: resolveNumber(props['x2'], 100),
      y2: resolveNumber(props['y2'], 100),
    }
  }
  return undefined
}

// ─── Path Data ──────────────────────────────────────────────────────────────

export function extractPathData(props: PropertyBag): string | undefined {
  const raw = props['d']
  if (raw === undefined) return undefined
  return resolveString(raw, '')
}

// ─── Points Array ───────────────────────────────────────────────────────────

export function extractPoints(
  props: PropertyBag,
): Array<{ x: number; y: number }> | undefined {
  const raw = props['points']
  if (raw === undefined) return undefined
  const resolved = resolvePrimitive(raw)
  if (Array.isArray(resolved)) {
    const arr = resolved as Primitive[]
    const points: Array<{ x: number; y: number }> = []
    for (let i = 0; i < arr.length; i += 2) {
      if (typeof arr[i] === 'number' && typeof arr[i + 1] === 'number') {
        points.push({ x: arr[i] as number, y: arr[i + 1] as number })
      }
    }
    return points
  }
  return undefined
}

// ─── Label ──────────────────────────────────────────────────────────────────

export function extractLabel(props: PropertyBag): string | undefined {
  const raw = props['label']
  if (raw === undefined) return undefined
  const p = resolvePrimitive(raw)
  if (typeof p === 'string') return p
  if (typeof p === 'number') return String(p)
  return undefined
}

// ─── Visibility ─────────────────────────────────────────────────────────────

export function extractVisibility(props: PropertyBag): boolean {
  const raw = props['visible']
  if (raw === undefined) return true
  const p = resolvePrimitive(raw)
  if (typeof p === 'boolean') return p
  if (typeof p === 'number') return p !== 0
  if (typeof p === 'string') return p !== 'false' && p !== 'hidden'
  return true
}
