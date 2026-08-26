import { describe, it } from 'node:test'
import * as assert from 'node:assert/strict'

import type {
  Entity,
  EntityType,
  PropertyBag,
  Relationship,
  RelationshipType,
  Scene,
} from '../ir/types.js'
import type { Renderer, RendererCapabilities, RenderContext, SceneRequirements } from './renderer/types.js'
import type { Capability } from './renderer/types.js'
import { RendererRegistry, rendererCanHandle } from './registry/registry.js'
import { selectRenderer } from './selection/selection.js'
import { extractSceneRequirements } from './selection/requirements.js'
import { EventSystem } from './events/system.js'
import { VisualizationEngine } from './engine.js'
import { MockRenderer } from './mock-renderer.js'
import {
  preprocessScene,
  getEntity,
  getChildren,
  getParent,
  getRelationships,
  getReferencedEntities,
  type EntityIndex,
} from './preprocessing/pipeline.js'

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeScene(
  entities: Entity[],
  relationships: Relationship[] = [],
  opts?: { animations?: Scene['animations']; timelines?: Scene['timelines'] },
): Scene {
  return {
    meta: { version: '1.0' },
    entities,
    relationships,
    animations: opts?.animations,
    timelines: opts?.timelines,
  }
}

function makeEntity(id: string, type: EntityType, props: PropertyBag = {}): Entity {
  return { id, type, properties: props }
}

function makeRelationship(
  from: string,
  to: string,
  type: RelationshipType,
): Relationship {
  return { type, from, to }
}

function allCapabilities(): RendererCapabilities {
  return {
    entityTypes: ['shape', 'text', 'data', 'graph', 'connection', 'abstract', 'group'],
    relationshipTypes: ['containment', 'constraint', 'reference', 'edge'],
    features: ['2d', '3d', 'animations', 'interactions', 'timelines', 'expressions', 'references', 'procedural'],
  }
}

// ─── Preprocessing Tests ────────────────────────────────────────────────────

describe('preprocessScene', () => {
  it('validates and normalizes a simple scene', () => {
    const scene = makeScene([
      makeEntity('b', 'shape'),
      makeEntity('a', 'shape'),
    ])

    const result = preprocessScene(scene)
    assert.ok(result.success)
    assert.ok(result.preprocessed)
    assert.equal(result.preprocessed.scene.entities.length, 2)
    assert.equal(result.preprocessed.scene.entities[0].id, 'a')
    assert.equal(result.preprocessed.scene.entities[1].id, 'b')
  })

  it('rejects invalid scene', () => {
    const scene = { version: '1.0' }
    const result = preprocessScene(scene as unknown as Scene)
    assert.equal(result.success, false)
    assert.ok(result.errors.length > 0)
  })

  it('builds entity index with containment', () => {
    const scene = makeScene(
      [makeEntity('parent', 'group'), makeEntity('child', 'shape')],
      [makeRelationship('parent', 'child', 'containment')],
    )
    const result = preprocessScene(scene)
    assert.ok(result.preprocessed)
    const idx = result.preprocessed.entityIndex

    assert.deepEqual(idx.childrenOf.get('parent'), ['child'])
    assert.equal(idx.parentOf.get('child'), 'parent')
    assert.ok(idx.byId.has('parent'))
    assert.ok(idx.byId.has('child'))
  })

  it('extracts scene requirements', () => {
    const scene = makeScene(
      [makeEntity('a', 'shape'), makeEntity('b', 'text')],
      [makeRelationship('a', 'b', 'containment')],
    )
    const result = preprocessScene(scene)
    assert.ok(result.preprocessed)
    const reqs = result.preprocessed.sceneRequirements
    assert.ok(reqs.entityTypes.includes('shape'))
    assert.ok(reqs.entityTypes.includes('text'))
    assert.ok(reqs.relationshipTypes.includes('containment'))
  })

  it('sorts entities deterministically by id', () => {
    const scene = makeScene([
      makeEntity('z', 'shape'),
      makeEntity('a', 'text'),
      makeEntity('m', 'data'),
    ])
    const result = preprocessScene(scene)
    assert.ok(result.preprocessed)
    assert.deepEqual(
      result.preprocessed.scene.entities.map((e) => e.id),
      ['a', 'm', 'z'],
    )
  })
})

