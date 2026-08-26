import { describe, it } from 'node:test'
import * as assert from 'node:assert/strict'
import { SvgRenderer } from './renderer.js'
import type { Scene } from '../../ir/types.js'

// ─── Helper ─────────────────────────────────────────────────────────────────

async function renderScene(scene: Scene) {
  const renderer = new SvgRenderer()
  await renderer.initialize()
  const result = await renderer.render({
    scene,
    timestamp: Date.now(),
    request: { scene },
  })
  await renderer.dispose()
  return result
}

// ─── Scene 1: Animated Circle ───────────────────────────────────────────────

describe('integration: animated circle', () => {
  it('renders circle with radius animation', async () => {
    const scene: Scene = {
      meta: { version: '1.0', title: 'Animated Circle' },
      entities: [
        {
          id: 'circle1',
          type: 'shape',
          properties: {
            shape: { value: 'circle' },
            radius: {
              value: 20,
              anim: {
                keyframes: [{ offset: 0, value: 20 }, { offset: 1, value: 50 }],
                duration: 2,
                loop: true,
              },
            },
            fill: { value: '#4A90D9' },
            position: { value: { x: 400, y: 300 } },
          },
        },
        {
          id: 'label1',
          type: 'text',
          properties: {
            text: { value: 'Animated Circle' },
            position: { value: { x: 400, y: 250 } },
            fontSize: { value: 18 },
            textAnchor: { value: 'middle' },
          },
        },
      ],
      viewport: { width: 800, height: 600, background: '#F8F9FA' },
    }

    const result = await renderScene(scene)
    assert.ok(result.success)
    const data = result.output!.data as { svg: string; entityMap: Record<string, unknown>; animations: unknown[] }
    assert.ok(data.svg.includes('circle'))
    assert.ok(data.svg.includes('Animated Circle'))
    assert.ok(data.entityMap['circle1'] !== undefined)
    assert.ok(data.entityMap['label1'] !== undefined)
    assert.ok(data.animations.length > 0)
  })
})

// ─── Scene 2: Coordinate/Graph ──────────────────────────────────────────────

describe('integration: coordinate graph', () => {
  it('renders axes, tick marks, and data points', async () => {
    const scene: Scene = {
      meta: { version: '1.0', title: 'Coordinate Graph' },
      entities: [
        {
          id: 'x-axis',
          type: 'shape',
          properties: {
            shape: { value: 'line' },
            x1: { value: 100 }, y1: { value: 500 },
            x2: { value: 700 }, y2: { value: 500 },
            stroke: { value: '#333333' },
            strokeWidth: { value: 2 },
          },
        },
        {
          id: 'y-axis',
          type: 'shape',
          properties: {
            shape: { value: 'line' },
            x1: { value: 100 }, y1: { value: 500 },
            x2: { value: 100 }, y2: { value: 100 },
            stroke: { value: '#333333' },
            strokeWidth: { value: 2 },
          },
        },
        {
          id: 'data-point-1',
          type: 'shape',
          properties: {
            shape: { value: 'circle' },
            radius: { value: 5 },
            fill: { value: '#E74C3C' },
            position: { value: { x: 200, y: 400 } },
          },
        },
        {
          id: 'data-point-2',
          type: 'shape',
          properties: {
            shape: { value: 'circle' },
            radius: { value: 5 },
            fill: { value: '#E74C3C' },
            position: { value: { x: 400, y: 300 } },
          },
        },
        {
          id: 'data-point-3',
          type: 'shape',
          properties: {
            shape: { value: 'circle' },
            radius: { value: 5 },
            fill: { value: '#E74C3C' },
            position: { value: { x: 600, y: 200 } },
          },
        },
        {
          id: 'x-label',
          type: 'text',
          properties: {
            text: { value: 'X Axis' },
            position: { value: { x: 400, y: 540 } },
            fontSize: { value: 14 },
            textAnchor: { value: 'middle' },
          },
        },
      ],
      viewport: { width: 800, height: 600, background: '#FFFFFF' },
    }

    const result = await renderScene(scene)
    assert.ok(result.success)
    const data = result.output!.data as { svg: string; entityMap: Record<string, unknown> }
    assert.ok(data.svg.includes('<line'))
    assert.ok(data.svg.includes('circle'))
    assert.ok(data.entityMap['x-axis'] !== undefined)
    assert.ok(data.entityMap['data-point-1'] !== undefined)
    assert.ok(data.entityMap['data-point-2'] !== undefined)
    assert.ok(data.entityMap['data-point-3'] !== undefined)
  })
})

// ─── Scene 3: Projectile Motion ─────────────────────────────────────────────

