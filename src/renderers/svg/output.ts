import type { SvgSceneOutput, ViewportConfig } from './types.js'
import { svgDocument } from './builders.js'

// ─── Default Viewport ───────────────────────────────────────────────────────

const DEFAULT_VIEWPORT: ViewportConfig = {
  width: 800,
  height: 600,
  background: '#FFFFFF',
}

// ─── Viewport Config from IR ────────────────────────────────────────────────

export function resolveViewport(irViewport?: {
  width?: number
  height?: number
  background?: string
}): ViewportConfig {
  return {
    width: irViewport?.width ?? DEFAULT_VIEWPORT.width,
    height: irViewport?.height ?? DEFAULT_VIEWPORT.height,
    background: irViewport?.background ?? DEFAULT_VIEWPORT.background,
  }
}

// ─── Wrap Content in SVG Document ───────────────────────────────────────────

export function wrapSvgDocument(
  viewport: ViewportConfig,
  content: string[],
): string {
  return svgDocument(viewport.width, viewport.height, viewport.background, content)
}

// ─── Build Final Output ─────────────────────────────────────────────────────

export function buildSvgOutput(
  svg: string,
  viewport: ViewportConfig,
  entityMap: SvgSceneOutput['entityMap'],
  animations: SvgSceneOutput['animations'],
  warnings: string[],
): SvgSceneOutput {
  return {
    svg,
    width: viewport.width,
    height: viewport.height,
    entityMap,
    animations,
    warnings,
  }
}
