import { describe, it } from 'node:test'
import * as assert from 'node:assert/strict'
import type { Entity, PropertyBag } from '../../ir/types.js'
import { renderShape } from './shapes.js'
import { renderText } from './text.js'
import { renderRelationship } from './connections.js'
import { renderGroup, isRootEntity } from './groups.js'
import { renderFallback } from './fallback.js'
import { renderPropertyAnimations, renderAnimationBindings } from './animations.js'
import { getInteractionAttrs } from './interactions.js'
import { buildSvgOutput, resolveViewport, wrapSvgDocument } from './output.js'
import {
  resolvePrimitive,
  resolveString,
  resolveNumber,
  extractPosition,
  extractFill,
  extractRadius,
  extractWidth,
  extractHeight,
  extractTextContent,
  extractFontSize,
  extractOpacity,
  extractShapeType,
  extractRotation,
  extractScale,
  extractVisibility,
  extractLabel,
} from './properties.js'
import { escapeXml, svgDocument, g, circle, rect, textElement, pointsToPath, buildTransform } from './builders.js'
import type { SvgRenderContext } from './types.js'
import { preprocessScene } from '../../engine/preprocessing/pipeline.js'
import type { EntityIndex } from '../../engine/preprocessing/pipeline.js'

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeCtx(): SvgRenderContext {
  return {
    viewport: { width: 800, height: 600, background: '#FFFFFF' },
    entityMap: {},
    animations: [],
    warnings: [],
  }
}

function makeIndex(entities: Entity[] = []): EntityIndex {
  const result = preprocessScene({
    meta: { version: '1.0', title: 'test' },
    entities,
    relationships: [],
  })
  if (!result.success || !result.preprocessed) {
    throw new Error('Failed to preprocess test scene')
  }
  return result.preprocessed.entityIndex
}

// ─── Builder Tests ──────────────────────────────────────────────────────────

describe('builders', () => {
  it('escapeXml escapes special characters', () => {
    assert.equal(escapeXml('<b>&"a"</b>'), '&lt;b&gt;&amp;&quot;a&quot;&lt;/b&gt;')
  })

  it('circle generates self-closing tag with attributes', () => {
    const s = circle({ cx: 10, cy: 20, r: 5, fill: 'red' })
    assert.equal(s, '<circle cx="10" cy="20" r="5" fill="red"/>')
  })

  it('rect generates self-closing tag', () => {
    const s = rect({ x: 0, y: 0, width: 100, height: 50 })
    assert.ok(s.startsWith('<rect'))
    assert.ok(s.includes('width="100"'))
    assert.ok(s.endsWith('/>'))
  })

  it('g wraps children', () => {
    const s = g({ id: 'g1' }, ['<circle/>', '<rect/>'])
    assert.equal(s, '<g id="g1"><circle/><rect/></g>')
  })

  it('textElement wraps content', () => {
    const s = textElement({ x: 10, y: 20 }, 'Hello')
    assert.ok(s.includes('Hello'))
    assert.ok(s.startsWith('<text'))
    assert.ok(s.endsWith('</text>'))
  })

  it('pointsToPath generates M/L path data', () => {
    const d = pointsToPath([{ x: 0, y: 0 }, { x: 10, y: 20 }, { x: 30, y: 0 }])
    assert.equal(d, 'M 0 0 L 10 20 L 30 0')
  })

  it('pointsToPath closes path when requested', () => {
    const d = pointsToPath([{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 5, y: 10 }], true)
    assert.equal(d, 'M 0 0 L 10 0 L 5 10 Z')
  })

  it('pointsToPath returns empty string for empty array', () => {
    assert.equal(pointsToPath([]), '')
  })

  it('buildTransform produces translate', () => {
    const t = buildTransform({ translate: { x: 10, y: 20 } })
    assert.equal(t, 'translate(10, 20)')
  })

  it('buildTransform produces rotate with origin', () => {
    const t = buildTransform({ rotate: 45, origin: { x: 100, y: 100 } })
    assert.equal(t, 'rotate(45, 100, 100)')
  })

  it('buildTransform produces scale', () => {
    const t = buildTransform({ scale: 2 })
    assert.equal(t, 'scale(2)')
  })

  it('buildTransform produces combined transform', () => {
    const t = buildTransform({ translate: { x: 10, y: 20 }, rotate: 90 })
    assert.equal(t, 'translate(10, 20) rotate(90)')
  })

  it('svgDocument wraps content in svg element', () => {
    const s = svgDocument(800, 600, '#FFF', ['<circle/>'])
    assert.ok(s.includes('xmlns="http://www.w3.org/2000/svg"'))
    assert.ok(s.includes('width="800"'))
    assert.ok(s.includes('viewBox="0 0 800 600"'))
    assert.ok(s.includes('fill="#FFF"'))
    assert.ok(s.includes('<circle/>'))
  })
})

