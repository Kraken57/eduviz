import type { EntityId } from '../../ir/types.js'
import type { Value } from '../../ir/types.js'

// ─── Event Source ───────────────────────────────────────────────────────────

export type EventSource =
  | { kind: 'user'; interaction: string }
  | { kind: 'animation'; animationId: string; step: number }
  | { kind: 'timer'; elapsedMs: number }
  | { kind: 'system'; trigger: string }

// ─── Core Event ─────────────────────────────────────────────────────────────

export interface CoreEvent {
  type: string
  source: EventSource
  target: EntityId
  timestamp: number
  data: Record<string, Value>
}

// ─── Core Action ────────────────────────────────────────────────────────────

export type ActionPayload =
  | { kind: 'set-property'; target: EntityId; property: string; value: Value }
  | { kind: 'animate'; target: EntityId; animationId: string; startMs?: number; durationMs?: number }
  | { kind: 'add-entity'; entity: Record<string, unknown> }
  | { kind: 'remove-entity'; target: EntityId }
  | { kind: 'add-relationship'; relationship: Record<string, unknown> }
  | { kind: 'remove-relationship'; relationshipId: string }
  | { kind: 'custom'; actionType: string; data: Record<string, Value> }

export interface CoreAction {
  id: string
  payload: ActionPayload
  sourceEvent: string
  timestamp: number
}

// ─── Event Handler ──────────────────────────────────────────────────────────

export type EventHandler = (event: CoreEvent) => CoreAction[]

// ─── Action Handler ─────────────────────────────────────────────────────────

export type ActionHandler = (action: CoreAction) => void

// ─── Event Handler Registration ─────────────────────────────────────────────

export interface HandlerRegistration {
  id: string
  eventType: string
  handler: EventHandler
}

// ─── Action Handler Registration ────────────────────────────────────────────

export interface ActionHandlerRegistration {
  id: string
  actionType: string
  handler: ActionHandler
}
