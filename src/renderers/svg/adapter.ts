// ─── DOM Adapter ────────────────────────────────────────────────────────────
//
// This module is the only code that touches browser DOM APIs.
// It is guarded behind a typeof check for Node.js compatibility.
// All other SVG renderer modules are DOM-free.

// ─── Mount ──────────────────────────────────────────────────────────────────

export function mountSvg(svgString: string, container: HTMLElement): SVGSVGElement | null {
  if (typeof document === 'undefined') return null
  container.innerHTML = svgString
  return container.querySelector('svg')
}

// ─── Unmount ────────────────────────────────────────────────────────────────

export function unmountSvg(container: HTMLElement): void {
  container.innerHTML = ''
}

// ─── Get SVG Element ────────────────────────────────────────────────────────

export function getSvgElement(container: HTMLElement): SVGSVGElement | null {
  if (typeof document === 'undefined') return null
  return container.querySelector('svg')
}

// ─── Parse SVG String ───────────────────────────────────────────────────────

export function parseSvgString(svgString: string): SVGSVGElement | null {
  if (typeof DOMParser === 'undefined') return null
  const parser = new DOMParser()
  const doc = parser.parseFromString(svgString, 'image/svg+xml')
  return doc.querySelector('svg')
}
