import type { EntityType } from '../../ir/types.js'

// ─── SVG Attribute Map ──────────────────────────────────────────────────────

export type SvgAttrs = Record<string, string | number>

// ─── SVG Element Descriptor ─────────────────────────────────────────────────

export interface SvgElement {
  tag: string
  attrs: SvgAttrs
  children: string[]
}

// ─── Position ───────────────────────────────────────────────────────────────

export interface Point2D {
  x: number
  y: number
}

// ─── Viewport Config ────────────────────────────────────────────────────────

export interface ViewportConfig {
  width: number
  height: number
  background: string
}

// ─── SVG Animation Metadata ─────────────────────────────────────────────────

export interface SvgAnimationMeta {
  entityId: string
  property: string
  keyframes: Array<{ offset: number; value: string | number }>
  duration: number
  easing?: string
  loop?: boolean
  delay?: number
}

// ─── Entity Render Entry ────────────────────────────────────────────────────

export interface EntityRenderEntry {
  elementId: string
  entityType: EntityType
}

// ─── SVG Scene Output ───────────────────────────────────────────────────────

export interface SvgSceneOutput {
  svg: string
  width: number
  height: number
  entityMap: Record<string, EntityRenderEntry>
  animations: SvgAnimationMeta[]
  warnings: string[]
}

// ─── Render Context for SVG ─────────────────────────────────────────────────

export interface SvgRenderContext {
  viewport: ViewportConfig
  entityMap: Record<string, EntityRenderEntry>
  animations: SvgAnimationMeta[]
  warnings: string[]
}