// ─── Property Extraction Tests ──────────────────────────────────────────────

describe('properties', () => {
  it('resolvePrimitive extracts from Prop', () => {
    const result = resolvePrimitive({ value: 42 })
    assert.equal(result, 42)
  })

  it('resolvePrimitive extracts plain value', () => {
    const result = resolvePrimitive('hello')
    assert.equal(result, 'hello')
  })

  it('resolvePrimitive returns null for ValueRef', () => {
    const result = resolvePrimitive({ ref: 'e1' })
    assert.equal(result, null)
  })

  it('resolveString returns string value', () => {
    assert.equal(resolveString({ value: 'red' }, 'blue'), 'red')
  })

  it('resolveString returns fallback for non-string', () => {
    assert.equal(resolveString({ value: 42 }, 'blue'), 'blue')
  })

  it('resolveNumber returns number value', () => {
    assert.equal(resolveNumber({ value: 3.14 }, 0), 3.14)
  })

  it('resolveNumber returns fallback for non-number', () => {
    assert.equal(resolveNumber({ value: 'abc' }, 10), 10)
  })

  it('extractPosition from position property', () => {
    const props: PropertyBag = { position: { value: { x: 100, y: 200 } } }
    assert.deepEqual(extractPosition(props, { x: 0, y: 0 }), { x: 100, y: 200 })
  })

  it('extractPosition from x/y properties', () => {
    const props: PropertyBag = { x: { value: 50 }, y: { value: 75 } }
    assert.deepEqual(extractPosition(props, { x: 0, y: 0 }), { x: 50, y: 75 })
  })

  it('extractPosition uses default when no position', () => {
    assert.deepEqual(extractPosition({}, { x: 400, y: 300 }), { x: 400, y: 300 })
  })

  it('extractFill returns fill color', () => {
    assert.equal(extractFill({ fill: { value: '#FF0000' } }, '#000'), '#FF0000')
  })

  it('extractFill returns fallback', () => {
    assert.equal(extractFill({}, '#000'), '#000')
  })

  it('extractRadius returns value', () => {
    assert.equal(extractRadius({ radius: { value: 25 } }, 10), 25)
  })

  it('extractWidth returns value', () => {
    assert.equal(extractWidth({ width: { value: 200 } }, 50), 200)
  })

  it('extractHeight returns value', () => {
    assert.equal(extractHeight({ height: { value: 100 } }, 50), 100)
  })

  it('extractTextContent returns text property', () => {
    assert.equal(extractTextContent({ text: { value: 'hello' } }), 'hello')
  })

  it('extractTextContent returns content property', () => {
    assert.equal(extractTextContent({ content: { value: 'world' } }), 'world')
  })

  it('extractTextContent returns empty string when missing', () => {
    assert.equal(extractTextContent({}), '')
  })

  it('extractFontSize returns value', () => {
    assert.equal(extractFontSize({ fontSize: { value: 24 } }, 16), 24)
  })

  it('extractOpacity returns value', () => {
    assert.equal(extractOpacity({ opacity: { value: 0.5 } }, 1), 0.5)
  })

  it('extractShapeType returns shape string', () => {
    assert.equal(extractShapeType({ shape: { value: 'circle' } }), 'circle')
  })

  it('extractRotation returns number', () => {
    assert.equal(extractRotation({ rotation: { value: 45 } }), 45)
  })

  it('extractRotation returns undefined when missing', () => {
    assert.equal(extractRotation({}), undefined)
  })

  it('extractScale returns number', () => {
    assert.equal(extractScale({ scale: { value: 2 } }), 2)
  })

  it('extractScale returns object', () => {
    assert.deepEqual(extractScale({ scale: { value: { x: 2, y: 3 } } }), { x: 2, y: 3 })
  })

  it('extractScale returns undefined when missing', () => {
    assert.equal(extractScale({}), undefined)
  })

  it('extractVisibility returns true by default', () => {
    assert.equal(extractVisibility({}), true)
  })

  it('extractVisibility returns false for visible=false', () => {
    assert.equal(extractVisibility({ visible: { value: false } }), false)
  })

  it('extractLabel returns label string', () => {
    assert.equal(extractLabel({ label: { value: 'Node A' } }), 'Node A')
  })

  it('extractLabel returns undefined when missing', () => {
    assert.equal(extractLabel({}), undefined)
  })
})

