import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { SYSTEM_PROMPT, buildGenerationPrompt } from './prompts.js'

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

    it('is under 4000 tokens (rough estimate: ~4 chars per token)', () => {
      assert.ok(SYSTEM_PROMPT.length < 16000, `prompt too long: ${SYSTEM_PROMPT.length} chars`)
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
})
