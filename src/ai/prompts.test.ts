import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { SYSTEM_PROMPT, buildGenerationPrompt, buildRetryPrompt, buildContextualPrompt } from './prompts.js'

describe('AI Prompts', () => {
  describe('SYSTEM_PROMPT', () => {
    it('contains all 7 entity types', () => {
      const types = ['shape', 'text', 'data', 'graph', 'connection', 'abstract', 'group']
      for (const t of types) {
        assert.ok(SYSTEM_PROMPT.includes(`"${t}"`), `missing entity type: ${t}`)
      }
    })

    it('contains all 4 relationship types', () => {
      const types = ['edge', 'containment', 'constraint', 'reference']
      for (const t of types) {
        assert.ok(SYSTEM_PROMPT.includes(`"${t}"`), `missing relationship type: ${t}`)
      }
    })

    it('contains property conventions', () => {
      assert.ok(SYSTEM_PROMPT.includes('x'), 'missing x property')
      assert.ok(SYSTEM_PROMPT.includes('y'), 'missing y property')
      assert.ok(SYSTEM_PROMPT.includes('fill'), 'missing fill property')
      assert.ok(SYSTEM_PROMPT.includes('stroke'), 'missing stroke property')
    })

    it('contains an example JSON', () => {
      assert.ok(SYSTEM_PROMPT.includes('"meta"'), 'missing meta in example')
      assert.ok(SYSTEM_PROMPT.includes('"entities"'), 'missing entities in example')
      assert.ok(SYSTEM_PROMPT.includes('"viewport"'), 'missing viewport in example')
    })

    it('instructs to output only JSON', () => {
      assert.ok(
        SYSTEM_PROMPT.includes('ONLY valid JSON') || SYSTEM_PROMPT.includes('Output ONLY'),
        'missing JSON-only instruction',
      )
    })

    it('contains animation instructions with explicit examples', () => {
      assert.ok(SYSTEM_PROMPT.includes('keyframes'), 'missing keyframes instruction')
      assert.ok(SYSTEM_PROMPT.includes('Pulsing Circle'), 'missing pulsing circle example')
      assert.ok(SYSTEM_PROMPT.includes('Moving Ball'), 'missing moving ball example')
    })

    it('is under 4000 tokens (rough estimate: ~4 chars per token)', () => {
      assert.ok(SYSTEM_PROMPT.length < 16000, `prompt too long: ${SYSTEM_PROMPT.length} chars`)
    })

    it('contains 3D example with perspective camera', () => {
      assert.ok(SYSTEM_PROMPT.includes('perspective'), 'missing perspective camera example')
      assert.ok(SYSTEM_PROMPT.includes('Water Molecule'), 'missing 3D example title')
    })

    it('mentions entity limit rule', () => {
      assert.ok(SYSTEM_PROMPT.includes('50 entities'), 'missing 50 entity limit rule')
    })
  })

  describe('buildGenerationPrompt', () => {
    it('returns the question as-is when no context', () => {
      const result = buildGenerationPrompt('Show me a circle')
      assert.equal(result, 'Show me a circle')
    })

    it('includes context when provided', () => {
      const result = buildGenerationPrompt('What is this?', 'A biology diagram')
      assert.ok(result.includes('A biology diagram'))
      assert.ok(result.includes('What is this?'))
      assert.ok(result.includes('Context:'))
    })

    it('handles empty context', () => {
      const result = buildGenerationPrompt('question', '')
      assert.equal(result, 'question')
    })

    it('handles empty question', () => {
      const result = buildGenerationPrompt('', 'context')
      assert.ok(result.includes('context'))
    })
  })

  describe('buildRetryPrompt', () => {
    it('includes error messages', () => {
      const errors = [
        { path: '$.entities[0].id', message: 'must be a non-empty string' },
        { path: '$.entities[1].type', message: 'must be one of: shape, text' },
      ]
      const result = buildRetryPrompt('question', '{"meta":{}}', errors)
      assert.ok(result.includes('must be a non-empty string'))
      assert.ok(result.includes('must be one of: shape, text'))
      assert.ok(result.includes('Fix these errors'))
    })

    it('includes previous response', () => {
      const result = buildRetryPrompt('q', '{"bad":"json"}', [{ path: '$.x', message: 'bad' }])
      assert.ok(result.includes('{"bad":"json"}'))
    })
  })

  describe('buildContextualPrompt', () => {
    it('returns question as-is when no context', () => {
      const result = buildContextualPrompt('Show me a circle')
      assert.equal(result, 'Show me a circle')
    })

    it('includes history when provided', () => {
      const context = [
        { question: 'Show a circle', title: 'Circle' },
        { question: 'Make it bigger', title: 'Big Circle' },
      ]
      const result = buildContextualPrompt('Add a label', context)
      assert.ok(result.includes('Previous context:'))
      assert.ok(result.includes('Show a circle'))
      assert.ok(result.includes('Circle'))
      assert.ok(result.includes('Add a label'))
    })

    it('limits context to recent entries', () => {
      const context = [
        { question: 'q1', title: 't1' },
        { question: 'q2', title: 't2' },
        { question: 'q3', title: 't3' },
      ]
      const result = buildContextualPrompt('q4', context)
      assert.ok(result.includes('q4'))
    })
  })
})
