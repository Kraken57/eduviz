import type { PropertyBag, Prop, Value } from '../../ir/types.js'
import type { MaterialConfig } from './types.js'

// ─── Default Material Config ──────────────────────────────────────────────

export const DEFAULT_MATERIAL_CONFIG: MaterialConfig = {
  color: '#4A90D9',
  opacity: 1.0,
  wireframe: false,
  roughness: 0.7,
  metalness: 0.1,
  emissive: '#000000',
  emissiveIntensity: 0,
  side: 'front',
  depthWrite: true,
  flatShading: false,
}

// ─── Resolve Primitive Value ──────────────────────────────────────────────

export function resolvePrimitive(prop: Prop | Value | undefined): Value | undefined {
  if (prop === undefined) return undefined
  if (typeof prop === 'object' && prop !== null && 'value' in prop) {
    return (prop as Prop).value
  }
  return prop
}

export function resolveNumber(prop: Prop | Value | undefined, fallback: number): number {
  const v = resolvePrimitive(prop)
  if (typeof v === 'number') return v
  return fallback
}

export function resolveString(prop: Prop | Value | undefined, fallback: string): string {
  const v = resolvePrimitive(prop)
  if (typeof v === 'string') return v
  return fallback
}

export function resolveBoolean(prop: Prop | Value | undefined, fallback: boolean): boolean {
  const v = resolvePrimitive(prop)
  if (typeof v === 'boolean') return v
  return fallback
}

// ─── Parse Color ──────────────────────────────────────────────────────────

function parseColor(color: string): string {
  if (/^#[0-9a-fA-F]{6}$/.test(color)) return color
  if (/^#[0-9a-fA-F]{3}$/.test(color)) {
    const r = color[1]!.repeat(2)
    const g = color[2]!.repeat(2)
    const b = color[3]!.repeat(2)
    return `#${r}${g}${b}`
  }
  return '#4A90D9'
}

// ─── Material Config from Properties ──────────────────────────────────────

export function resolveMaterialConfig(props: PropertyBag): MaterialConfig {
  return {
    color: parseColor(resolveString(props.fill, DEFAULT_MATERIAL_CONFIG.color)),
    opacity: resolveNumber(props.opacity, DEFAULT_MATERIAL_CONFIG.opacity),
    wireframe: resolveBoolean(props.wireframe, DEFAULT_MATERIAL_CONFIG.wireframe),
    roughness: resolveNumber(props.roughness, DEFAULT_MATERIAL_CONFIG.roughness),
    metalness: resolveNumber(props.metalness, DEFAULT_MATERIAL_CONFIG.metalness),
    emissive: parseColor(resolveString(props.emissive, DEFAULT_MATERIAL_CONFIG.emissive)),
    emissiveIntensity: resolveNumber(props.emissiveIntensity, DEFAULT_MATERIAL_CONFIG.emissiveIntensity),
    side: resolveString(props.side, DEFAULT_MATERIAL_CONFIG.side) as MaterialConfig['side'],
    depthWrite: resolveBoolean(props.depthWrite, DEFAULT_MATERIAL_CONFIG.depthWrite),
    flatShading: resolveBoolean(props.flatShading, DEFAULT_MATERIAL_CONFIG.flatShading),
  }
}

// ─── Material Cache Key ───────────────────────────────────────────────────

export function materialCacheKey(config: MaterialConfig): string {
  return [
    config.color,
    config.opacity,
    config.wireframe,
    config.roughness,
    config.metalness,
    config.emissive,
    config.emissiveIntensity,
    config.side,
    config.depthWrite,
    config.flatShading,
  ].join('|')
}
