import type { Scene } from '../ir/types.js'

// ─── Ollama Configuration ──────────────────────────────────────────────────

export interface OllamaConfig {
  baseUrl: string
  model: string
  temperature?: number
  timeout?: number
}

export const DEFAULT_CONFIG: OllamaConfig = {
  baseUrl: 'http://localhost:11434',
  model: 'gemma3:4b',
  temperature: 0.3,
  timeout: 30000,
}

// ─── Ollama API Types ──────────────────────────────────────────────────────

export interface OllamaGenerateRequest {
  model: string
  prompt: string
  system?: string
  stream?: boolean
  options?: {
    temperature?: number
    num_predict?: number
  }
}

export interface OllamaGenerateResponse {
  model: string
  response: string
  done: boolean
  total_duration?: number
  eval_count?: number
}

export interface OllamaStreamChunk {
  model: string
  response: string
  done: boolean
}

export interface OllamaTagResponse {
  models: Array<{
    name: string
    size: number
    modified_at: string
  }>
}

// ─── Client Request/Response Types ─────────────────────────────────────────

export interface GenerateRequest {
  prompt: string
  system?: string
  mockResponse?: string
}

export interface GenerateResponse {
  text: string
  model: string
  totalDuration?: number
  done: boolean
}

export interface StreamChunk {
  text: string
  done: boolean
}

// ─── DSL Generation Types ──────────────────────────────────────────────────

export interface DSLGenerationRequest {
  question: string
  context?: string
  mockResponse?: string
}

export type ParseMethod = 'json' | 'extracted' | 'wrapped'

export interface DSLGenerationResult {
  scene: Scene
  raw: string
  parseMethod: ParseMethod
}

// ─── AI Errors ─────────────────────────────────────────────────────────────

export type AIErrorCode =
  | 'CONNECTION_REFUSED'
  | 'TIMEOUT'
  | 'MODEL_NOT_FOUND'
  | 'INVALID_RESPONSE'
  | 'VALIDATION_FAILED'
  | 'PARSE_FAILED'

export interface AIError {
  code: AIErrorCode
  message: string
  raw?: string
}
