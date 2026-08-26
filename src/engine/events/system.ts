import type {
  CoreAction,
  CoreEvent,
  EventHandler,
  HandlerRegistration,
  ActionHandler,
  ActionHandlerRegistration,
} from './types.js'

// ─── Event System ───────────────────────────────────────────────────────────

export class EventSystem {
  private eventHandlers = new Map<string, HandlerRegistration[]>()
  private actionHandlers = new Map<string, ActionHandlerRegistration[]>()
  private eventQueue: CoreEvent[] = []
  private processing = false

  // ─── Event Handler Management ──────────────────────────────────────────

  onEvent(eventType: string, handler: EventHandler): string {
    const id = `evt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    if (!this.eventHandlers.has(eventType)) {
      this.eventHandlers.set(eventType, [])
    }
    this.eventHandlers.get(eventType)!.push({ id, eventType, handler })
    return id
  }

  offEvent(registrationId: string): boolean {
    for (const [eventType, handlers] of this.eventHandlers.entries()) {
      const idx = handlers.findIndex((h) => h.id === registrationId)
      if (idx !== -1) {
        handlers.splice(idx, 1)
        if (handlers.length === 0) {
          this.eventHandlers.delete(eventType)
        }
        return true
      }
    }
    return false
  }

  // ─── Action Handler Management ─────────────────────────────────────────

  onAction(actionType: string, handler: ActionHandler): string {
    const id = `act-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    if (!this.actionHandlers.has(actionType)) {
      this.actionHandlers.set(actionType, [])
    }
    this.actionHandlers.get(actionType)!.push({ id, actionType, handler })
    return id
  }

  offAction(registrationId: string): boolean {
    for (const [actionType, handlers] of this.actionHandlers.entries()) {
      const idx = handlers.findIndex((h) => h.id === registrationId)
      if (idx !== -1) {
        handlers.splice(idx, 1)
        if (handlers.length === 0) {
          this.actionHandlers.delete(actionType)
        }
        return true
      }
    }
    return false
  }

  // ─── Event Processing ──────────────────────────────────────────────────

  emit(event: CoreEvent): CoreAction[] {
    const handlers = this.eventHandlers.get(event.type) ?? []
    const actions: CoreAction[] = []

    for (const registration of handlers) {
      const result = registration.handler(event)
      actions.push(...result)
    }

    return actions
  }

  queueEvent(event: CoreEvent): void {
    this.eventQueue.push(event)
  }

  processQueue(): CoreAction[] {
    if (this.processing) {
      throw new Error('Cannot process queue while already processing')
    }

    this.processing = true
    const allActions: CoreAction[] = []

    while (this.eventQueue.length > 0) {
      const event = this.eventQueue.shift()!
      const actions = this.emit(event)
      allActions.push(...actions)
    }

    this.processing = false
    return allActions
  }

  // ─── Action Processing ─────────────────────────────────────────────────

  executeAction(action: CoreAction): void {
    const handlers = this.actionHandlers.get(this.getActionType(action)) ?? []
    for (const registration of handlers) {
      registration.handler(action)
    }
  }

  private getActionType(action: CoreAction): string {
    if (action.payload.kind === 'custom') {
      return action.payload.actionType
    }
    return action.payload.kind
  }

  // ─── Cleanup ───────────────────────────────────────────────────────────

  clear(): void {
    this.eventHandlers.clear()
    this.actionHandlers.clear()
    this.eventQueue = []
  }

  get eventHandlerCount(): number {
    let count = 0
    for (const handlers of this.eventHandlers.values()) {
      count += handlers.length
    }
    return count
  }

  get actionHandlerCount(): number {
    let count = 0
    for (const handlers of this.actionHandlers.values()) {
      count += handlers.length
    }
    return count
  }

  get queueSize(): number {
    return this.eventQueue.length
  }
}
