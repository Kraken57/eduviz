import type {
  EntityType,
  RelationshipType,
} from '../../ir/types.js'
import type {
  Renderer,
  RendererCapabilities,
  RendererId,
  SceneRequirements,
} from '../renderer/types.js'

// ─── Registry Entry ─────────────────────────────────────────────────────────

interface RegistryEntry {
  renderer: Renderer
  priority: number
}

// ─── Renderer Registry ──────────────────────────────────────────────────────

export class RendererRegistry {
  private renderers = new Map<RendererId, RegistryEntry>()

  register(renderer: Renderer, priority = 0): void {
    if (this.renderers.has(renderer.info.id)) {
      throw new Error(`Renderer already registered: ${renderer.info.id}`)
    }
    this.renderers.set(renderer.info.id, { renderer, priority })
  }

  unregister(id: RendererId): boolean {
    return this.renderers.delete(id)
  }

  get(id: RendererId): Renderer | undefined {
    return this.renderers.get(id)?.renderer
  }

  has(id: RendererId): boolean {
    return this.renderers.has(id)
  }

  getAll(): Renderer[] {
    return [...this.renderers.values()]
      .sort((a, b) => b.priority - a.priority)
      .map((entry) => entry.renderer)
  }

  findByCapabilities(
    requirements: SceneRequirements,
  ): Renderer[] {
    return this.getAll().filter((renderer) => {
      return rendererCanHandle(renderer.capabilities, requirements)
    })
  }

  findByEntityType(type: EntityType): Renderer[] {
    return this.getAll().filter((r) => r.capabilities.entityTypes.includes(type))
  }

  findByRelationshipType(type: RelationshipType): Renderer[] {
    return this.getAll().filter((r) => r.capabilities.relationshipTypes.includes(type))
  }

  clear(): void {
    this.renderers.clear()
  }

  get size(): number {
    return this.renderers.size
  }
}

// ─── Capability Matching ────────────────────────────────────────────────────

export function rendererCanHandle(
  capabilities: RendererCapabilities,
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