describe('integration: projectile motion', () => {
  it('renders parabolic path with arrows and labels', async () => {
    const scene: Scene = {
      meta: { version: '1.0', title: 'Projectile Motion' },
      entities: [
        {
          id: 'ground',
          type: 'shape',
          properties: {
            shape: { value: 'line' },
            x1: { value: 50 }, y1: { value: 500 },
            x2: { value: 750 }, y2: { value: 500 },
            stroke: { value: '#8B4513' },
            strokeWidth: { value: 3 },
          },
        },
        {
          id: 'path',
          type: 'shape',
          properties: {
            shape: { value: 'path' },
            d: { value: 'M 100 500 Q 400 100 700 500' },
            stroke: { value: '#3498DB' },
            strokeWidth: { value: 2 },
            fill: { value: 'none' },
          },
        },
        {
          id: 'projectile',
          type: 'shape',
          properties: {
            shape: { value: 'circle' },
            radius: { value: 8 },
            fill: { value: '#E74C3C' },
            position: { value: { x: 100, y: 500 } },
          },
        },
        {
          id: 'vel-arrow',
          type: 'shape',
          properties: {
            shape: { value: 'arrow' },
            x1: { value: 100 }, y1: { value: 500 },
            x2: { value: 150 }, y2: { value: 400 },
            stroke: { value: '#2ECC71' },
            strokeWidth: { value: 2 },
          },
        },
        {
          id: 'title',
          type: 'text',
          properties: {
            text: { value: 'Projectile Motion' },
            position: { value: { x: 400, y: 40 } },
            fontSize: { value: 20 },
            textAnchor: { value: 'middle' },
            fill: { value: '#2C3E50' },
          },
        },
      ],
      viewport: { width: 800, height: 600, background: '#F8F9FA' },
    }

    const result = await renderScene(scene)
    assert.ok(result.success)
    const data = result.output!.data as { svg: string; entityMap: Record<string, unknown> }
    assert.ok(data.svg.includes('<path'))
    assert.ok(data.svg.includes('<line'))
    assert.ok(data.svg.includes('Projectile Motion'))
    assert.ok(data.entityMap['ground'] !== undefined)
    assert.ok(data.entityMap['projectile'] !== undefined)
    assert.ok(data.entityMap['vel-arrow'] !== undefined)
  })
})

// ─── Scene 4: Cell Diagram (Hierarchical) ───────────────────────────────────

describe('integration: cell diagram', () => {
  it('renders hierarchical containment', async () => {
    const scene: Scene = {
      meta: { version: '1.0', title: 'Cell Diagram' },
      entities: [
        {
          id: 'cell',
          type: 'group',
          name: 'Cell',
          properties: {
            position: { value: { x: 400, y: 300 } },
            width: { value: 500 },
            height: { value: 400 },
            fill: { value: '#E8F5E9' },
            stroke: { value: '#4CAF50' },
            strokeWidth: { value: 2 },
          },
        },
        {
          id: 'nucleus',
          type: 'group',
          name: 'Nucleus',
          properties: {
            position: { value: { x: 0, y: -50 } },
            width: { value: 120 },
            height: { value: 100 },
            fill: { value: '#BBDEFB' },
            stroke: { value: '#2196F3' },
            strokeWidth: { value: 2 },
          },
        },
        {
          id: 'nucleus-label',
          type: 'text',
          properties: {
            text: { value: 'Nucleus' },
            position: { value: { x: 0, y: 0 } },
            fontSize: { value: 14 },
            textAnchor: { value: 'middle' },
          },
        },
        {
          id: 'mitochondria',
          type: 'shape',
          name: 'Mitochondria',
          properties: {
            shape: { value: 'ellipse' },
            radius: { value: 40 },
            height: { value: 20 },
            fill: { value: '#FFCCBC' },
            stroke: { value: '#FF5722' },
            position: { value: { x: 150, y: 100 } },
          },
        },
        {
          id: 'membrane-label',
          type: 'text',
          properties: {
            text: { value: 'Cell Membrane' },
            position: { value: { x: 0, y: -220 } },
            fontSize: { value: 16 },
            textAnchor: { value: 'middle' },
            fill: { value: '#4CAF50' },
          },
        },
      ],
      relationships: [
        { type: 'containment', from: 'cell', to: 'nucleus' },
        { type: 'containment', from: 'cell', to: 'mitochondria' },
        { type: 'containment', from: 'cell', to: 'nucleus-label' },
      ],
      viewport: { width: 800, height: 600, background: '#FFFFFF' },
    }

    const result = await renderScene(scene)
    assert.ok(result.success)
    const data = result.output!.data as { svg: string; entityMap: Record<string, unknown> }
    assert.ok(data.entityMap['cell'] !== undefined)
    assert.ok(data.entityMap['nucleus'] !== undefined)
    assert.ok(data.entityMap['mitochondria'] !== undefined)
  })
})

