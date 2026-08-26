// ─── AI Module ──────────────────────────────────────────────────────────────
//
// This module connects to a local Ollama instance (Gemma 4 E4B) to convert
// natural language questions into visualization IR documents.
//
// The AI layer is completely separate from the rendering engine.
// It produces Scene JSON; renderers consume it.

export { SYSTEM_PROMPT, buildGenerationPrompt } from './prompts.js'
export { setOllamaConfig, getOllamaConfig, checkHealth, generate, generateStream, setFetchModule } from './ollama-client.js'
export { extractSceneJSON, validateExtractedScene, generateScene, generateSceneStream } from './extractor.js'
export type { StreamEvent } from './extractor.js'
export { DEFAULT_CONFIG } from './types.js'
export type {
  OllamaConfig,
  GenerateRequest,
  GenerateResponse,
  StreamChunk,
  DSLGenerationRequest,
  DSLGenerationResult,
  ParseMethod,
  AIError,
  AIErrorCode,
} from './types.js'
