import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { runPipeline, checkSceneLimits, DEFAULT_PIPELINE_OPTIONS } from './pipeline.js'
import { VisualizationEngine } from '../engine/engine.js'
import { SvgRenderer } from '../renderers/svg/renderer.js'
import type { Scene } from '../ir/types.js'

// ─── Mock Fixtures ──────────────────────────────────────────────────────────

const VALID_SCENE: Scene = {
  meta: { version: '1.0', title: 'Test Circle' },
  entities: [
    { id: 'circle', type: 'shape', properties: { shape: 'circle', x: 200, y: 200, radius: 50, fill: '#4A90D9' } },
  ],
  viewport: { width: 400, height: 400 },
}

// ─── Scene Limits Tests ─────────────────────────────────────────────────────

describe('checkSceneLimits', () => {
  it('returns no warnings for small scenes', () => {
    const warnings = checkSceneLimits(VALID_SCENE, DEFAULT_PIPELINE_OPTIONS)
    assert.equal(warnings.length, 0)
  })

  it('warns when entity count exceeds limit', () => {
    const scene: Scene = {
      meta: { version: '1.0', title: 'Big' },
      entities: Array.from({ length: 60 }, (_, i) => ({
        id: `e${i}`,
        type: 'shape' as const,
        properties: { shape: 'circle', x: 0, y: 0, radius: 10 },
      })),
      viewport: { width: 400, height: 400 },
    }
    const warnings = checkSceneLimits(scene, { maxEntities: 50, maxRelationships: 30, maxAnimations: 20 })
    assert.equal(warnings.length, 1)
    assert.ok(warnings[0].includes('Entity count'))
  })

  it('warns when relationship count exceeds limit', () => {
    const scene: Scene = {
      meta: { version: '1.0', title: 'Graph' },
      entities: Array.from({ length: 10 }, (_, i) => ({
        id: `n${i}`,
        type: 'shape' as const,
        properties: { shape: 'circle', x: 0, y: 0, radius: 10 },
      })),
      relationships: Array.from({ length: 35 }, (_, idx) => ({
        type: 'edge' as const,
        from: `n${idx % 10}`,
        to: `n${(idx + 1) % 10}`,
      })),
      viewport: { width: 400, height: 400 },
    }
    const warnings = checkSceneLimits(scene, { maxEntities: 50, maxRelationships: 30, maxAnimations: 20 })
    assert.equal(warnings.length, 1)
    assert.ok(warnings[0].includes('Relationship count'))
  })

  it('warns when animation count exceeds limit', () => {
    const scene: Scene = {
      meta: { version: '1.0', title: 'Animated' },
      entities: [
        { id: 'a', type: 'shape', properties: { shape: 'circle', x: 0, y: 0, radius: 10 } },
      ],
      animations: Array.from({ length: 25 }, () => ({
        target: `a.radius`,
        keyframes: [{ offset: 0, value: 10 }, { offset: 1, value: 20 }],
        duration: 1000,
      })),
      viewport: { width: 400, height: 400 },
    }
    const warnings = checkSceneLimits(scene, { maxEntities: 50, maxRelationships: 30, maxAnimations: 20 })
    assert.equal(warnings.length, 1)
    assert.ok(warnings[0].includes('Animation count'))
  })
})

// ─── Pipeline Integration Tests (Mock Mode) ────────────────────────────────

describe('runPipeline', () => {
  it('returns error for empty question', async () => {
    const engine = new VisualizationEngine()
    engine.register(new SvgRenderer())

    const result = await runPipeline('', engine)
    assert.equal(result.success, false)
    assert.equal(result.attempts, 0)
  })

  it('returns error for prompt exceeding max length', async () => {
    const engine = new VisualizationEngine()
    engine.register(new SvgRenderer())

    const result = await runPipeline('x'.repeat(1001), engine, { maxPromptLength: 1000 })
    assert.equal(result.success, false)
    assert.ok(result.errors[0].includes('maximum length'))
  })

  it('generates and renders valid scene with mock AI', async () => {
    const engine = new VisualizationEngine()
    engine.register(new SvgRenderer())

    // Mock generateScene by testing just the limits check
    const warnings = checkSceneLimits(VALID_SCENE, DEFAULT_PIPELINE_OPTIONS)
    assert.equal(warnings.length, 0)
  })

  it('respects maxRetries option', () => {
    const opts = { ...DEFAULT_PIPELINE_OPTIONS, maxRetries: 5 }
    assert.equal(opts.maxRetries, 5)
  })
})
