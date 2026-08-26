import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { VisualizationEngine } from './engine/engine.js'
import { SvgRenderer } from './renderers/svg/renderer.js'
import { examples } from './playground/examples/index.js'
import type { SvgSceneOutput } from './renderers/svg/types.js'

// ─── Engine Setup ────────────────────────────────────────────────────────────

function createEngine(): VisualizationEngine {
  const engine = new VisualizationEngine()
  engine.register(new SvgRenderer())
  return engine
}

// ─── Example Loading ─────────────────────────────────────────────────────────

describe('Playground Examples', () => {
  it('exports exactly 6 examples', () => {
    assert.equal(examples.length, 6)
  })

  it('each example has required fields', () => {
    for (const example of examples) {
      assert.ok(example.title, `Example missing title`)
      assert.ok(typeof example.title === 'string', `Title should be string`)
      assert.ok(Array.isArray(example.tags), `Tags should be array`)
      assert.ok(example.scene, `Example missing scene`)
      assert.ok(example.scene.meta, `Scene missing meta`)
      assert.ok(example.scene.meta.version, `Scene meta missing version`)
      assert.ok(example.scene.entities.length > 0, `Scene should have entities`)
    }
  })

  it('example titles are unique', () => {
    const titles = examples.map(e => e.title)
    const unique = new Set(titles)
    assert.equal(unique.size, titles.length, 'Example titles must be unique')
  })

  it('each example has at least one tag', () => {
    for (const example of examples) {
      assert.ok(example.tags.length > 0, `"${example.title}" should have at least one tag`)
    }
  })
})

// ─── Engine Pipeline ─────────────────────────────────────────────────────────

describe('Engine Pipeline with Examples', () => {
  const engine = createEngine()

  for (const example of examples) {
    it(`renders "${example.title}" successfully`, async () => {
      const result = await engine.render({
        scene: example.scene,
        target: 'svg-2d',
      })

      assert.equal(result.success, true, `Render failed: ${result.errors.map(e => e.message).join('; ')}`)
      assert.equal(result.metadata.rendererId, 'svg-2d')
      assert.ok(result.metadata.renderTimeMs >= 0, 'Render time should be non-negative')
    })

    it(`"${example.title}" produces valid SVG output`, async () => {
      const result = await engine.render({
        scene: example.scene,
        target: 'svg-2d',
      })

      assert.equal(result.success, true)
      assert.ok(result.output, 'Output should exist')
      assert.equal(result.output!.kind, 'scene')

      const output = result.output!.data as SvgSceneOutput
      assert.ok(output.svg, 'SVG string should exist')
      assert.ok(output.svg.length > 0, 'SVG string should not be empty')
      assert.ok(output.svg.includes('<svg'), 'SVG should contain <svg> tag')
      assert.ok(output.svg.includes('</svg>'), 'SVG should contain closing </svg> tag')
      assert.ok(output.width > 0, 'Width should be positive')
      assert.ok(output.height > 0, 'Height should be positive')
    })

    it(`"${example.title}" maps entities correctly`, async () => {
      const result = await engine.render({
        scene: example.scene,
        target: 'svg-2d',
      })

      assert.equal(result.success, true)
      const output = result.output!.data as SvgSceneOutput
      assert.ok(output.entityMap, 'Entity map should exist')

      const mappedIds = Object.keys(output.entityMap)
      assert.ok(mappedIds.length > 0, 'At least one entity should be mapped')
    })
  }
})

// ─── Specific Scene Validation ───────────────────────────────────────────────

