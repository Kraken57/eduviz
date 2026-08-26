import type { SvgAttrs } from './types.js'

// ─── XML Escape ─────────────────────────────────────────────────────────────

export function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

// ─── Attribute Serialization ────────────────────────────────────────────────

function serializeAttrs(attrs: SvgAttrs): string {
  const parts: string[] = []
  for (const [k, v] of Object.entries(attrs)) {
    if (v === undefined || v === null) continue
    parts.push(`${k}="${String(v).replace(/"/g, '&quot;')}"`)
  }
  return parts.join(' ')
}

// ─── Generic SVG Element Builder ────────────────────────────────────────────

export function svgElement(tag: string, attrs: SvgAttrs, children: string[] = []): string {
  const attrStr = serializeAttrs(attrs)
  if (children.length === 0) {
    return `<${tag}${attrStr ? ' ' + attrStr : ''}/>`
  }
  return `<${tag}${attrStr ? ' ' + attrStr : ''}>${children.join('')}</${tag}>`
}

// ─── Shape Builders ─────────────────────────────────────────────────────────

export function circle(attrs: SvgAttrs): string {
  return svgElement('circle', attrs)
}

export function rect(attrs: SvgAttrs): string {
  return svgElement('rect', attrs)
}

export function ellipse(attrs: SvgAttrs): string {
  return svgElement('ellipse', attrs)
}

export function line(attrs: SvgAttrs): string {
  return svgElement('line', attrs)
}

export function path(attrs: SvgAttrs): string {
  return svgElement('path', attrs)
}

export function polygon(attrs: SvgAttrs): string {
  return svgElement('polygon', attrs)
}

// ─── Text ───────────────────────────────────────────────────────────────────

export function textElement(attrs: SvgAttrs, content: string): string {
  return svgElement('text', attrs, [escapeXml(content)])
}

export function tspan(attrs: SvgAttrs, content: string): string {
  return svgElement('tspan', attrs, [escapeXml(content)])
}

// ─── Container ──────────────────────────────────────────────────────────────

export function g(attrs: SvgAttrs, children: string[]): string {
  return svgElement('g', attrs, children)
}

export function defs(children: string[]): string {
  return svgElement('defs', {}, children)
}

export function marker(attrs: SvgAttrs, children: string[]): string {
  return svgElement('marker', attrs, children)
}

// ─── Animation Elements ─────────────────────────────────────────────────────

export function animate(attrs: SvgAttrs): string {
  return svgElement('animate', attrs)
}

export function animateTransform(attrs: SvgAttrs): string {
  return svgElement('animateTransform', attrs)
}

export function style(content: string): string {
  return svgElement('style', {}, [content])
}

// ─── Document Wrapper ───────────────────────────────────────────────────────

export function svgDocument(
  width: number,
  height: number,
  background: string,
  content: string[],
): string {
  const rootAttrs: SvgAttrs = {
    xmlns: 'http://www.w3.org/2000/svg',
    width,
    height,
    viewBox: `0 0 ${width} ${height}`,
  }
  const bgRect = rect({ x: 0, y: 0, width, height, fill: background })
  const inner = [bgRect, ...content].join('\n')
  return svgElement('svg', rootAttrs, [inner])
}

// ─── Points to Path Data ────────────────────────────────────────────────────

export function pointsToPath(points: Array<{ x: number; y: number }>, closed = false): string {
  if (points.length === 0) return ''
  const d = [`M ${points[0].x} ${points[0].y}`]
  for (let i = 1; i < points.length; i++) {
    d.push(`L ${points[i].x} ${points[i].y}`)
  }
  if (closed) d.push('Z')
  return d.join(' ')
}

// ─── Transform String Builder ───────────────────────────────────────────────

export function buildTransform(opts: {
  translate?: { x: number; y: number }
  rotate?: number
  scale?: number | { x: number; y: number }
  origin?: { x: number; y: number }
}): string {
  const parts: string[] = []
  if (opts.translate) {
    parts.push(`translate(${opts.translate.x}, ${opts.translate.y})`)
  }
  if (opts.rotate !== undefined) {
    if (opts.origin) {
      parts.push(`rotate(${opts.rotate}, ${opts.origin.x}, ${opts.origin.y})`)
    } else {
      parts.push(`rotate(${opts.rotate})`)
    }
  }
  if (opts.scale !== undefined) {
    if (typeof opts.scale === 'number') {
      parts.push(`scale(${opts.scale})`)
    } else {
      parts.push(`scale(${opts.scale.x}, ${opts.scale.y})`)
    }
  }
  return parts.join(' ')
}
