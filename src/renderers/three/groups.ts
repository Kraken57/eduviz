import type { Entity, Relationship } from '../../ir/types.js'

// ─── Root Entity Detection ────────────────────────────────────────────────

export function isRootEntity(
  entityId: string,
  relationships: Relationship[],
): boolean {
  for (const rel of relationships) {
    if (rel.type === 'containment' && rel.to === entityId) {
      return false
    }
  }
  return true
}

// ─── Containment Tree ─────────────────────────────────────────────────────

export interface ContainmentNode {
  entityId: string
  children: ContainmentNode[]
}

export function buildContainmentTree(
  entities: Entity[],
  relationships: Relationship[],
): ContainmentNode[] {
  const childMap = new Map<string, string[]>()
  const parentSet = new Set<string>()

  for (const rel of relationships) {
    if (rel.type === 'containment') {
      if (!childMap.has(rel.from)) {
        childMap.set(rel.from, [])
      }
      childMap.get(rel.from)!.push(rel.to)
      parentSet.add(rel.to)
    }
  }

  const buildNode = (entityId: string): ContainmentNode => ({
    entityId,
    children: (childMap.get(entityId) ?? []).map(buildNode),
  })

  return entities
    .filter(e => !parentSet.has(e.id))
    .map(e => buildNode(e.id))
}

// ─── Find Children ────────────────────────────────────────────────────────

export function findChildren(
  entityId: string,
  relationships: Relationship[],
): string[] {
  const children: string[] = []
  for (const rel of relationships) {
    if (rel.type === 'containment' && rel.from === entityId) {
      children.push(rel.to)
    }
  }
  return children
}