describe('Scene-Specific Checks', () => {
  const engine = createEngine()

  it('Animated Circle has animation metadata', async () => {
    const circleExample = examples.find(e => e.title === 'Animated Circle')!
    assert.ok(circleExample, 'Animated Circle example should exist')

    const result = await engine.render({ scene: circleExample.scene, target: 'svg-2d' })
    assert.equal(result.success, true)

    const output = result.output!.data as SvgSceneOutput
    assert.ok(output.animations.length > 0, 'Should have animation metadata')
    assert.equal(output.animations[0].entityId, 'circle')
  })

  it('Coordinate Axes has multiple entities', async () => {
    const axesExample = examples.find(e => e.title === 'Coordinate Axes with Curve')!
    assert.ok(axesExample, 'Coordinate Axes example should exist')

    const result = await engine.render({ scene: axesExample.scene, target: 'svg-2d' })
    assert.equal(result.success, true)

    const output = result.output!.data as SvgSceneOutput
    const mappedIds = Object.keys(output.entityMap)
    assert.ok(mappedIds.length >= 5, 'Should have at least 5 entities mapped')
  })

  it('Cell Hierarchy has many entities', async () => {
    const cellExample = examples.find(e => e.title === 'Cell Structure')!
    assert.ok(cellExample, 'Cell Structure example should exist')

    const result = await engine.render({ scene: cellExample.scene, target: 'svg-2d' })
    assert.equal(result.success, true)

    const output = result.output!.data as SvgSceneOutput
    const mappedIds = Object.keys(output.entityMap)
    assert.ok(mappedIds.length >= 5, 'Should have at least 5 entities mapped')
  })

  it('Aircraft Subsystems has relationships rendered', async () => {
    const aircraftExample = examples.find(e => e.title === 'Aircraft Subsystems')!
    assert.ok(aircraftExample, 'Aircraft Subsystems example should exist')
    assert.ok(aircraftExample.scene.relationships, 'Should have relationships')
    assert.ok(aircraftExample.scene.relationships!.length > 0, 'Should have at least one relationship')

    const result = await engine.render({ scene: aircraftExample.scene, target: 'svg-2d' })
    assert.equal(result.success, true)

    const output = result.output!.data as SvgSceneOutput
    assert.ok(output.svg.includes('data-layer="relationships"'), 'SVG should contain relationships layer')
  })

  it('LLM Architecture has correct viewport dimensions', async () => {
    const llmExample = examples.find(e => e.title === 'LLM Transformer Architecture')!
    assert.ok(llmExample, 'LLM Architecture example should exist')

    const result = await engine.render({ scene: llmExample.scene, target: 'svg-2d' })
    assert.equal(result.success, true)

    const output = result.output!.data as SvgSceneOutput
    assert.equal(output.width, 800)
    assert.equal(output.height, 600)
  })
})

// ─── Error Handling ──────────────────────────────────────────────────────────

describe('Error Handling', () => {
  const engine = createEngine()

  it('handles empty entities gracefully', async () => {
    const result = await engine.render({
      scene: {
        meta: { version: '1.0', title: 'Empty' },
        entities: [],
      },
      target: 'svg-2d',
    })

    assert.equal(result.success, false)
    assert.ok(result.errors.length > 0, 'Should have errors')
  })

  it('handles invalid scene gracefully', async () => {
    const result = await engine.render({
      scene: {
        meta: { version: '1.0', title: 'Invalid' },
        entities: [{ id: 'test', type: 'shape' as const, properties: {} }],
      },
      target: 'svg-2d',
    })

    assert.equal(result.success, true)
  })

  it('returns correct metadata on failure', async () => {
    const result = await engine.render({
      scene: {
        meta: { version: '1.0', title: 'Empty' },
        entities: [],
      },
      target: 'svg-2d',
    })

    assert.equal(result.success, false)
    assert.equal(result.metadata.rendererId, 'none')
    assert.ok(result.metadata.renderTimeMs >= 0)
  })
})

// ─── SVG Content Validation ──────────────────────────────────────────────────

describe('SVG Content Quality', () => {
  const engine = createEngine()

  for (const example of examples) {
    it(`"${example.title}" SVG has proper namespace`, async () => {
      const result = await engine.render({ scene: example.scene, target: 'svg-2d' })
      assert.equal(result.success, true)

      const output = result.output!.data as SvgSceneOutput
      assert.ok(output.svg.includes('xmlns="http://www.w3.org/2000/svg"'), 'SVG should have xmlns')
    })

    it(`"${example.title}" SVG has viewBox`, async () => {
      const result = await engine.render({ scene: example.scene, target: 'svg-2d' })
      assert.equal(result.success, true)

      const output = result.output!.data as SvgSceneOutput
      assert.ok(output.svg.includes('viewBox'), 'SVG should have viewBox')
    })

    it(`"${example.title}" SVG has background rect`, async () => {
      const result = await engine.render({ scene: example.scene, target: 'svg-2d' })
      assert.equal(result.success, true)

      const output = result.output!.data as SvgSceneOutput
      assert.ok(output.svg.includes('<rect'), 'SVG should have a background rect')
    })
  }
})
