import type {
  OllamaConfig,
  GenerateRequest,
  GenerateResponse,
  StreamChunk,
  AIError,
  AIErrorCode,
  OllamaGenerateRequest,
  OllamaGenerateResponse,
  OllamaStreamChunk,
} from './types.js'
import { DEFAULT_CONFIG } from './types.js'

// ─── Lazy Fetch Import ──────────────────────────────────────────────────────

type FetchFn = typeof globalThis.fetch

let fetchImpl: FetchFn | null = null

export function setFetchModule(fn: FetchFn): void {
  fetchImpl = fn
}

function getFetch(): FetchFn {
  if (fetchImpl) return fetchImpl
  if (typeof globalThis.fetch === 'function') {
    fetchImpl = globalThis.fetch.bind(globalThis)
    return fetchImpl
  }
  throw new Error('fetch is not available. Call setFetchModule() or run in a browser/Node.js 18+ environment.')
}

// ─── Config ─────────────────────────────────────────────────────────────────

let config: OllamaConfig = { ...DEFAULT_CONFIG }

export function setOllamaConfig(partial: Partial<OllamaConfig>): void {
  config = { ...config, ...partial }
}

export function getOllamaConfig(): Readonly<OllamaConfig> {
  return { ...config }
}

// ─── Error Helpers ──────────────────────────────────────────────────────────

function createError(code: AIErrorCode, message: string, raw?: string): AIError {
  return { code, message, raw }
}

// ─── Health Check ───────────────────────────────────────────────────────────

export async function checkHealth(): Promise<{ ok: boolean; error?: AIError }> {
  const fetch = getFetch()
  try {
    const res = await fetch(`${config.baseUrl}/api/tags`, {
      method: 'GET',
      signal: AbortSignal.timeout(config.timeout ?? DEFAULT_CONFIG.timeout!),
    })
    if (!res.ok) {
      return { ok: false, error: createError('CONNECTION_REFUSED', `Ollama returned ${res.status}`) }
    }
    const data = await res.json() as { models?: Array<{ name: string }> }
    const modelExists = data.models?.some((m) =>
      m.name === config.model || m.name.startsWith(config.model + ':'),
    )
    if (!modelExists) {
      return {
        ok: false,
        error: createError(
          'MODEL_NOT_FOUND',
          `Model "${config.model}" not found. Available: ${data.models?.map((m) => m.name).join(', ') ?? 'none'}`,
        ),
      }
    }
    return { ok: true }
  } catch (err) {
    if (err instanceof Error && err.name === 'TimeoutError') {
      return { ok: false, error: createError('TIMEOUT', 'Ollama health check timed out') }
    }
    return {
      ok: false,
      error: createError(
        'CONNECTION_REFUSED',
        `Cannot connect to Ollama at ${config.baseUrl}. Is it running?`,
      ),
    }
  }
}

// ─── Non-Streaming Generate ─────────────────────────────────────────────────

export async function generate(
  request: GenerateRequest,
): Promise<GenerateResponse> {
  if (request.mockResponse !== undefined) {
    return {
      text: request.mockResponse,
      model: config.model,
      done: true,
    }
  }

  const fetch = getFetch()
  const body: OllamaGenerateRequest = {
    model: config.model,
    prompt: request.prompt,
    system: request.system,
    stream: false,
    options: {
      temperature: config.temperature,
    },
  }

  let res: Response
  try {
    res = await fetch(`${config.baseUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(config.timeout ?? DEFAULT_CONFIG.timeout!),
    })
  } catch (err) {
    if (err instanceof Error && err.name === 'TimeoutError') {
      throw createError('TIMEOUT', 'Ollama request timed out')
    }
    throw createError(
      'CONNECTION_REFUSED',
      `Cannot connect to Ollama at ${config.baseUrl}. Is it running?`,
    )
  }

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw createError('INVALID_RESPONSE', `Ollama returned ${res.status}: ${text}`)
  }

  const data = await res.json() as OllamaGenerateResponse
  return {
    text: data.response,
    model: data.model,
    totalDuration: data.total_duration ? Math.round(data.total_duration / 1e6) : undefined,
    done: data.done,
  }
}

// ─── Streaming Generate ─────────────────────────────────────────────────────

export async function* generateStream(
  request: GenerateRequest,
): AsyncIterable<StreamChunk> {
  if (request.mockResponse !== undefined) {
    yield { text: request.mockResponse, done: true }
    return
  }

  const fetch = getFetch()
  const body: OllamaGenerateRequest = {
    model: config.model,
    prompt: request.prompt,
    system: request.system,
    stream: true,
    options: {
      temperature: config.temperature,
    },
  }

  let res: Response
  try {
    res = await fetch(`${config.baseUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(config.timeout ?? DEFAULT_CONFIG.timeout!),
    })
  } catch (err) {
    if (err instanceof Error && err.name === 'TimeoutError') {
      throw createError('TIMEOUT', 'Ollama request timed out')
    }
    throw createError(
      'CONNECTION_REFUSED',
      `Cannot connect to Ollama at ${config.baseUrl}. Is it running?`,
    )
  }

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw createError('INVALID_RESPONSE', `Ollama returned ${res.status}: ${text}`)
  }

  if (!res.body) {
    throw createError('INVALID_RESPONSE', 'Ollama returned empty response body')
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let accumulated = ''

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''

      for (const line of lines) {
        if (!line.trim()) continue
        try {
          const chunk = JSON.parse(line) as OllamaStreamChunk
          accumulated += chunk.response
          yield { text: accumulated, done: chunk.done }
        } catch {
          // skip malformed lines
        }
      }
    }

    if (buffer.trim()) {
      try {
        const chunk = JSON.parse(buffer) as OllamaStreamChunk
        accumulated += chunk.response
        yield { text: accumulated, done: chunk.done }
      } catch {
        // skip malformed final line
      }
    }
  } finally {
    reader.releaseLock()
  }
}