// ─── Entity Index Queries ───────────────────────────────────────────────────

describe('entity index queries', () => {
  let index: EntityIndex

  const parent = makeEntity('parent', 'group')
  const child1 = makeEntity('child1', 'shape')
  const child2 = makeEntity('child2', 'text')
  const unrelated = makeEntity('other', 'data')

  const scene = makeScene(
    [parent, child1, child2, unrelated],
    [
      makeRelationship('parent', 'child1', 'containment'),
      makeRelationship('parent', 'child2', 'containment'),
      makeRelationship('child1', 'child2', 'reference'),
    ],
  )

  const result = preprocessScene(scene)
  assert.ok(result.preprocessed)
  index = result.preprocessed.entityIndex

  it('getEntity returns entity by id', () => {
    assert.equal(getEntity(index, 'parent')?.id, 'parent')
    assert.equal(getEntity(index, 'nonexistent'), undefined)
  })

  it('getChildren returns children of entity', () => {
    const children = getChildren(index, 'parent')
    assert.equal(children.length, 2)
    const ids = children.map((e) => e.id).sort()
    assert.deepEqual(ids, ['child1', 'child2'])
  })

  it('getChildren returns empty for childless entity', () => {
    assert.deepEqual(getChildren(index, 'child1'), [])
  })

  it('getParent returns parent of entity', () => {
    assert.equal(getParent(index, 'child1')?.id, 'parent')
    assert.equal(getParent(index, 'parent'), undefined)
  })

  it('getRelationships returns outgoing by type', () => {
    const refs = getRelationships(index, 'child1', { type: 'reference', direction: 'outgoing' })
    assert.equal(refs.length, 1)
    assert.equal(refs[0].to, 'child2')
  })

  it('getRelationships returns incoming', () => {
    const incoming = getRelationships(index, 'child2', { direction: 'incoming' })
    assert.equal(incoming.length, 2)
  })

  it('getRelationships returns both directions', () => {
    const both = getRelationships(index, 'child1', { direction: 'both' })
    assert.ok(both.length >= 1)
  })

  it('getReferencedEntities returns entities referenced by reference relationships', () => {
    const refs = getReferencedEntities(index, 'child1')
    assert.equal(refs.length, 1)
    assert.equal(refs[0].id, 'child2')
  })

  it('getReferencedEntities returns empty for entity with no references', () => {
    assert.deepEqual(getReferencedEntities(index, 'parent'), [])
  })
})

// ─── Renderer Registry Tests ────────────────────────────────────────────────

