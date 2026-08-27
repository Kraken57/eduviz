// ─── AI → Visualization Pipeline ────────────────────────────────────────────
// Orchestrates: question → AI → extract → validate → retry → preprocess → render
// ─────────────────────────────────────────────────────────────────────────────

import type { Scene } from '../ir/types.js'
import { validateScene, type ValidationError } from '../ir/validate.js'
import { preprocessScene } from '../engine/preprocessing/pipeline.js'
import { detectDimension } from '../engine/selection/detectDimension.js'
import type { VisualizationEngine } from '../engine/engine.js'
import type { RenderResult } from '../engine/renderer/types.js'
import { generateScene, generateSceneStream } from './extractor.js'
import { buildRetryPrompt, buildContextualPrompt, type ContextEntry } from './prompts.js'
import type { ParseMethod, DSLGenerationResult } from './types.js'

// ─── Options ────────────────────────────────────────────────────────────────

export interface PipelineOptions {
  maxRetries: number
  maxEntities: number
  maxRelationships: number
  maxAnimations: number
  maxPromptLength: number
  maxResponseSize: number
  autoSelectRenderer: boolean
  contextHistory: number
}

export const DEFAULT_PIPELINE_OPTIONS: PipelineOptions = {
  maxRetries: 3,
  maxEntities: 50,
  maxRelationships: 30,
  maxAnimations: 20,
  maxPromptLength: 1000,
  maxResponseSize: 102400,
  autoSelectRenderer: true,
  contextHistory: 3,
}

// ─── Result ─────────────────────────────────────────────────────────────────

export interface PipelineResult {
  success: boolean
  scene?: Scene
  raw?: string
  renderResult?: RenderResult
  attempts: number
  parseMethod?: ParseMethod
  rendererId?: string
  warnings: string[]
  errors: string[]
}

// ─── Scene Limits ───────────────────────────────────────────────────────────

export function checkSceneLimits(
  scene: Scene,
  limits: Pick<PipelineOptions, 'maxEntities' | 'maxRelationships' | 'maxAnimations'>,
): string[] {
  const warnings: string[] = []

  if (scene.entities.length > limits.maxEntities) {
    warnings.push(`Entity count (${scene.entities.length}) exceeds limit (${limits.maxEntities})`)
  }
  if ((scene.relationships?.length ?? 0) > limits.maxRelationships) {
    warnings.push(`Relationship count (${scene.relationships!.length}) exceeds limit (${limits.maxRelationships})`)
  }
  if ((scene.animations?.length ?? 0) > limits.maxAnimations) {
    warnings.push(`Animation count (${scene.animations!.length}) exceeds limit (${limits.maxAnimations})`)
  }

  return warnings
}

// ─── Renderer Target Resolution ─────────────────────────────────────────────

function resolveRendererTarget(scene: Scene, explicitTarget?: string): string | undefined {
  if (explicitTarget) return explicitTarget
  return detectDimension(scene) === '3d' ? 'three-3d' : 'svg-2d'
}

// ─── Pipeline (Sync) ────────────────────────────────────────────────────────

