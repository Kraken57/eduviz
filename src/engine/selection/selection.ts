import type { Renderer, RendererId, SceneRequirements } from '../renderer/types.js'

// ─── Selection Strategy ─────────────────────────────────────────────────────

export type SelectionStrategy =
  | 'first-match'
  | 'best-match'
  | 'specificity'
  | 'manual'

// ─── Selection Result ───────────────────────────────────────────────────────

export interface SelectionResult {
  renderer: Renderer
  rendererId: RendererId
  score: number
}

// ─── Selection Error ────────────────────────────────────────────────────────

export interface SelectionError {
  code: string
  message: string
}

// ─── Selection Output ───────────────────────────────────────────────────────

export interface SelectionOutput {
  success: boolean
  result?: SelectionResult
  errors: SelectionError[]
}

// ─── Scoring ────────────────────────────────────────────────────────────────

function specificityScore(
  renderer: Renderer,
  requirements: SceneRequirements,
): number {
  let score = 0

  const totalEntityTypes = requirements.entityTypes.length
  const matchedEntityTypes = requirements.entityTypes.filter((t) =>
    renderer.capabilities.entityTypes.includes(t),
  ).length
  if (totalEntityTypes > 0) {
    score += (matchedEntityTypes / totalEntityTypes) * 50
  }

  const totalRelTypes = requirements.relationshipTypes.length
  const matchedRelTypes = requirements.relationshipTypes.filter((t) =>
    renderer.capabilities.relationshipTypes.includes(t),
  ).length
  if (totalRelTypes > 0) {
    score += (matchedRelTypes / totalRelTypes) * 30
  }

  const totalFeatures = requirements.features.length
  const matchedFeatures = requirements.features.filter((f) =>
    renderer.capabilities.features.includes(f),
  ).length
  if (totalFeatures > 0) {
    score += (matchedFeatures / totalFeatures) * 20
  }

  return score
}

// ─── Selection Algorithm ────────────────────────────────────────────────────

export function selectRenderer(
  renderers: Renderer[],
  requirements: SceneRequirements,
  strategy: SelectionStrategy = 'best-match',
): SelectionOutput {
  const candidates: SelectionResult[] = []

  for (const renderer of renderers) {
    if (!rendererCanHandle(renderer.capabilities, requirements)) continue
    const score = specificityScore(renderer, requirements)
    candidates.push({
      renderer,
      rendererId: renderer.info.id,
      score,
    })
  }

  if (candidates.length === 0) {
    return {
      success: false,
      errors: [
        {
          code: 'NO_MATCH',
          message: 'No renderer found that can handle the scene requirements',
        },
      ],
    }
  }

  candidates.sort((a, b) => b.score - a.score)

  let selected: SelectionResult

  switch (strategy) {
    case 'first-match':
      selected = candidates[0]
      break
    case 'best-match':
      selected = candidates[0]
      break
    case 'specificity':
      selected = candidates[0]
      break
    case 'manual':
      selected = candidates[0]
      break
    default:
      selected = candidates[0]
  }

  return {
    success: true,
    result: selected,
    errors: [],
  }
}

// ─── Helper ─────────────────────────────────────────────────────────────────

function rendererCanHandle(
  capabilities: Renderer['capabilities'],
  requirements: SceneRequirements,
): boolean {
  for (const entityType of requirements.entityTypes) {
    if (!capabilities.entityTypes.includes(entityType)) return false
  }
  for (const relType of requirements.relationshipTypes) {
    if (!capabilities.relationshipTypes.includes(relType)) return false
  }
  for (const feature of requirements.features) {
    if (!capabilities.features.includes(feature)) return false
  }
  return true
}