// ─── Scene 5: Aircraft Subsystem ────────────────────────────────────────────

describe('integration: aircraft subsystem', () => {
  it('renders connected abstract boxes', async () => {
    const scene: Scene = {
      meta: { version: '1.0', title: 'Aircraft Subsystem' },
      entities: [
        {
          id: 'engine',
          type: 'abstract',
          name: 'Engine',
          properties: {
            position: { value: { x: 200, y: 300 } },
            width: { value: 120 },
            height: { value: 80 },
            fill: { value: '#E3F2FD' },
            stroke: { value: '#1565C0' },
            strokeWidth: { value: 2 },
            label: { value: 'Engine' },
          },
        },
        {
          id: 'fuel-system',
          type: 'abstract',
          name: 'Fuel System',
          properties: {
            position: { value: { x: 500, y: 200 } },
            width: { value: 120 },
            height: { value: 80 },
            fill: { value: '#FFF3E0' },
            stroke: { value: '#E65100' },
            strokeWidth: { value: 2 },
            label: { value: 'Fuel System' },
          },
        },
        {
          id: 'control-unit',
          type: 'abstract',
          name: 'Control Unit',
          properties: {
            position: { value: { x: 500, y: 400 } },
            width: { value: 120 },
            height: { value: 80 },
            fill: { value: '#F3E5F5' },
            stroke: { value: '#7B1FA2' },
            strokeWidth: { value: 2 },
            label: { value: 'Control Unit' },
          },
        },
        {
          id: 'title',
          type: 'text',
          properties: {
            text: { value: 'Aircraft Engine Subsystem' },
            position: { value: { x: 400, y: 60 } },
            fontSize: { value: 20 },
            textAnchor: { value: 'middle' },
            fill: { value: '#212121' },
          },
        },
      ],
      relationships: [
        { type: 'edge', from: 'fuel-system', to: 'engine', label: 'fuel supply' },
        { type: 'edge', from: 'control-unit', to: 'engine', label: 'control signals' },
      ],
      viewport: { width: 800, height: 600, background: '#FAFAFA' },
    }

    const result = await renderScene(scene)
    assert.ok(result.success)
    const data = result.output!.data as { svg: string; entityMap: Record<string, unknown> }
    assert.ok(data.svg.includes('Engine') || data.svg.includes('Fuel System'))
    assert.ok(data.entityMap['engine'] !== undefined)
    assert.ok(data.entityMap['fuel-system'] !== undefined)
    assert.ok(data.entityMap['control-unit'] !== undefined)
  })
})

// ─── Scene 6: LLM Architecture ──────────────────────────────────────────────