export async function runPipeline(
  question: string,
  engine: VisualizationEngine,
  options?: Partial<PipelineOptions>,
  context?: ContextEntry[],
  explicitTarget?: string,
): Promise<PipelineResult> {
  const opts = { ...DEFAULT_PIPELINE_OPTIONS, ...options }
  const warnings: string[] = []
  const errors: string[] = []

  if (!question.trim() || question.length > opts.maxPromptLength) {
    return {
      success: false,
      attempts: 0,
      warnings,
      errors: [question.trim()
        ? `Prompt exceeds maximum length (${opts.maxPromptLength} chars)`
        : 'Empty question'],
    }
  }

  let currentPrompt = buildContextualPrompt(question, context?.slice(-opts.contextHistory))
  let lastResult: DSLGenerationResult | undefined
  let lastValidationErrors: ValidationError[] = []

  for (let attempt = 1; attempt <= opts.maxRetries; attempt++) {
    try {
      const result = await generateScene({
        question: currentPrompt,
      })

      if (result.raw.length > opts.maxResponseSize) {
        warnings.push(`Response size (${result.raw.length}) exceeds limit (${opts.maxResponseSize})`)
      }

      const validation = validateScene(result.scene)
      if (validation.valid) {
        lastResult = result
        lastValidationErrors = []
        break
      }

      lastResult = result
      lastValidationErrors = validation.errors

      if (attempt < opts.maxRetries) {
        currentPrompt = buildRetryPrompt(question, result.raw, validation.errors)
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      errors.push(`Attempt ${attempt}: ${msg}`)
      if (attempt === opts.maxRetries) {
        return {
          success: false,
          attempts: attempt,
          warnings,
          errors,
        }
      }
    }
  }

  if (!lastResult) {
    return {
      success: false,
      attempts: opts.maxRetries,
      warnings,
      errors: errors.length > 0 ? errors : ['No response from AI'],
    }
  }

  if (lastValidationErrors.length > 0) {
    errors.push(`Validation failed after ${opts.maxRetries} attempts: ${lastValidationErrors.map((e) => `${e.path}: ${e.message}`).join('; ')}`)
    return {
      success: false,
      scene: lastResult.scene,
      raw: lastResult.raw,
      attempts: opts.maxRetries,
      parseMethod: lastResult.parseMethod,
      warnings,
      errors,
    }
  }

  const limitWarnings = checkSceneLimits(lastResult.scene, opts)
  warnings.push(...limitWarnings)

  const preprocessResult = preprocessScene(lastResult.scene)
  if (!preprocessResult.success) {
    return {
      success: false,
      scene: lastResult.scene,
      raw: lastResult.raw,
      attempts: opts.maxRetries,
      parseMethod: lastResult.parseMethod,
      warnings,
      errors: [...errors, ...(preprocessResult.errors ?? [])],
    }
  }

  const target = resolveRendererTarget(preprocessResult.preprocessed?.scene ?? lastResult.scene, explicitTarget)

  let renderResult: RenderResult | undefined
  try {
    renderResult = await engine.render({
      scene: preprocessResult.preprocessed?.scene ?? lastResult.scene,
      target,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    errors.push(`Render failed: ${msg}`)
  }

  return {
    success: renderResult?.success ?? false,
    scene: lastResult.scene,
    raw: lastResult.raw,
    renderResult,
    attempts: opts.maxRetries,
    parseMethod: lastResult.parseMethod,
    rendererId: target,
    warnings,
    errors,
  }
}

// ─── Pipeline (Streaming) ───────────────────────────────────────────────────

export type PipelineEvent =
  | { type: 'status'; message: string }
  | { type: 'chunk'; text: string; tokenCount: number }
  | { type: 'validation-error'; errors: ValidationError[]; attempt: number }
  | { type: 'retry'; attempt: number }
  | { type: 'preprocessed'; entityCount: number }
  | { type: 'renderer-selected'; rendererId: string }
  | { type: 'rendering'; rendererId: string }
  | { type: 'done'; result: PipelineResult }
  | { type: 'error'; error: string }

export async function* runPipelineStream(
  question: string,
  engine: VisualizationEngine,
  options?: Partial<PipelineOptions>,
  context?: ContextEntry[],
  explicitTarget?: string,
): AsyncGenerator<PipelineEvent> {
  const opts = { ...DEFAULT_PIPELINE_OPTIONS, ...options }
  const warnings: string[] = []
  const errors: string[] = []

  if (!question.trim() || question.length > opts.maxPromptLength) {
    yield { type: 'error', error: question.trim()
      ? `Prompt exceeds maximum length (${opts.maxPromptLength} chars)`
      : 'Empty question' }
    return
  }

  let currentPrompt = buildContextualPrompt(question, context?.slice(-opts.contextHistory))
  let lastResult: DSLGenerationResult | undefined
  let lastValidationErrors: ValidationError[] = []

  for (let attempt = 1; attempt <= opts.maxRetries; attempt++) {
    yield { type: 'status', message: attempt === 1 ? 'Generating scene...' : `Retry attempt ${attempt}/${opts.maxRetries}...` }

    let tokenCount = 0
    try {
      for await (const event of generateSceneStream({ question: currentPrompt })) {
        if (event.type === 'chunk') {
          tokenCount++
          yield { type: 'chunk', text: event.text, tokenCount }
        } else if (event.type === 'error') {
          yield { type: 'error', error: event.message }
        }

        if (event.result) {
          lastResult = event.result
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      errors.push(`Attempt ${attempt}: ${msg}`)
      yield { type: 'error', error: msg }
      if (attempt === opts.maxRetries) {
        yield { type: 'done', result: { success: false, attempts: attempt, warnings, errors } }
        return
      }
      continue
    }

    if (!lastResult) {
      errors.push(`Attempt ${attempt}: No response from AI`)
      if (attempt === opts.maxRetries) {
        yield { type: 'done', result: { success: false, attempts: attempt, warnings, errors } }
        return
      }
      continue
    }

    const validation = validateScene(lastResult.scene)
    if (validation.valid) {
      lastValidationErrors = []
      break
    }

    lastValidationErrors = validation.errors
    yield { type: 'validation-error', errors: validation.errors, attempt }

    if (attempt < opts.maxRetries) {
      currentPrompt = buildRetryPrompt(question, lastResult.raw, validation.errors)
      yield { type: 'retry', attempt: attempt + 1 }
    }
  }

  if (!lastResult) {
    yield { type: 'done', result: { success: false, attempts: opts.maxRetries, warnings, errors } }
    return
  }

  if (lastValidationErrors.length > 0) {
    errors.push(`Validation failed after ${opts.maxRetries} attempts`)
    yield { type: 'done', result: { success: false, scene: lastResult.scene, raw: lastResult.raw, attempts: opts.maxRetries, parseMethod: lastResult.parseMethod, warnings, errors } }
    return
  }

  const limitWarnings = checkSceneLimits(lastResult.scene, opts)
  warnings.push(...limitWarnings)

  yield { type: 'status', message: 'Preprocessing scene...' }
  const preprocessResult = preprocessScene(lastResult.scene)
  if (!preprocessResult.success) {
    errors.push(...(preprocessResult.errors ?? []))
    yield { type: 'done', result: { success: false, scene: lastResult.scene, raw: lastResult.raw, attempts: opts.maxRetries, parseMethod: lastResult.parseMethod, warnings, errors } }
    return
  }

  const entityCount = preprocessResult.preprocessed?.scene.entities.length ?? lastResult.scene.entities.length
  yield { type: 'preprocessed', entityCount }

  const target = resolveRendererTarget(preprocessResult.preprocessed?.scene ?? lastResult.scene, explicitTarget)
  yield { type: 'renderer-selected', rendererId: target ?? 'auto' }

  yield { type: 'rendering', rendererId: target ?? 'auto' }
  let renderResult: RenderResult | undefined
  try {
    renderResult = await engine.render({
      scene: preprocessResult.preprocessed?.scene ?? lastResult.scene,
      target,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    errors.push(`Render failed: ${msg}`)
  }

  yield {
    type: 'done',
    result: {
      success: renderResult?.success ?? false,
      scene: lastResult.scene,
      raw: lastResult.raw,
      renderResult,
      attempts: opts.maxRetries,
      parseMethod: lastResult.parseMethod,
      rendererId: target,
      warnings,
      errors,
    },
  }
}