// ─── Shape Rendering Tests ──────────────────────────────────────────────────

describe('shapes', () => {
  it('renders circle', () => {
    const e: Entity = {
      id: 'c1', type: 'shape',
      properties: { shape: { value: 'circle' }, radius: { value: 30 }, position: { value: { x: 100, y: 200 } }, fill: { value: '#4A90D9' } },
    }
    const ctx = makeCtx()
    const svg = renderShape(e, ctx)
    assert.ok(svg.includes('<circle'))
    assert.ok(svg.includes('cx="100"'))
    assert.ok(svg.includes('cy="200"'))
    assert.ok(svg.includes('r="30"'))
    assert.ok(svg.includes('fill="#4A90D9"'))
    assert.ok(svg.includes('id="entity-c1"'))
    assert.ok(ctx.entityMap['c1'] !== undefined)
  })

  it('renders rect', () => {
    const e: Entity = {
      id: 'r1', type: 'shape',
      properties: { shape: { value: 'rect' }, width: { value: 120 }, height: { value: 80 }, position: { value: { x: 200, y: 300 } } },
    }
    const ctx = makeCtx()
    const svg = renderShape(e, ctx)
    assert.ok(svg.includes('<rect'))
    assert.ok(svg.includes('width="120"'))
    assert.ok(svg.includes('height="80"'))
  })

  it('renders ellipse', () => {
    const e: Entity = {
      id: 'e1', type: 'shape',
      properties: { shape: { value: 'ellipse' }, radius: { value: 40 }, height: { value: 20 }, position: { value: { x: 50, y: 50 } } },
    }
    const ctx = makeCtx()
    const svg = renderShape(e, ctx)
    assert.ok(svg.includes('<ellipse'))
    assert.ok(svg.includes('rx="40"'))
    assert.ok(svg.includes('ry="20"'))
  })

  it('renders line with coordinates', () => {
    const e: Entity = {
      id: 'l1', type: 'shape',
      properties: { shape: { value: 'line' }, x1: { value: 10 }, y1: { value: 20 }, x2: { value: 100 }, y2: { value: 200 } },
    }
    const ctx = makeCtx()
    const svg = renderShape(e, ctx)
    assert.ok(svg.includes('<line'))
    assert.ok(svg.includes('x1="10"'))
    assert.ok(svg.includes('y2="200"'))
  })

  it('renders arrow with arrowhead', () => {
    const e: Entity = {
      id: 'a1', type: 'shape',
      properties: { shape: { value: 'arrow' }, x1: { value: 0 }, y1: { value: 0 }, x2: { value: 100 }, y2: { value: 0 }, stroke: { value: '#FF0000' } },
    }
    const ctx = makeCtx()
    const svg = renderShape(e, ctx)
    assert.ok(svg.includes('<g>'))
    assert.ok(svg.includes('<line'))
    assert.ok(svg.includes('<polygon'))
  })

  it('renders polygon with points', () => {
    const e: Entity = {
      id: 'p1', type: 'shape',
      properties: { shape: { value: 'polygon' }, points: { value: [0, 0, 50, 0, 25, 50] } },
    }
    const ctx = makeCtx()
    const svg = renderShape(e, ctx)
    assert.ok(svg.includes('<polygon'))
    assert.ok(svg.includes('0,0'))
    assert.ok(svg.includes('50,0'))
  })

  it('renders path with d attribute', () => {
    const e: Entity = {
      id: 'path1', type: 'shape',
      properties: { shape: { value: 'path' }, d: { value: 'M 0 0 L 100 100' } },
    }
    const ctx = makeCtx()
    const svg = renderShape(e, ctx)
    assert.ok(svg.includes('<path'))
    assert.ok(svg.includes('d="M 0 0 L 100 100"'))
  })

  it('renders roundedRect', () => {
    const e: Entity = {
      id: 'rr1', type: 'shape',
      properties: { shape: { value: 'roundedRect' }, width: { value: 100 }, height: { value: 60 } },
    }
    const ctx = makeCtx()
    const svg = renderShape(e, ctx)
    assert.ok(svg.includes('<rect'))
    assert.ok(svg.includes('rx="8"'))
  })

  it('unknown shape type falls back to rect with warning', () => {
    const e: Entity = {
      id: 'u1', type: 'shape',
      properties: { shape: { value: 'star' } },
    }
    const ctx = makeCtx()
    const svg = renderShape(e, ctx)
    assert.ok(svg.includes('<rect'))
    assert.ok(svg.includes('stroke-dasharray="4 2"'))
    assert.ok(ctx.warnings.some(w => w.includes('Unknown shape type')))
  })

  it('hidden shape returns empty string', () => {
    const e: Entity = {
      id: 'h1', type: 'shape',
      properties: { shape: { value: 'circle' }, visible: { value: false } },
    }
    const ctx = makeCtx()
    assert.equal(renderShape(e, ctx), '')
  })
})

