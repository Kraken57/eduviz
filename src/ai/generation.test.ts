import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { generateScene } from './extractor.js'
import { VisualizationEngine } from '../engine/engine.js'
import { SvgRenderer } from '../renderers/svg/renderer.js'

// ─── Mock Scene Fixtures ────────────────────────────────────────────────────

const MOCK_SCENES = {
  animatedCircle: JSON.stringify({
    meta: { version: '1.0', title: 'Animated Circle' },
    entities: [
      {
        id: 'circle',
        type: 'shape',
        properties: {
          shape: 'circle',
          x: 200,
          y: 200,
          radius: 80,
          fill: '#2196f3',
          stroke: '#1565c0',
          strokeWidth: 3,
        },
      },
      {
        id: 'label',
        type: 'text',
        properties: { text: 'Animated Circle', x: 200, y: 300, fontSize: 16, fill: '#333' },
      },
    ],
    viewport: { width: 400, height: 400 },
  }),

  cellHierarchy: JSON.stringify({
    meta: { version: '1.0', title: 'Animal Cell' },
    entities: [
      {
        id: 'cell',
        type: 'group',
        name: 'Animal Cell',
        properties: { shape: 'ellipse', width: 250, height: 180, fill: '#F0F8FF', stroke: '#2C3E50' },
      },
      {
        id: 'nucleus',
        type: 'group',
        name: 'Nucleus',
        properties: { shape: 'circle', radius: 45, fill: '#9B59B6', x: 0, y: 0 },
      },
      {
        id: 'membrane',
        type: 'shape',
        name: 'Cell Membrane',
        properties: { shape: 'ellipse', width: 250, height: 180, fill: 'none', stroke: '#2C3E50' },
      },
    ],
    relationships: [
      { type: 'containment', from: 'cell', to: 'nucleus' },
    ],
    viewport: { width: 400, height: 300 },
  }),

  projectileMotion: JSON.stringify({
    meta: { version: '1.0', title: 'Projectile Motion' },
    variables: { gravity: 9.81 },
    entities: [
      {
        id: 'particle',
        type: 'abstract',
        properties: { mass: 1.0, position: { x: 0, y: 0 }, velocity: { x: 15, y: 25 } },
      },
      {
        id: 'ground',
        type: 'shape',
        properties: { shape: 'line', x1: -50, y1: 0, x2: 300, y2: 0, stroke: '#8B4513', strokeWidth: 3 },
      },
    ],
    relationships: [
      { type: 'constraint', from: 'particle', to: 'ground', label: 'subject to gravity' },
    ],
    animations: [
      {
        target: 'particle.position',
        keyframes: [
          { offset: 0, value: { x: 0, y: 0 } },
          { offset: 1, value: { x: 75, y: 0 } },
        ],
        duration: 5100,
        easing: 'linear',
      },
    ],
    viewport: { width: 500, height: 300 },
  }),
}

// ─── Integration Tests ──────────────────────────────────────────────────────

describe('AI → Renderer Integration', () => {
  it('generates circle scene and renders to SVG', async () => {
    const result = await generateScene({
      question: 'Show me a circle',
      mockResponse: MOCK_SCENES.animatedCircle,
    })

    assert.equal(result.scene.meta.title, 'Animated Circle')
    assert.equal(result.scene.entities.length, 2)

    const engine = new VisualizationEngine()
    engine.register(new SvgRenderer())

    const renderResult = await engine.render({ scene: result.scene, target: 'svg-2d' })
    assert.equal(renderResult.success, true)
    assert.ok(renderResult.output?.kind === 'scene')
  })

  it('generates cell hierarchy and renders to SVG', async () => {
    const result = await generateScene({
      question: 'Draw an animal cell',
      mockResponse: MOCK_SCENES.cellHierarchy,
    })

    assert.equal(result.scene.meta.title, 'Animal Cell')
    assert.equal(result.scene.relationships?.length, 1)

    const engine = new VisualizationEngine()
    engine.register(new SvgRenderer())

    const renderResult = await engine.render({ scene: result.scene, target: 'svg-2d' })
    assert.equal(renderResult.success, true)
  })

  it('generates projectile motion scene and renders to SVG', async () => {
    const result = await generateScene({
      question: 'Show me projectile motion',
      mockResponse: MOCK_SCENES.projectileMotion,
    })

    assert.equal(result.scene.meta.title, 'Projectile Motion')
    assert.equal(result.scene.animations?.length, 1)
    assert.equal(result.scene.relationships?.length, 1)

    const engine = new VisualizationEngine()
    engine.register(new SvgRenderer())

    const renderResult = await engine.render({ scene: result.scene, target: 'svg-2d' })
    assert.equal(renderResult.success, true)
  })

  it('reports parse method for each response type', async () => {
    const jsonResult = await generateScene({ question: 'test', mockResponse: MOCK_SCENES.animatedCircle })
    assert.equal(jsonResult.parseMethod, 'json')

    const extractedResult = await generateScene({
      question: 'test',
      mockResponse: 'Here it is:\n' + MOCK_SCENES.animatedCircle,
    })
    assert.equal(extractedResult.parseMethod, 'extracted')

    const wrappedResult = await generateScene({
      question: 'test',
      mockResponse: '```json\n' + MOCK_SCENES.animatedCircle + '\n```',
    })
    assert.equal(wrappedResult.parseMethod, 'wrapped')
  })
})
