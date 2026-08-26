import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { extractSceneJSON, validateExtractedScene, generateScene } from './extractor.js'

// ─── Fixtures ───────────────────────────────────────────────────────────────

const VALID_SCENE = {
  meta: { version: '1.0', title: 'Test' },
  entities: [
    { id: 'circle', type: 'shape', properties: { shape: 'circle', radius: 50, fill: '#4A90D9' } },
  ],
  viewport: { width: 400, height: 300 },
}

const VALID_SCENE_JSON = JSON.stringify(VALID_SCENE)

const INVALID_SCENE = {
  meta: { version: '1.0' },
  entities: [],
}

const NOT_JSON = 'This is not JSON at all, just plain text.'

// ─── extractSceneJSON Tests ─────────────────────────────────────────────────

describe('extractSceneJSON', () => {
  it('parses direct JSON', () => {
    const result = extractSceneJSON(VALID_SCENE_JSON)
    assert.ok(!('code' in result))
    assert.equal(result.method, 'json')
    assert.deepEqual(result.json, VALID_SCENE)
  })

  it('parses JSON with surrounding text', () => {
    const wrapped = `Here is the visualization:\n${VALID_SCENE_JSON}\nDone.`
    const result = extractSceneJSON(wrapped)
    assert.ok(!('code' in result))
    assert.equal(result.method, 'extracted')
  })

  it('parses JSON from markdown code fence', () => {
    const fenced = '```json\n' + VALID_SCENE_JSON + '\n```'
    const result = extractSceneJSON(fenced)
    assert.ok(!('code' in result))
    assert.equal(result.method, 'wrapped')
  })

  it('parses JSON from code fence without language tag', () => {
    const fenced = '```\n' + VALID_SCENE_JSON + '\n```'
    const result = extractSceneJSON(fenced)
    assert.ok(!('code' in result))
    assert.equal(result.method, 'wrapped')
  })

  it('parses JSON with preamble and code fence', () => {
    const text = `Sure! Here is the visualization:\n\n\`\`\`json\n${VALID_SCENE_JSON}\n\`\`\`\n\nLet me know if you need changes.`
    const result = extractSceneJSON(text)
    assert.ok(!('code' in result))
  })

  it('returns error for non-JSON text', () => {
    const result = extractSceneJSON(NOT_JSON)
    assert.ok('code' in result)
    assert.equal(result.code, 'PARSE_FAILED')
  })

  it('returns error for completely malformed JSON', () => {
    const result = extractSceneJSON('{ broken json }}}')
    assert.ok('code' in result)
    assert.equal(result.code, 'PARSE_FAILED')
  })

  it('extracts first JSON object when multiple exist', () => {
    const text = `First: ${VALID_SCENE_JSON}\nSecond: {"other": true}`
    const result = extractSceneJSON(text)
    assert.ok(!('code' in result))
    if (!('code' in result)) {
      const scene = result.json as { meta?: { version?: string } }
      assert.equal(scene.meta?.version, '1.0')
    }
  })

  it('handles whitespace-only input', () => {
    const result = extractSceneJSON('   \n\t  ')
    assert.ok('code' in result)
  })

  it('handles empty input', () => {
    const result = extractSceneJSON('')
    assert.ok('code' in result)
  })
})

// ─── validateExtractedScene Tests ───────────────────────────────────────────

describe('validateExtractedScene', () => {
  it('returns scene when valid', () => {
    const result = validateExtractedScene(VALID_SCENE)
    assert.deepEqual(result, VALID_SCENE)
  })

  it('returns error when entities is empty', () => {
    const result = validateExtractedScene(INVALID_SCENE)
    assert.ok('code' in result)
    assert.equal(result.code, 'VALIDATION_FAILED')
  })

  it('returns error when meta is missing', () => {
    const result = validateExtractedScene({ entities: [{ id: 'a', type: 'shape', properties: {} }] })
    assert.ok('code' in result)
    assert.equal(result.code, 'VALIDATION_FAILED')
  })

  it('returns error when entity type is invalid', () => {
    const doc = {
      meta: { version: '1.0' },
      entities: [{ id: 'a', type: 'invalid_type', properties: {} }],
    }
    const result = validateExtractedScene(doc)
    assert.ok('code' in result)
    assert.equal(result.code, 'VALIDATION_FAILED')
  })
})

// ─── generateScene Tests (Mock Mode) ────────────────────────────────────────

describe('generateScene', () => {
  it('generates scene from mock AI response', async () => {
    const result = await generateScene({
      question: 'Show me a circle',
      mockResponse: VALID_SCENE_JSON,
    })
    assert.equal(result.scene.meta.version, '1.0')
    assert.equal(result.scene.entities.length, 1)
    assert.equal(result.parseMethod, 'json')
  })

  it('generates scene from mock response with preamble', async () => {
    const text = `Here is your visualization:\n\n${VALID_SCENE_JSON}`
    const result = await generateScene({
      question: 'Show me a circle',
      mockResponse: text,
    })
    assert.equal(result.parseMethod, 'extracted')
    assert.equal(result.scene.entities.length, 1)
  })

  it('generates scene from mock response with code fence', async () => {
    const text = '```json\n' + VALID_SCENE_JSON + '\n```'
    const result = await generateScene({
      question: 'Show me a circle',
      mockResponse: text,
    })
    assert.equal(result.parseMethod, 'wrapped')
  })

  it('throws on invalid mock response', async () => {
    await assert.rejects(
      () => generateScene({ question: 'test', mockResponse: 'not json' }),
      (err: Error) => {
        assert.ok('code' in err)
        return true
      },
    )
  })

  it('throws on mock response that fails validation', async () => {
    await assert.rejects(
      () => generateScene({ question: 'test', mockResponse: JSON.stringify(INVALID_SCENE) }),
      (err: Error) => {
        assert.ok('code' in err)
        return true
      },
    )
  })

  it('includes raw response in result', async () => {
    const result = await generateScene({
      question: 'test',
      mockResponse: VALID_SCENE_JSON,
    })
    assert.equal(result.raw, VALID_SCENE_JSON)
  })
})
