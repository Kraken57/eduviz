import { describe, it, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import {
  setOllamaConfig,
  getOllamaConfig,
  setFetchModule,
  checkHealth,
  generate,
  generateStream,
} from './ollama-client.js'
import { DEFAULT_CONFIG } from './types.js'

// ─── Mock Fetch ─────────────────────────────────────────────────────────────

function mockFetch(responses: Array<{ status: number; body: unknown }>) {
  let callIndex = 0
  const calls: Array<{ url: string; init: RequestInit }> = []

  const fakeFetch = async (url: string | URL | Request, init?: RequestInit): Promise<Response> => {
    calls.push({ url: String(url), init: init ?? {} })
    const res = responses[Math.min(callIndex, responses.length - 1)]
    callIndex++
    return new Response(JSON.stringify(res.body), {
      status: res.status,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  return { fakeFetch: fakeFetch as typeof globalThis.fetch, calls }
}

function mockStreamFetch(chunks: string[]) {
  const calls: Array<{ url: string; init: RequestInit }> = []

  const fakeFetch = async (url: string | URL | Request, init?: RequestInit): Promise<Response> => {
    calls.push({ url: String(url), init: init ?? {} })
    const stream = new ReadableStream({
      start(controller) {
        for (const chunk of chunks) {
          controller.enqueue(new TextEncoder().encode(chunk + '\n'))
        }
        controller.close()
      },
    })
    return new Response(stream, {
      status: 200,
      headers: { 'Content-Type': 'application/x-ndjson' },
    })
  }

  return { fakeFetch: fakeFetch as typeof globalThis.fetch, calls }
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('Ollama Client', () => {
  beforeEach(() => {
    setOllamaConfig({ ...DEFAULT_CONFIG })
    setFetchModule(globalThis.fetch)
  })

  describe('config', () => {
    it('has correct defaults', () => {
      const cfg = getOllamaConfig()
      assert.equal(cfg.baseUrl, 'http://localhost:11434')
      assert.equal(cfg.model, 'gemma3:4b')
      assert.equal(cfg.temperature, 0.3)
      assert.equal(cfg.timeout, 30000)
    })

    it('can update config', () => {
      setOllamaConfig({ model: 'llama3', temperature: 0.7 })
      const cfg = getOllamaConfig()
      assert.equal(cfg.model, 'llama3')
      assert.equal(cfg.temperature, 0.7)
      assert.equal(cfg.baseUrl, 'http://localhost:11434')
    })
  })

  describe('checkHealth', () => {
    it('returns ok when model is available', async () => {
      const { fakeFetch } = mockFetch([{
        status: 200,
        body: { models: [{ name: 'gemma3:4b', size: 1000 }] },
      }])
      setFetchModule(fakeFetch)

      const result = await checkHealth()
      assert.equal(result.ok, true)
    })

    it('returns error when model is not found', async () => {
      const { fakeFetch } = mockFetch([{
        status: 200,
        body: { models: [{ name: 'llama3:8b', size: 1000 }] },
      }])
      setFetchModule(fakeFetch)

      const result = await checkHealth()
      assert.equal(result.ok, false)
      assert.equal(result.error?.code, 'MODEL_NOT_FOUND')
    })

    it('returns error when connection is refused', async () => {
      const fakeFetch = async (): Promise<Response> => {
        throw new Error('fetch failed')
      }
      setFetchModule(fakeFetch)

      const result = await checkHealth()
      assert.equal(result.ok, false)
      assert.equal(result.error?.code, 'CONNECTION_REFUSED')
    })
  })

  describe('generate', () => {
    it('returns mock response without HTTP', async () => {
      const result = await generate({
        prompt: 'hello',
        mockResponse: '{"meta":{"version":"1.0"},"entities":[]}',
      })
      assert.equal(result.text, '{"meta":{"version":"1.0"},"entities":[]}')
      assert.equal(result.done, true)
      assert.equal(result.model, 'gemma3:4b')
    })

    it('sends correct request to Ollama', async () => {
      const { fakeFetch, calls } = mockFetch([{
        status: 200,
        body: { response: 'ok', model: 'gemma3:4b', done: true },
      }])
      setFetchModule(fakeFetch)

      await generate({ prompt: 'test prompt', system: 'system prompt' })
      assert.equal(calls.length, 1)
      assert.ok(calls[0].url.includes('/api/generate'))
      const body = JSON.parse(calls[0].init.body as string)
      assert.equal(body.prompt, 'test prompt')
      assert.equal(body.system, 'system prompt')
      assert.equal(body.stream, false)
    })

    it('throws on connection error', async () => {
      const fakeFetch = async (): Promise<Response> => {
        throw new Error('fetch failed')
      }
      setFetchModule(fakeFetch)

      await assert.rejects(
        () => generate({ prompt: 'test' }),
        (err: Error) => {
          assert.ok('code' in err)
          return true
        },
      )
    })

    it('throws on non-200 response', async () => {
      const { fakeFetch } = mockFetch([{
        status: 500,
        body: { error: 'internal error' },
      }])
      setFetchModule(fakeFetch)

      await assert.rejects(
        () => generate({ prompt: 'test' }),
        (err: Error) => {
          assert.ok('code' in err)
          return true
        },
      )
    })
  })

  describe('generateStream', () => {
    it('yields mock response as single chunk', async () => {
      const chunks: string[] = []
      for await (const chunk of generateStream({ prompt: 'test', mockResponse: 'hello' })) {
        chunks.push(chunk.text)
      }
      assert.equal(chunks.length, 1)
      assert.equal(chunks[0], 'hello')
    })

    it('accumulates streaming chunks', async () => {
      const streamChunks = [
        '{"model":"gemma3:4b","response":"hel","done":false}',
        '{"model":"gemma3:4b","response":"lo","done":false}',
        '{"model":"gemma3:4b","response":"!","done":true}',
      ]
      const { fakeFetch } = mockStreamFetch(streamChunks)
      setFetchModule(fakeFetch)

      const results: string[] = []
      for await (const chunk of generateStream({ prompt: 'test' })) {
        results.push(chunk.text)
      }
      assert.equal(results.length, 3)
      assert.equal(results[0], 'hel')
      assert.equal(results[1], 'hello')
      assert.equal(results[2], 'hello!')
    })
  })
})
