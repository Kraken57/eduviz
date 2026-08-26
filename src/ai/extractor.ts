import type { Scene } from '../ir/types.js'
import type { ParseMethod, DSLGenerationRequest, DSLGenerationResult, AIError } from './types.js'
import { validateScene } from '../ir/validate.js'
import { generate, generateStream } from './ollama-client.js'
import { SYSTEM_PROMPT, buildGenerationPrompt } from './prompts.js'

// ─── JSON Extraction ────────────────────────────────────────────────────────

function stripThinking(text: string): string {
  // Remove <think>...</think> blocks (Gemma 4 thinking tokens)
  return text.replace(/<think>[\s\S]*?<\/think>/gi, '').trim()
}

export function extractSceneJSON(raw: string): { json: unknown; method: ParseMethod } | AIError {
  const trimmed = stripThinking(raw).trim()

  // Try 1: Direct JSON parse
  try {
    const parsed = JSON.parse(trimmed)
    if (typeof parsed === 'object' && parsed !== null) {
      return { json: parsed, method: 'json' }
    }
  } catch {
    // not valid JSON, continue
  }

  // Try 2: Extract from markdown code fences (before generic extraction)
  const fenceMatch = trimmed.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/)
  if (fenceMatch) {
    try {
      const parsed = JSON.parse(fenceMatch[1].trim())
      if (typeof parsed === 'object' && parsed !== null) {
        return { json: parsed, method: 'wrapped' }
      }
    } catch {
      // fence extraction failed, continue
    }
  }

  // Try 3: Extract first {...} block by brace counting
  const startIndex = trimmed.indexOf('{')
  if (startIndex >= 0) {
    let depth = 0
    let inString = false
    let escape = false
    for (let i = startIndex; i < trimmed.length; i++) {
      const ch = trimmed[i]
      if (escape) {
        escape = false
        continue
      }
      if (ch === '\\' && inString) {
        escape = true
        continue
      }
      if (ch === '"') {
        inString = !inString
        continue
      }
      if (inString) continue
      if (ch === '{') depth++
      if (ch === '}') {
        depth--
        if (depth === 0) {
          const candidate = trimmed.slice(startIndex, i + 1)
          try {
            const parsed = JSON.parse(candidate)
            if (typeof parsed === 'object' && parsed !== null) {
              return { json: parsed, method: 'extracted' }
            }
          } catch {
            // extraction failed, continue
          }
          break
        }
      }
    }
  }

  return {
    code: 'PARSE_FAILED',
    message: 'Could not extract valid JSON from AI response',
    raw,
  }
}

// ─── Scene Validation ───────────────────────────────────────────────────────

export function validateExtractedScene(json: unknown): Scene | AIError {
  const validation = validateScene(json)
  if (!validation.valid) {
    const errorMessages = validation.errors.map((e) => `${e.path}: ${e.message}`).join('; ')
    return {
      code: 'VALIDATION_FAILED',
      message: `Scene validation failed: ${errorMessages}`,
      raw: JSON.stringify(json),
    }
  }
  return json as Scene
}

// ─── High-Level Generation ──────────────────────────────────────────────────

export async function generateScene(
  request: DSLGenerationRequest,
): Promise<DSLGenerationResult> {
  const prompt = buildGenerationPrompt(request.question, request.context)

  const response = await generate({
    prompt,
    system: SYSTEM_PROMPT,
    mockResponse: request.mockResponse,
  })

  const extraction = extractSceneJSON(response.text)
  if ('code' in extraction) {
    throw extraction
  }

  const scene = validateExtractedScene(extraction.json)
  if ('code' in scene) {
    throw scene
  }

  return {
    scene,
    raw: response.text,
    parseMethod: extraction.method,
  }
}

// ─── Streaming Generation ───────────────────────────────────────────────────

export interface StreamEvent {
  type: 'start' | 'chunk' | 'end' | 'error'
  text: string
  message: string
  result?: DSLGenerationResult
}

export async function* generateSceneStream(
  request: DSLGenerationRequest,
): AsyncGenerator<StreamEvent> {
  const prompt = buildGenerationPrompt(request.question, request.context)

  let lastText = ''
  yield { type: 'start', text: '', message: '' }
  for await (const chunk of generateStream({
    prompt,
    system: SYSTEM_PROMPT,
    mockResponse: request.mockResponse,
  })) {
    lastText = chunk.text
    if (!chunk.done) {
      yield { type: 'chunk', text: lastText, message: lastText }
      continue
    }

    const extraction = extractSceneJSON(lastText)
    if ('code' in extraction) {
      yield { type: 'error', text: lastText, message: `Extraction failed: ${extraction.message}` }
      throw extraction
    }
    const scene = validateExtractedScene(extraction.json)
    if ('code' in scene) {
      yield { type: 'error', text: lastText, message: `Validation failed: ${scene.message}` }
      throw scene
    }
    yield {
      type: 'end',
      text: lastText,
      message: 'Generation complete',
      result: {
        scene,
        raw: lastText,
        parseMethod: extraction.method,
      },
    }
  }
}