// ─── Text Rendering Tests ───────────────────────────────────────────────────

describe('text', () => {
  it('renders text element', () => {
    const e: Entity = {
      id: 't1', type: 'text',
      properties: { text: { value: 'Hello World' }, position: { value: { x: 100, y: 200 } }, fill: { value: '#333333' } },
    }
    const ctx = makeCtx()
    const svg = renderText(e, ctx)
    assert.ok(svg.includes('<text'))
    assert.ok(svg.includes('Hello World'))
    assert.ok(svg.includes('fill="#333333"'))
    assert.ok(svg.includes('id="entity-t1"'))
  })

  it('renders multi-line text with tspans', () => {
    const e: Entity = {
      id: 't2', type: 'text',
      properties: { text: { value: 'Line 1\nLine 2' } },
    }
    const ctx = makeCtx()
    const svg = renderText(e, ctx)
    assert.ok(svg.includes('<text'))
    assert.ok(svg.includes('<tspan'))
  })

  it('applies font properties', () => {
    const e: Entity = {
      id: 't3', type: 'text',
      properties: { text: { value: 'Styled' }, fontSize: { value: 24 }, fontFamily: { value: 'monospace' }, textAnchor: { value: 'middle' } },
    }
    const ctx = makeCtx()
    const svg = renderText(e, ctx)
    assert.ok(svg.includes('font-size="24"'))
    assert.ok(svg.includes('font-family="monospace"'))
    assert.ok(svg.includes('text-anchor="middle"'))
  })

  it('hidden text returns empty string', () => {
    const e: Entity = {
      id: 'ht1', type: 'text',
      properties: { text: { value: 'Hidden' }, visible: { value: false } },
    }
    const ctx = makeCtx()
    assert.equal(renderText(e, ctx), '')
  })
})

// ─── Connection Rendering Tests ─────────────────────────────────────────────

describe('connections', () => {
  it('renders edge between two entities', () => {
    const from: Entity = { id: 'n1', type: 'shape', properties: { shape: { value: 'circle' }, position: { value: { x: 100, y: 100 } } } }
    const to: Entity = { id: 'n2', type: 'shape', properties: { shape: { value: 'circle' }, position: { value: { x: 300, y: 300 } } } }
    const index = makeIndex([from, to])
    const ctx = makeCtx()
    const svg = renderRelationship({ type: 'edge', from: 'n1', to: 'n2' }, index, ctx)
    assert.ok(svg.includes('<line'))
    assert.ok(svg.includes('x1="100"'))
    assert.ok(svg.includes('x2="300"'))
  })

  it('renders edge with label', () => {
    const from: Entity = { id: 'n1', type: 'shape', properties: { position: { value: { x: 0, y: 0 } } } }
    const to: Entity = { id: 'n2', type: 'shape', properties: { position: { value: { x: 100, y: 0 } } } }
    const index = makeIndex([from, to])
    const ctx = makeCtx()
    const svg = renderRelationship({ type: 'edge', from: 'n1', to: 'n2', label: 'connects' }, index, ctx)
    assert.ok(svg.includes('connects'))
  })

  it('warns for missing entity', () => {
    const dummy: Entity = { id: 'dummy', type: 'shape', properties: {} }
    const index = makeIndex([dummy])
    const ctx = makeCtx()
    const svg = renderRelationship({ type: 'edge', from: 'missing1', to: 'missing2' }, index, ctx)
    assert.equal(svg, '')
    assert.ok(ctx.warnings.some(w => w.includes('entity not found')))
  })

  it('renders dashed stroke style', () => {
    const from: Entity = { id: 'n1', type: 'shape', properties: { position: { value: { x: 0, y: 0 } } } }
    const to: Entity = { id: 'n2', type: 'shape', properties: { position: { value: { x: 100, y: 0 } } } }
    const index = makeIndex([from, to])
    const ctx = makeCtx()
    const svg = renderRelationship({
      type: 'edge', from: 'n1', to: 'n2',
      properties: { strokeStyle: { value: 'dashed' } },
    }, index, ctx)
    assert.ok(svg.includes('stroke-dasharray="8 4"'))
  })
})