describe('RendererRegistry', () => {
  it('registers and retrieves a renderer', () => {
    const registry = new RendererRegistry()
    const mock = new MockRenderer({ id: 'test' })
    registry.register(mock)
    assert.equal(registry.size, 1)
    assert.equal(registry.get('test')?.info.id, 'test')
  })

  it('prevents duplicate registration', () => {
    const registry = new RendererRegistry()
    const mock = new MockRenderer({ id: 'dup' })
    registry.register(mock)
    assert.throws(() => registry.register(mock), /already registered/)
  })

  it('unregisters a renderer', () => {
    const registry = new RendererRegistry()
    const mock = new MockRenderer({ id: 'rem' })
    registry.register(mock)
    assert.ok(registry.unregister('rem'))
    assert.equal(registry.size, 0)
  })

  it('returns false when unregistering nonexistent renderer', () => {
    const registry = new RendererRegistry()
    assert.equal(registry.unregister('ghost'), false)
  })

  it('returns all renderers sorted by priority', () => {
    const registry = new RendererRegistry()
    const low = new MockRenderer({ id: 'low' })
    const high = new MockRenderer({ id: 'high' })
    registry.register(low, 0)
    registry.register(high, 10)
    const all = registry.getAll()
    assert.equal(all.length, 2)
    assert.equal(all[0].info.id, 'high')
    assert.equal(all[1].info.id, 'low')
  })

  it('findByEntityType returns matching renderers', () => {
    const registry = new RendererRegistry()
    const shapeRenderer = new MockRenderer({
      id: 'shape-only',
      capabilities: {
        entityTypes: ['shape'],
        relationshipTypes: [],
        features: [],
      },
    })
    registry.register(shapeRenderer)
    assert.equal(registry.findByEntityType('shape').length, 1)
    assert.equal(registry.findByEntityType('text').length, 0)
  })

  it('findByCapabilities filters renderers by requirements', () => {
    const registry = new RendererRegistry()
    const mock = new MockRenderer({ id: 'full' })
    registry.register(mock)
    const partial = new MockRenderer({
      id: 'partial',
      capabilities: {
        entityTypes: ['shape'],
        relationshipTypes: [],
        features: [],
      },
    })
    registry.register(partial)

    const reqs: SceneRequirements = {
      entityTypes: ['shape', 'text'],
      relationshipTypes: [],
      features: [],
    }

    const results = registry.findByCapabilities(reqs)
    assert.equal(results.length, 1)
    assert.equal(results[0].info.id, 'full')
  })

  it('has returns correct boolean', () => {
    const registry = new RendererRegistry()
    registry.register(new MockRenderer({ id: 'x' }))
    assert.ok(registry.has('x'))
    assert.equal(registry.has('y'), false)
  })

  it('clear removes all renderers', () => {
    const registry = new RendererRegistry()
    registry.register(new MockRenderer({ id: 'a' }))
    registry.register(new MockRenderer({ id: 'b' }))
    registry.clear()
    assert.equal(registry.size, 0)
  })
})

// ─── Capability Matching Tests ──────────────────────────────────────────────

describe('rendererCanHandle', () => {
  it('returns true when renderer supports all entity types', () => {
    const caps = {
      entityTypes: ['shape', 'text'] as EntityType[],
      relationshipTypes: [] as RelationshipType[],
      features: [],
    }
    const reqs: SceneRequirements = {
      entityTypes: ['shape'],
      relationshipTypes: [],
      features: [],
    }
    assert.ok(rendererCanHandle(caps, reqs))
  })

  it('returns false when renderer missing entity type', () => {
    const caps = {
      entityTypes: ['shape'] as EntityType[],
      relationshipTypes: [] as RelationshipType[],
      features: [],
    }
    const reqs: SceneRequirements = {
      entityTypes: ['text'],
      relationshipTypes: [],
      features: [],
    }
    assert.equal(rendererCanHandle(caps, reqs), false)
  })

  it('returns true when renderer supports all features', () => {
    const caps = {
      entityTypes: [] as EntityType[],
      relationshipTypes: [] as RelationshipType[],
      features: ['2d', '3d', 'animations'] as Capability[],
    }
    const reqs: SceneRequirements = {
      entityTypes: [],
      relationshipTypes: [],
      features: ['2d'],
    }
    assert.ok(rendererCanHandle(caps, reqs))
  })
})

// ─── Renderer Selection Tests ───────────────────────────────────────────────