describe('integration: LLM architecture', () => {
  it('renders grouped layers with multiple edges', async () => {
    const scene: Scene = {
      meta: { version: '1.0', title: 'LLM Architecture' },
      entities: [
        {
          id: 'input-layer',
          type: 'group',
          name: 'Input Layer',
          properties: {
            position: { value: { x: 150, y: 300 } },
            width: { value: 100 },
            height: { value: 300 },
            fill: { value: '#E8EAF6' },
            stroke: { value: '#3F51B5' },
            strokeWidth: { value: 2 },
          },
        },
        {
          id: 'input-token',
          type: 'shape',
          properties: {
            shape: { value: 'rect' },
            position: { value: { x: 0, y: -100 } },
            width: { value: 60 },
            height: { value: 30 },
            fill: { value: '#C5CAE9' },
            stroke: { value: '#3F51B5' },
          },
        },
        {
          id: 'embedding',
          type: 'shape',
          properties: {
            shape: { value: 'rect' },
            position: { value: { x: 0, y: 0 } },
            width: { value: 60 },
            height: { value: 30 },
            fill: { value: '#C5CAE9' },
            stroke: { value: '#3F51B5' },
          },
        },
        {
          id: 'transformer-layer',
          type: 'group',
          name: 'Transformer Block',
          properties: {
            position: { value: { x: 400, y: 300 } },
            width: { value: 150 },
            height: { value: 300 },
            fill: { value: '#E8F5E9' },
            stroke: { value: '#4CAF50' },
            strokeWidth: { value: 2 },
          },
        },
        {
          id: 'attention',
          type: 'shape',
          properties: {
            shape: { value: 'rect' },
            position: { value: { x: 0, y: -80 } },
            width: { value: 100 },
            height: { value: 40 },
            fill: { value: '#C8E6C9' },
            stroke: { value: '#4CAF50' },
          },
        },
        {
          id: 'ffn',
          type: 'shape',
          properties: {
            shape: { value: 'rect' },
            position: { value: { x: 0, y: 20 } },
            width: { value: 100 },
            height: { value: 40 },
            fill: { value: '#C8E6C9' },
            stroke: { value: '#4CAF50' },
          },
        },
        {
          id: 'output-layer',
          type: 'group',
          name: 'Output Layer',
          properties: {
            position: { value: { x: 650, y: 300 } },
            width: { value: 100 },
            height: { value: 300 },
            fill: { value: '#FFF3E0' },
            stroke: { value: '#FF9800' },
            strokeWidth: { value: 2 },
          },
        },
        {
          id: 'output-token',
          type: 'shape',
          properties: {
            shape: { value: 'rect' },
            position: { value: { x: 0, y: 0 } },
            width: { value: 60 },
            height: { value: 30 },
            fill: { value: '#FFE0B2' },
            stroke: { value: '#FF9800' },
          },
        },
        {
          id: 'title',
          type: 'text',
          properties: {
            text: { value: 'LLM Architecture' },
            position: { value: { x: 400, y: 50 } },
            fontSize: { value: 22 },
            textAnchor: { value: 'middle' },
            fill: { value: '#212121' },
          },
        },
      ],
      relationships: [
        { type: 'containment', from: 'input-layer', to: 'input-token' },
        { type: 'containment', from: 'input-layer', to: 'embedding' },
        { type: 'containment', from: 'transformer-layer', to: 'attention' },
        { type: 'containment', from: 'transformer-layer', to: 'ffn' },
        { type: 'containment', from: 'output-layer', to: 'output-token' },
        { type: 'edge', from: 'input-layer', to: 'transformer-layer', label: 'hidden states' },
        { type: 'edge', from: 'transformer-layer', to: 'output-layer', label: 'logits' },
      ],
      viewport: { width: 800, height: 600, background: '#FAFAFA' },
    }

    const result = await renderScene(scene)
    assert.ok(result.success)
    const data = result.output!.data as { svg: string; entityMap: Record<string, unknown> }
    assert.ok(data.svg.includes('LLM Architecture'))
    assert.ok(data.entityMap['input-layer'] !== undefined)
    assert.ok(data.entityMap['transformer-layer'] !== undefined)
    assert.ok(data.entityMap['output-layer'] !== undefined)
    assert.ok(data.entityMap['attention'] !== undefined)
    assert.ok(data.entityMap['ffn'] !== undefined)
  })
})

// ─── Renderer Metadata Tests ────────────────────────────────────────────────

describe('renderer metadata', () => {
  it('has correct renderer info', () => {
    const renderer = new SvgRenderer()
    assert.equal(renderer.info.id, 'svg-2d')
    assert.equal(renderer.info.name, 'SVG 2D Renderer')
    assert.equal(renderer.info.version, '0.1.0')
  })

  it('declares correct capabilities', () => {
    const renderer = new SvgRenderer()
    assert.ok(renderer.capabilities.entityTypes.includes('shape'))
    assert.ok(renderer.capabilities.entityTypes.includes('text'))
    assert.ok(renderer.capabilities.entityTypes.includes('group'))
    assert.ok(renderer.capabilities.entityTypes.includes('data'))
    assert.ok(!renderer.capabilities.entityTypes.includes('graph'))
    assert.ok(!renderer.capabilities.entityTypes.includes('connection'))
    assert.ok(!renderer.capabilities.entityTypes.includes('abstract'))
    assert.ok(renderer.capabilities.relationshipTypes.includes('edge'))
    assert.ok(renderer.capabilities.relationshipTypes.includes('containment'))
    assert.ok(renderer.capabilities.features.includes('2d'))
    assert.ok(renderer.capabilities.features.includes('animations'))
    assert.ok(renderer.capabilities.features.includes('interactions'))
  })

  it('canRender returns true for 2D scenes', async () => {
    const renderer = new SvgRenderer()
    await renderer.initialize()
    const scene: Scene = {
      meta: { version: '1.0', title: 'Test' },
      entities: [{ id: 'e1', type: 'shape', properties: {} }],
    }
    assert.equal(renderer.canRender(scene), true)
  })

  it('handles minimal scene', async () => {
    const scene: Scene = {
      meta: { version: '1.0', title: 'Minimal' },
      entities: [{ id: 'e1', type: 'shape', properties: { shape: { value: 'circle' } } }],
    }
    const result = await renderScene(scene)
    assert.ok(result.success)
    const data = result.output!.data as { svg: string }
    assert.ok(data.svg.includes('<svg'))
  })
})