// ─── Group Rendering Tests ──────────────────────────────────────────────────

describe('groups', () => {
  it('renders group with children', () => {
    const child: Entity = { id: 'c1', type: 'shape', properties: { shape: { value: 'circle' }, position: { value: { x: 50, y: 50 } } } }
    const parent: Entity = { id: 'g1', type: 'group', properties: { position: { value: { x: 100, y: 100 } } } }
    const index = makeIndex([child, parent])
    const ctx = makeCtx()

    const renderEntity = (e: Entity) => {
      if (e.type === 'shape') return renderShape(e, ctx)
      if (e.type === 'group') return renderGroup(e, index, ctx, renderEntity)
      return ''
    }

    const svg = renderGroup(parent, index, ctx, renderEntity)
    assert.ok(svg.includes('<g'))
    assert.ok(svg.includes('data-entity-id="g1"'))
    assert.ok(svg.includes('id="entity-g1"'))
  })

  it('isRootEntity returns true for entities with no parent', () => {
    const child: Entity = { id: 'c1', type: 'shape', properties: {} }
    const parent: Entity = { id: 'g1', type: 'group', properties: {} }
    const index = makeIndex([child, parent])
    assert.equal(isRootEntity('g1', index), true)
    assert.equal(isRootEntity('c1', index), true)
  })
})

// ─── Fallback Rendering Tests ───────────────────────────────────────────────

describe('fallback', () => {
  it('renders labeled rect for unsupported entity type', () => {
    const e: Entity = {
      id: 'unk1', type: 'abstract', name: 'Unknown',
      properties: {},
    }
    const ctx = makeCtx()
    const svg = renderFallback(e, ctx)
    assert.ok(svg.includes('<rect'))
    assert.ok(svg.includes('stroke-dasharray="4 2"'))
    assert.ok(svg.includes('Unknown'))
    assert.ok(ctx.entityMap['unk1'] !== undefined)
  })
})

// ─── Animation Tests ────────────────────────────────────────────────────────

describe('animations', () => {
  it('renders inline SVG animation for opacity', () => {
    const props: PropertyBag = {
      opacity: {
        value: 1,
        anim: {
          keyframes: [{ offset: 0, value: 1 }, { offset: 1, value: 0 }],
          duration: 2,
        },
      },
    }
    const ctx = makeCtx()
    const svgs = renderPropertyAnimations('e1', props, ctx)
    assert.equal(svgs.length, 1)
    assert.ok(svgs[0].includes('<animate'))
    assert.ok(svgs[0].includes('attributeName="opacity"'))
  })

  it('renders inline SVG animation for fill', () => {
    const props: PropertyBag = {
      fill: {
        value: '#FF0000',
        anim: {
          keyframes: [{ offset: 0, value: '#FF0000' }, { offset: 1, value: '#0000FF' }],
          duration: 1,
        },
      },
    }
    const ctx = makeCtx()
    const svgs = renderPropertyAnimations('e1', props, ctx)
    assert.equal(svgs.length, 1)
    assert.ok(svgs[0].includes('attributeName="fill"'))
  })

  it('outputs metadata for non-CSS-animatable properties', () => {
    const props: PropertyBag = {
      radius: {
        value: 20,
        anim: {
          keyframes: [{ offset: 0, value: 20 }, { offset: 1, value: 50 }],
          duration: 2,
        },
      },
    }
    const ctx = makeCtx()
    const svgs = renderPropertyAnimations('e1', props, ctx)
    assert.equal(svgs.length, 0)
    assert.equal(ctx.animations.length, 1)
    assert.equal(ctx.animations[0].entityId, 'e1')
    assert.equal(ctx.animations[0].property, 'radius')
  })

  it('renders animation bindings for CSS properties', () => {
    const ctx = makeCtx()
    const svgs = renderAnimationBindings([{
      target: 'opacity',
      keyframes: [{ offset: 0, value: 1 }, { offset: 1, value: 0 }],
      duration: 3,
      loop: true,
    }], ctx)
    assert.equal(svgs.length, 1)
    assert.ok(svgs[0].includes('repeatCount="indefinite"'))
  })

  it('outputs metadata for non-CSS animation bindings', () => {
    const ctx = makeCtx()
    renderAnimationBindings([{
      target: 'position.x',
      keyframes: [{ offset: 0, value: 0 }, { offset: 1, value: 100 }],
      duration: 2,
    }], ctx)
    assert.equal(ctx.animations.length, 1)
    assert.equal(ctx.animations[0].property, 'position.x')
  })

  it('applies easing to animation', () => {
    const props: PropertyBag = {
      opacity: {
        value: 1,
        anim: {
          keyframes: [{ offset: 0, value: 1 }, { offset: 1, value: 0 }],
          duration: 2,
          easing: 'easeInOut',
        },
      },
    }
    const ctx = makeCtx()
    const svgs = renderPropertyAnimations('e1', props, ctx)
    assert.ok(svgs[0].includes('calcMode="spline"'))
    assert.ok(svgs[0].includes('keySplines="0.42 0 0.58 1"'))
  })
})