describe('selectRenderer', () => {
  function makeRegisteredRenderers(): Renderer[] {
    return [
      new MockRenderer({
        id: 'full',
        capabilities: allCapabilities(),
      }),
      new MockRenderer({
        id: 'shape-only',
        capabilities: {
          entityTypes: ['shape'],
          relationshipTypes: ['containment', 'reference'],
          features: ['2d'],
        },
      }),
      new MockRenderer({
        id: 'text-only',
        capabilities: {
          entityTypes: ['text'],
          relationshipTypes: [],
          features: [],
        },
      }),
    ]
  }

  it('selects renderer matching entity types', () => {
    const renderers = makeRegisteredRenderers()
    const reqs: SceneRequirements = {
      entityTypes: ['shape'],
      relationshipTypes: [],
      features: [],
    }
    const result = selectRenderer(renderers, reqs)
    assert.ok(result.success)
    assert.ok(result.result)
    assert.ok(
      result.result.rendererId === 'full' || result.result.rendererId === 'shape-only',
    )
  })

  it('selects full renderer when multiple types required', () => {
    const renderers = makeRegisteredRenderers()
    const reqs: SceneRequirements = {
      entityTypes: ['shape', 'text'],
      relationshipTypes: [],
      features: [],
    }
    const result = selectRenderer(renderers, reqs)
    assert.ok(result.success)
    assert.ok(result.result)
    assert.equal(result.result.rendererId, 'full')
  })

  it('returns error when no renderer matches', () => {
    const limitedRenderers: Renderer[] = [
      new MockRenderer({
        id: 'limited',
        capabilities: {
          entityTypes: ['shape'],
          relationshipTypes: [],
          features: [],
        },
      }),
    ]
    const reqs: SceneRequirements = {
      entityTypes: [],
      relationshipTypes: [],
      features: ['procedural' as Capability],
    }
    const result = selectRenderer(limitedRenderers, reqs)
    assert.equal(result.success, false)
    assert.ok(result.errors.length > 0)
    assert.equal(result.errors[0].code, 'NO_MATCH')
  })

  it('selects best match by specificity for first-match strategy', () => {
    const renderers = makeRegisteredRenderers()
    const reqs: SceneRequirements = {
      entityTypes: ['shape'],
      relationshipTypes: [],
      features: [],
    }
    const result = selectRenderer(renderers, reqs, 'first-match')
    assert.ok(result.success)
  })
})

// ─── Scene Requirements Extraction Tests ────────────────────────────────────

describe('extractSceneRequirements', () => {
  it('extracts entity types', () => {
    const scene = makeScene([
      makeEntity('a', 'shape'),
      makeEntity('b', 'text'),
    ])
    const reqs = extractSceneRequirements(scene)
    assert.ok(reqs.entityTypes.includes('shape'))
    assert.ok(reqs.entityTypes.includes('text'))
  })

  it('extracts relationship types', () => {
    const scene = makeScene(
      [makeEntity('a', 'shape'), makeEntity('b', 'shape')],
      [makeRelationship('a', 'b', 'containment')],
    )
    const reqs = extractSceneRequirements(scene)
    assert.ok(reqs.relationshipTypes.includes('containment'))
  })

  it('detects animation features', () => {
    const scene = makeScene(
      [makeEntity('a', 'shape')],
      [],
      {
        animations: [{
          target: 'a',
          keyframes: [{ offset: 0, value: { opacity: 1 } }],
          duration: 1,
        }],
      },
    )
    const reqs = extractSceneRequirements(scene)
    assert.ok(reqs.features.includes('animations'))
  })

  it('detects expression features from properties', () => {
    const scene = makeScene([
      {
        id: 'a',
        type: 'data',
        properties: {
          x: { value: { expr: 'sin(t)' }, anim: { keyframes: [{ offset: 0, value: 1 }], duration: 1 } },
        },
      },
    ])
    const reqs = extractSceneRequirements(scene)
    assert.ok(reqs.features.includes('expressions'))
    assert.ok(reqs.features.includes('animations'))
  })

  it('detects reference features from property values', () => {
    const scene = makeScene([
      {
        id: 'a',
        type: 'shape',
        properties: {
          radius: { value: { ref: 'other' } },
        },
      },
    ])
    const reqs = extractSceneRequirements(scene)
    assert.ok(reqs.features.includes('references'))
  })
})

// ─── Event System Tests ─────────────────────────────────────────────────────

describe('EventSystem', () => {
  it('emits events and receives actions', () => {
    const system = new EventSystem()
    let receivedType = ''

    system.onEvent('click', (event) => {
      receivedType = event.type
      return [{
        id: 'a1',
        payload: { kind: 'set-property', target: 'x', property: 'value', value: 42 },
        sourceEvent: event.type,
        timestamp: Date.now(),
      }]
    })

    const actions = system.emit({
      type: 'click',
      source: { kind: 'user', interaction: 'click' },
      target: 'btn',
      timestamp: Date.now(),
      data: {},
    })

    assert.equal(receivedType, 'click')
    assert.equal(actions.length, 1)
    assert.equal(actions[0].payload.kind, 'set-property')
  })

  it('registers and removes event handlers', () => {
    const system = new EventSystem()
    const id = system.onEvent('hover', () => [])
    assert.equal(system.eventHandlerCount, 1)
    assert.ok(system.offEvent(id))
    assert.equal(system.eventHandlerCount, 0)
  })

  it('returns false when removing nonexistent handler', () => {
    const system = new EventSystem()
    assert.equal(system.offEvent('ghost'), false)
  })

  it('processes event queue', () => {
    const system = new EventSystem()
    let count = 0

    system.onEvent('tick', () => {
      count++
      return []
    })

    system.queueEvent({
      type: 'tick',
      source: { kind: 'timer', elapsedMs: 100 },
      target: 'root',
      timestamp: Date.now(),
      data: {},
    })
    system.queueEvent({
      type: 'tick',
      source: { kind: 'timer', elapsedMs: 200 },
      target: 'root',
      timestamp: Date.now(),
      data: {},
    })

    system.processQueue()
    assert.equal(count, 2)
    assert.equal(system.queueSize, 0)
  })

  it('registers and executes action handlers', () => {
    const system = new EventSystem()
    let received = false

    system.onAction('set-property', (action) => {
      received = true
      assert.equal(action.payload.kind, 'set-property')
    })

    system.executeAction({
      id: 'a1',
      payload: { kind: 'set-property', target: 'x', property: 'val', value: 1 },
      sourceEvent: 'click',
      timestamp: Date.now(),
    })

    assert.ok(received)
  })

  it('handles custom action types', () => {
    const system = new EventSystem()
    let customReceived = false

    system.onAction('zoom', (action) => {
      customReceived = true
      assert.equal(action.payload.kind, 'custom')
    })

    system.executeAction({
      id: 'a1',
      payload: { kind: 'custom', actionType: 'zoom', data: { level: 2 } },
      sourceEvent: 'scroll',
      timestamp: Date.now(),
    })

    assert.ok(customReceived)
  })

  it('clear resets everything', () => {
    const system = new EventSystem()
    system.onEvent('x', () => [])
    system.onAction('y', () => {})
    system.queueEvent({
      type: 'x',
      source: { kind: 'system', trigger: 'test' },
      target: 'root',
      timestamp: 0,
      data: {},
    })
    system.clear()
    assert.equal(system.eventHandlerCount, 0)
    assert.equal(system.actionHandlerCount, 0)
    assert.equal(system.queueSize, 0)
  })
})

// ─── VisualizationEngine Tests ──────────────────────────────────────────────