// ─── Interaction Tests ──────────────────────────────────────────────────────

describe('interactions', () => {
  it('returns entity id and type attributes', () => {
    const e: Entity = { id: 'i1', type: 'shape', properties: {} }
    const attrs = getInteractionAttrs(e)
    assert.equal(attrs['data-entity-id'], 'i1')
    assert.equal(attrs['data-entity-type'], 'shape')
  })

  it('adds interactive flag when interact is present', () => {
    const e: Entity = {
      id: 'i2', type: 'shape',
      properties: {
        fill: {
          value: 'blue',
          interact: { on: [{ event: 'click', action: { type: 'set', target: 'fill', value: 'red' } }] },
        },
      },
    }
    const attrs = getInteractionAttrs(e)
    assert.equal(attrs['data-interactive'], 'true')
  })

  it('adds cursor and tooltip', () => {
    const e: Entity = {
      id: 'i3', type: 'shape',
      properties: {
        fill: {
          value: 'blue',
          interact: {
            on: [{ event: 'hover', action: { type: 'tooltip', message: 'Hello' } }],
            cursor: 'pointer',
            tooltip: 'Click me',
          },
        },
      },
    }
    const attrs = getInteractionAttrs(e)
    assert.equal(attrs['data-cursor'], 'pointer')
    assert.equal(attrs['data-tooltip'], 'Click me')
  })
})

// ─── Output Tests ───────────────────────────────────────────────────────────

describe('output', () => {
  it('resolveViewport defaults to 800x600', () => {
    const vp = resolveViewport(undefined)
    assert.equal(vp.width, 800)
    assert.equal(vp.height, 600)
    assert.equal(vp.background, '#FFFFFF')
  })

  it('resolveViewport uses scene viewport', () => {
    const vp = resolveViewport({ width: 1024, height: 768, background: '#000000' })
    assert.equal(vp.width, 1024)
    assert.equal(vp.height, 768)
    assert.equal(vp.background, '#000000')
  })

  it('wrapSvgDocument produces valid SVG', () => {
    const vp = { width: 800, height: 600, background: '#FFF' }
    const svg = wrapSvgDocument(vp, ['<circle/>'])
    assert.ok(svg.includes('xmlns'))
    assert.ok(svg.includes('viewBox="0 0 800 600"'))
  })

  it('buildSvgOutput returns complete output', () => {
    const vp = { width: 800, height: 600, background: '#FFF' }
    const output = buildSvgOutput('<svg/>', vp, { e1: { elementId: 'e1', entityType: 'shape' } }, [], ['warn1'])
    assert.equal(output.svg, '<svg/>')
    assert.equal(output.width, 800)
    assert.equal(output.height, 600)
    assert.equal(output.entityMap['e1'].entityType, 'shape')
    assert.deepEqual(output.animations, [])
    assert.deepEqual(output.warnings, ['warn1'])
  })
})