describe('VisualizationEngine', () => {
  it('renders with explicit renderer target', async () => {
    const engine = new VisualizationEngine()
    const mock = new MockRenderer({ id: 'test-renderer' })
    engine.register(mock)

    const scene = makeScene([makeEntity('a', 'shape')])
    const result = await engine.render({ scene, target: 'test-renderer' })

    assert.ok(result.success)
    assert.equal(result.metadata.rendererId, 'test-renderer')
    assert.equal(mock.renderCount, 1)
  })

  it('renders with auto-selected renderer', async () => {
    const engine = new VisualizationEngine()
    engine.register(new MockRenderer({ id: 'auto' }))

    const scene = makeScene([makeEntity('a', 'shape')])
    const result = await engine.render({ scene })

    assert.ok(result.success)
    assert.equal(result.metadata.rendererId, 'auto')
  })

  it('returns error when target renderer not found', async () => {
    const engine = new VisualizationEngine()
    const result = await engine.render({
      scene: makeScene([makeEntity('a', 'shape')]),
      target: 'nonexistent',
    })

    assert.equal(result.success, false)
    assert.equal(result.errors[0].code, 'RENDERER_NOT_FOUND')
  })

  it('returns error when no renderer matches', async () => {
    const engine = new VisualizationEngine()
    engine.register(
      new MockRenderer({
        id: 'minimal',
        capabilities: {
          entityTypes: ['text'],
          relationshipTypes: [],
          features: [],
        },
      }),
    )

    const scene = makeScene([makeEntity('a', 'shape')])
    const result = await engine.render({ scene })

    assert.equal(result.success, false)
    assert.equal(result.errors[0].code, 'NO_MATCH')
  })

  it('rejects invalid scene', async () => {
    const engine = new VisualizationEngine()
    engine.register(new MockRenderer({ id: 'm' }))
    const result = await engine.render({
      scene: { version: '1.0' } as unknown as Scene,
    })

    assert.equal(result.success, false)
    assert.equal(result.errors[0].code, 'INVALID_SCENE')
  })

  it('initializes and disposes all renderers', async () => {
    const engine = new VisualizationEngine()
    const a = new MockRenderer({ id: 'a' })
    const b = new MockRenderer({ id: 'b' })
    engine.register(a)
    engine.register(b)

    await engine.initialize()
    assert.ok(a.initialized)
    assert.ok(b.initialized)

    await engine.dispose()
    assert.ok(a.disposed)
    assert.ok(b.disposed)
  })

  it('unregisters renderer', () => {
    const engine = new VisualizationEngine()
    engine.register(new MockRenderer({ id: 'x' }))
    assert.ok(engine.unregister('x'))
    assert.equal(engine.registry.size, 0)
  })

  it('handles renderer exceptions gracefully', async () => {
    const engine = new VisualizationEngine()
    engine.register(
      new MockRenderer({
        id: 'crasher',
        renderFn: () => {
          throw new Error('boom')
        },
      }),
    )

    const result = await engine.render({
      scene: makeScene([makeEntity('a', 'shape')]),
      target: 'crasher',
    })

    assert.equal(result.success, false)
    assert.equal(result.errors[0].code, 'RENDER_FAILED')
    assert.ok(result.errors[0].message.includes('boom'))
  })
})

// ─── MockRenderer Tests ─────────────────────────────────────────────────────

describe('MockRenderer', () => {
  it('initializes and disposes', async () => {
    const mock = new MockRenderer()
    assert.equal(mock.initialized, false)
    await mock.initialize()
    assert.ok(mock.initialized)
    await mock.dispose()
    assert.ok(mock.disposed)
  })

  it('renders and tracks count', async () => {
    const mock = new MockRenderer()
    const ctx: RenderContext = {
      request: { scene: makeScene([makeEntity('a', 'shape')]) },
      scene: makeScene([makeEntity('a', 'shape')]),
      timestamp: Date.now(),
    }
    await mock.render(ctx)
    assert.equal(mock.renderCount, 1)
    assert.equal(mock.lastContext, ctx)
  })

  it('can use custom render function', async () => {
    const mock = new MockRenderer({
      renderFn: (_ctx) => ({
        success: true,
        output: { kind: 'text' as const, data: 'custom' },
        errors: [],
        metadata: { rendererId: 'mock', renderTimeMs: 0, warnings: [] },
      }),
    })

    const result = await mock.render({
      request: { scene: makeScene([makeEntity('a', 'shape')]) },
      scene: makeScene([makeEntity('a', 'shape')]),
      timestamp: Date.now(),
    })

    assert.ok(result.success)
    assert.equal(result.output?.data, 'custom')
  })

  it('canReport checks capabilities', () => {
    const narrow = new MockRenderer({
      id: 'narrow',
      capabilities: {
        entityTypes: ['shape'],
        relationshipTypes: [],
        features: [],
      },
    })
    const reqs: SceneRequirements = {
      entityTypes: ['shape'],
      relationshipTypes: [],
      features: [],
    }
    assert.ok(narrow.canRender(makeScene([]), reqs))

    const narrowReq: SceneRequirements = {
      entityTypes: ['text'],
      relationshipTypes: [],
      features: [],
    }
    assert.equal(narrow.canRender(makeScene([]), narrowReq), false)
  })
})
