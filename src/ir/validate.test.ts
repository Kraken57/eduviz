import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { validateScene, isScene } from './validate.js'
import type { Scene } from './types.js'

// ─── Helpers ───────────────────────────────────────────────────────────────

function expectValid(doc: unknown): Scene {
  const result = validateScene(doc)
  assert.ok(result.valid, `expected valid, got errors: ${JSON.stringify(result.errors)}`)
  return doc as Scene
}

function expectInvalid(doc: unknown): void {
  const result = validateScene(doc)
  assert.ok(!result.valid, 'expected invalid, but validation passed')
}

// ─── 1. Mathematical Visualization ─────────────────────────────────────────

describe('mathematical visualization', () => {
  it('represents a circle with animated radius', () => {
    const doc = {
      meta: { version: '1.0', title: 'Circle' },
      entities: [
        {
          id: 'circle1',
          type: 'shape',
          name: 'Unit Circle',
          properties: {
            shape: 'circle',
            radius: {
              value: 1,
              anim: {
                keyframes: [
                  { offset: 0, value: 1 },
                  { offset: 1, value: 2 },
                ],
                duration: 2000,
                easing: 'easeInOut',
              },
            },
            fill: { value: '#4A90D9' },
            stroke: { value: '#2C5F8A' },
            strokeWidth: { value: 2 },
          },
        },
        {
          id: 'label1',
          type: 'text',
          properties: {
            text: { value: 'r = 1' },
            fontSize: { value: 16 },
            position: { value: { x: 100, y: 50 } },
          },
        },
      ],
      relationships: [
        { type: 'reference', from: 'label1', to: 'circle1' },
      ],
    }

    const scene = expectValid(doc)
    assert.equal(scene.entities.length, 2)
    assert.equal(scene.entities[0].type, 'shape')
    assert.equal(scene.entities[1].type, 'text')
  })

  it('represents a coordinate plane with axes', () => {
    const doc = {
      meta: { version: '1.0', title: 'Coordinate Plane' },
      entities: [
        {
          id: 'x-axis',
          type: 'shape',
          properties: {
            shape: 'line',
            x1: { value: -200 },
            y1: { value: 0 },
            x2: { value: 200 },
            y2: { value: 0 },
            stroke: { value: '#333' },
          },
        },
        {
          id: 'y-axis',
          type: 'shape',
          properties: {
            shape: 'line',
            x1: { value: 0 },
            y1: { value: -200 },
            x2: { value: 0 },
            y2: { value: 200 },
            stroke: { value: '#333' },
          },
        },
        {
          id: 'function1',
          type: 'shape',
          properties: {
            shape: 'path',
            d: { value: 'M-200,100 Q0,-100 200,100' },
            stroke: { value: '#E74C3C' },
            strokeWidth: { value: 2 },
            fill: { value: 'none' },
          },
        },
      ],
      relationships: [
        { type: 'reference', from: 'function1', to: 'x-axis' },
        { type: 'reference', from: 'function1', to: 'y-axis' },
      ],
      viewport: { width: 400, height: 400, background: '#FFFFFF' },
    }

    const scene = expectValid(doc)
    assert.equal(scene.viewport?.width, 400)
  })
})

// ─── 2. Physics Visualization ──────────────────────────────────────────────

describe('physics visualization', () => {
  it('represents a particle with mass, velocity, position, and force', () => {
    const doc = {
      meta: { version: '1.0', title: 'Projectile Motion' },
      variables: { gravity: 9.81, dt: 0.016 },
      entities: [
        {
          id: 'particle1',
          type: 'abstract',
          name: 'Projectile',
          properties: {
            mass: { value: 1.0 },
            position: { value: { x: 0, y: 0 } },
            velocity: { value: { x: 10, y: 20 } },
            acceleration: {
              value: { ref: 'gravity_field', property: 'acceleration' },
            },
          },
        },
        {
          id: 'gravity_field',
          type: 'abstract',
          name: 'Gravity',
          properties: {
            acceleration: { value: { x: 0, y: -9.81 } },
          },
        },
        {
          id: 'ground',
          type: 'shape',
          properties: {
            shape: 'line',
            x1: { value: -100 },
            y1: { value: 0 },
            x2: { value: 300 },
            y2: { value: 0 },
            stroke: { value: '#8B4513' },
            strokeWidth: { value: 3 },
          },
        },
        {
          id: 'trail',
          type: 'data',
          properties: {
            chartType: { value: 'scatter' },
            dataPoints: {
              value: [
                [0, 0], [10, 20], [20, 36], [30, 48],
              ],
            },
            stroke: { value: '#3498DB' },
          },
        },
      ],
      relationships: [
        { type: 'constraint', from: 'particle1', to: 'gravity_field', label: 'subject to' },
        { type: 'containment', from: 'particle1', to: 'ground', label: 'above' },
        { type: 'reference', from: 'trail', to: 'particle1', label: 'trajectory of' },
      ],
      viewport: { width: 500, height: 300 },
    }

    const scene = expectValid(doc)
    const vars = scene.variables
    assert.ok(vars)
    assert.equal(vars.gravity, 9.81)
  })

  it('represents linked springs with forces', () => {
    const doc = {
      meta: { version: '1.0', title: 'Spring System' },
      entities: [
        {
          id: 'mass1',
          type: 'abstract',
          properties: {
            mass: { value: 2 },
            position: { value: { x: 0, y: 0 } },
            velocity: { value: { x: 0, y: 0 } },
          },
        },
        {
          id: 'mass2',
          type: 'abstract',
          properties: {
            mass: { value: 3 },
            position: { value: { x: 5, y: 0 } },
            velocity: { value: { x: 0, y: 0 } },
          },
        },
        {
          id: 'spring1',
          type: 'connection',
          properties: {
            stiffness: { value: 10 },
            restLength: { value: 4 },
            damping: { value: 0.1 },
          },
        },
      ],
      relationships: [
        { type: 'edge', from: 'mass1', to: 'mass2', label: 'connected by' },
        { type: 'containment', from: 'spring1', to: 'mass1' },
        { type: 'containment', from: 'spring1', to: 'mass2' },
      ],
    }

    expectValid(doc)
  })
})

// ─── 3. Hierarchical Biological Scene ──────────────────────────────────────

describe('hierarchical biological scene', () => {
  it('represents a cell with organelles', () => {
    const doc = {
      meta: { version: '1.0', title: 'Animal Cell' },
      entities: [
        {
          id: 'cell',
          type: 'group',
          name: 'Animal Cell',
          properties: {
            shape: { value: 'ellipse' },
            width: { value: 200 },
            height: { value: 150 },
            fill: { value: '#F0F8FF' },
            stroke: { value: '#2C3E50' },
            strokeWidth: { value: 3 },
          },
        },
        {
          id: 'nucleus',
          type: 'group',
          name: 'Nucleus',
          properties: {
            shape: { value: 'circle' },
            radius: { value: 40 },
            fill: { value: '#9B59B6' },
            stroke: { value: '#6C3483' },
            position: { value: { x: 0, y: 0 } },
          },
        },
        {
          id: 'nucleolus',
          type: 'shape',
          name: 'Nucleolus',
          properties: {
            shape: { value: 'circle' },
            radius: { value: 12 },
            fill: { value: '#7D3C98' },
            position: { value: { x: 5, y: -3 } },
          },
        },
        {
          id: 'mito1',
          type: 'shape',
          name: 'Mitochondrion',
          properties: {
            shape: { value: 'ellipse' },
            width: { value: 30 },
            height: { value: 15 },
            fill: { value: '#E74C3C' },
            stroke: { value: '#C0392B' },
            position: { value: { x: 60, y: 30 } },
            rotation: { value: 30 },
          },
        },
        {
          id: 'mito2',
          type: 'shape',
          name: 'Mitochondrion',
          properties: {
            shape: { value: 'ellipse' },
            width: { value: 28 },
            height: { value: 14 },
            fill: { value: '#E74C3C' },
            stroke: { value: '#C0392B' },
            position: { value: { x: -50, y: -25 } },
            rotation: { value: -20 },
          },
        },
        {
          id: 'membrane',
          type: 'shape',
          name: 'Cell Membrane',
          properties: {
            shape: { value: 'ellipse' },
            width: { value: 200 },
            height: { value: 150 },
            fill: { value: 'none' },
            stroke: { value: '#2C3E50' },
            strokeWidth: { value: 3 },
          },
        },
      ],
      relationships: [
        { type: 'containment', from: 'cell', to: 'nucleus', label: 'contains' },
        { type: 'containment', from: 'nucleus', to: 'nucleolus', label: 'contains' },
        { type: 'containment', from: 'cell', to: 'mito1', label: 'contains' },
        { type: 'containment', from: 'cell', to: 'mito2', label: 'contains' },
        { type: 'containment', from: 'cell', to: 'membrane', label: 'bounded by' },
      ],
    }

    const scene = expectValid(doc)
    const containmentRels = scene.relationships!.filter((r) => r.type === 'containment')
    assert.equal(containmentRels.length, 5)
  })
})

// ─── 4. Process / Flow Scene ───────────────────────────────────────────────

describe('process/flow scene', () => {
  it('represents a state machine with transitions', () => {
    const doc = {
      meta: { version: '1.0', title: 'Water Cycle' },
      entities: [
        {
          id: 'evaporation',
          type: 'shape',
          name: 'Evaporation',
          properties: {
            shape: { value: 'roundedRect' },
            width: { value: 120 },
            height: { value: 50 },
            fill: { value: '#3498DB' },
            label: { value: 'Evaporation' },
          },
        },
        {
          id: 'condensation',
          type: 'shape',
          name: 'Condensation',
          properties: {
            shape: { value: 'roundedRect' },
            width: { value: 120 },
            height: { value: 50 },
            fill: { value: '#2ECC71' },
            label: { value: 'Condensation' },
          },
        },
        {
          id: 'precipitation',
          type: 'shape',
          name: 'Precipitation',
          properties: {
            shape: { value: 'roundedRect' },
            width: { value: 120 },
            height: { value: 50 },
            fill: { value: '#9B59B6' },
            label: { value: 'Precipitation' },
          },
        },
        {
          id: 'collection',
          type: 'shape',
          name: 'Collection',
          properties: {
            shape: { value: 'roundedRect' },
            width: { value: 120 },
            height: { value: 50 },
            fill: { value: '#E67E22' },
            label: { value: 'Collection' },
          },
        },
      ],
      relationships: [
        { type: 'edge', from: 'evaporation', to: 'condensation', label: 'heat rises' },
        { type: 'edge', from: 'condensation', to: 'precipitation', label: 'cools' },
        { type: 'edge', from: 'precipitation', to: 'collection', label: 'falls' },
        { type: 'edge', from: 'collection', to: 'evaporation', label: 'absorbs heat' },
      ],
      timelines: [
        {
          id: 'cycle',
          steps: [
            { time: 0, description: 'Water absorbs heat' },
            { time: 1000, description: 'Water evaporates' },
            { time: 2000, description: 'Vapor condenses' },
            { time: 3000, description: 'Rain falls' },
          ],
          loop: true,
        },
      ],
    }

    const scene = expectValid(doc)
    assert.equal(scene.relationships!.length, 4)
    assert.equal(scene.timelines!.length, 1)
    assert.equal(scene.timelines![0].steps!.length, 4)
  })
})

// ─── 5. Graph-like Scene ───────────────────────────────────────────────────

describe('graph-like scene', () => {
  it('represents a directed graph with nodes and edges', () => {
    const doc = {
      meta: { version: '1.0', title: 'Social Network' },
      entities: [
        {
          id: 'n1',
          type: 'graph',
          name: 'Alice',
          properties: {
            shape: { value: 'circle' },
            radius: { value: 25 },
            fill: { value: '#3498DB' },
            position: { value: { x: 0, y: 0 } },
          },
        },
        {
          id: 'n2',
          type: 'graph',
          name: 'Bob',
          properties: {
            shape: { value: 'circle' },
            radius: { value: 25 },
            fill: { value: '#E74C3C' },
            position: { value: { x: 100, y: 0 } },
          },
        },
        {
          id: 'n3',
          type: 'graph',
          name: 'Carol',
          properties: {
            shape: { value: 'circle' },
            radius: { value: 25 },
            fill: { value: '#2ECC71' },
            position: { value: { x: 50, y: 80 } },
          },
        },
        {
          id: 'e1',
          type: 'connection',
          properties: {
            weight: { value: 5 },
          },
        },
        {
          id: 'e2',
          type: 'connection',
          properties: {
            weight: { value: 3 },
          },
        },
        {
          id: 'e3',
          type: 'connection',
          properties: {
            weight: { value: 7 },
          },
        },
      ],
      relationships: [
        { type: 'edge', from: 'n1', to: 'n2', label: 'friends', properties: { weight: { value: 5 } } },
        { type: 'edge', from: 'n2', to: 'n3', label: 'colleagues', properties: { weight: { value: 3 } } },
        { type: 'edge', from: 'n1', to: 'n3', label: 'family', properties: { weight: { value: 7 } } },
      ],
    }

    const scene = expectValid(doc)
    const nodes = scene.entities.filter((e) => e.type === 'graph')
    const edges = scene.relationships!.filter((r) => r.type === 'edge')
    assert.equal(nodes.length, 3)
    assert.equal(edges.length, 3)
  })

  it('represents a tree hierarchy', () => {
    const doc = {
      meta: { version: '1.0', title: 'File System Tree' },
      entities: [
        { id: 'root', type: 'group', name: 'root', properties: {} },
        { id: 'src', type: 'group', name: 'src', properties: {} },
        { id: 'tests', type: 'group', name: 'tests', properties: {} },
        { id: 'index', type: 'shape', name: 'index.ts', properties: {} },
        { id: 'test1', type: 'shape', name: 'test.ts', properties: {} },
      ],
      relationships: [
        { type: 'containment', from: 'root', to: 'src' },
        { type: 'containment', from: 'root', to: 'tests' },
        { type: 'containment', from: 'src', to: 'index' },
        { type: 'containment', from: 'tests', to: 'test1' },
      ],
    }

    expectValid(doc)
  })
})

// ─── 6. Animations and Interactions ────────────────────────────────────────

describe('animations and interactions', () => {
  it('represents keyframe animations', () => {
    const doc = {
      meta: { version: '1.0', title: 'Bouncing Ball' },
      entities: [
        {
          id: 'ball',
          type: 'shape',
          name: 'Ball',
          properties: {
            shape: { value: 'circle' },
            radius: { value: 20 },
            fill: { value: '#E74C3C' },
            position: {
              value: { x: 100, y: 50 },
              anim: {
                keyframes: [
                  { offset: 0, value: { x: 100, y: 50 } },
                  { offset: 0.5, value: { x: 100, y: 200 } },
                  { offset: 1, value: { x: 100, y: 50 } },
                ],
                duration: 1000,
                easing: 'easeInOut',
                loop: true,
              },
            },
          },
        },
      ],
      animations: [
        {
          target: 'ball.radius',
          keyframes: [
            { offset: 0, value: 20 },
            { offset: 0.5, value: 25 },
            { offset: 1, value: 20 },
          ],
          duration: 1000,
          easing: 'linear',
          loop: true,
        },
      ],
    }

    const scene = expectValid(doc)
    assert.equal(scene.animations!.length, 1)
    assert.equal(scene.animations![0].target, 'ball.radius')
  })

  it('represents timeline-based animation', () => {
    const doc = {
      meta: { version: '1.0', title: 'Proof Steps' },
      entities: [
        {
          id: 'step1',
          type: 'text',
          properties: {
            text: { value: 'Given: a = b' },
            fontSize: { value: 18 },
            opacity: { value: 1 },
          },
        },
        {
          id: 'step2',
          type: 'text',
          properties: {
            text: { value: 'Multiply both sides by a: a² = ab' },
            fontSize: { value: 18 },
            opacity: { value: 0 },
          },
        },
        {
          id: 'step3',
          type: 'text',
          properties: {
            text: { value: 'Subtract b²: a² - b² = ab - b²' },
            fontSize: { value: 18 },
            opacity: { value: 0 },
          },
        },
      ],
      animations: [
        {
          target: 'step2.opacity',
          keyframes: [
            { offset: 0, value: 0 },
            { offset: 1, value: 1 },
          ],
          duration: 500,
          delay: 2000,
        },
        {
          target: 'step3.opacity',
          keyframes: [
            { offset: 0, value: 0 },
            { offset: 1, value: 1 },
          ],
          duration: 500,
          delay: 4000,
        },
      ],
      timelines: [
        {
          id: 'proof',
          steps: [
            { time: 0, description: 'State given' },
            { time: 2000, description: 'Multiply by a', animations: ['step2.opacity'] },
            { time: 4000, description: 'Subtract b²', animations: ['step3.opacity'] },
          ],
          auto: true,
        },
      ],
    }

    const scene = expectValid(doc)
    assert.equal(scene.animations!.length, 2)
    assert.equal(scene.timelines![0].steps!.length, 3)
  })

  it('represents user interactions', () => {
    const doc = {
      meta: { version: '1.0', title: 'Interactive Toggle' },
      entities: [
        {
          id: 'toggle_btn',
          type: 'shape',
          name: 'Toggle Button',
          properties: {
            shape: { value: 'roundedRect' },
            width: { value: 100 },
            height: { value: 40 },
            fill: { value: '#3498DB' },
            label: { value: 'Toggle' },
            cursor: {
              value: 'pointer',
              interact: {
                on: [
                  {
                    event: 'click',
                    action: { type: 'toggle', target: 'target_box.fill' },
                  },
                ],
              },
            },
          },
        },
        {
          id: 'target_box',
          type: 'shape',
          name: 'Target Box',
          properties: {
            shape: { value: 'rect' },
            width: { value: 80 },
            height: { value: 80 },
            fill: { value: '#2ECC71' },
          },
        },
        {
          id: 'slider',
          type: 'shape',
          name: 'Speed Slider',
          properties: {
            shape: { value: 'slider' },
            min: { value: 0 },
            max: { value: 100 },
            value: { value: 50 },
            cursor: {
              value: 'pointer',
              interact: {
                on: [
                  {
                    event: 'input',
                    action: { type: 'set', target: 'ball.anim.duration', value: { ref: 'slider', property: 'value' } },
                  },
                ],
              },
            },
          },
        },
        {
          id: 'ball',
          type: 'shape',
          properties: {
            shape: { value: 'circle' },
            radius: { value: 15 },
            fill: { value: '#E74C3C' },
          },
        },
      ],
      interactions: [
        {
          event: 'click',
          target: 'toggle_btn',
          action: {
            type: 'tooltip',
            message: 'Click to toggle the box color',
          },
        },
      ],
    }

    expectValid(doc)
  })

  it('represents easing functions', () => {
    const doc = {
      meta: { version: '1.0', title: 'Easing Comparison' },
      entities: [
        {
          id: 'box_linear',
          type: 'shape',
          properties: {
            shape: { value: 'rect' },
            width: { value: 20 },
            height: { value: 20 },
            fill: { value: '#3498DB' },
            position: {
              value: { x: 0, y: 0 },
              anim: {
                keyframes: [
                  { offset: 0, value: { x: 0, y: 0 } },
                  { offset: 1, value: { x: 200, y: 0 } },
                ],
                duration: 2000,
                easing: 'linear',
              },
            },
          },
        },
        {
          id: 'box_easein',
          type: 'shape',
          properties: {
            shape: { value: 'rect' },
            width: { value: 20 },
            height: { value: 20 },
            fill: { value: '#E74C3C' },
            position: {
              value: { x: 0, y: 30 },
              anim: {
                keyframes: [
                  { offset: 0, value: { x: 0, y: 30 } },
                  { offset: 1, value: { x: 200, y: 30 } },
                ],
                duration: 2000,
                easing: 'easeIn',
              },
            },
          },
        },
        {
          id: 'box_spring',
          type: 'shape',
          properties: {
            shape: { value: 'rect' },
            width: { value: 20 },
            height: { value: 20 },
            fill: { value: '#2ECC71' },
            position: {
              value: { x: 0, y: 60 },
              anim: {
                keyframes: [
                  { offset: 0, value: { x: 0, y: 60 } },
                  { offset: 1, value: { x: 200, y: 60 } },
                ],
                duration: 2000,
                easing: 'spring',
              },
            },
          },
        },
      ],
    }

    const scene = expectValid(doc)
    assert.equal(scene.entities.length, 3)
  })
})

// ─── 7. Invalid IR Rejection ──────────────────────────────────────────────

describe('invalid IR rejection', () => {
  it('rejects non-object input', () => {
    expectInvalid(null)
    expectInvalid(undefined)
    expectInvalid('string')
    expectInvalid(42)
    expectInvalid(true)
    expectInvalid([])
  })

  it('rejects missing meta', () => {
    expectInvalid({ entities: [{ id: 'a', type: 'shape', properties: {} }] })
  })

  it('rejects missing meta.version', () => {
    expectInvalid({
      meta: { title: 'Test' },
      entities: [{ id: 'a', type: 'shape', properties: {} }],
    })
  })

  it('rejects missing entities', () => {
    expectInvalid({ meta: { version: '1.0' } })
  })

  it('rejects empty entities array', () => {
    expectInvalid({ meta: { version: '1.0' }, entities: [] })
  })

  it('rejects entity with missing id', () => {
    expectInvalid({
      meta: { version: '1.0' },
      entities: [{ type: 'shape', properties: {} }],
    })
  })

  it('rejects entity with invalid type', () => {
    expectInvalid({
      meta: { version: '1.0' },
      entities: [{ id: 'a', type: 'bogus', properties: {} }],
    })
  })

  it('rejects entity with empty id', () => {
    expectInvalid({
      meta: { version: '1.0' },
      entities: [{ id: '', type: 'shape', properties: {} }],
    })
  })

  it('rejects relationship referencing unknown entity', () => {
    expectInvalid({
      meta: { version: '1.0' },
      entities: [{ id: 'a', type: 'shape', properties: {} }],
      relationships: [{ type: 'edge', from: 'a', to: 'nonexistent' }],
    })
  })

  it('rejects animation referencing unknown entity', () => {
    expectInvalid({
      meta: { version: '1.0' },
      entities: [{ id: 'a', type: 'shape', properties: {} }],
      animations: [
        {
          target: 'missing.prop',
          keyframes: [{ offset: 0, value: 0 }],
          duration: 1000,
        },
      ],
    })
  })

  it('rejects relationship with invalid type', () => {
    expectInvalid({
      meta: { version: '1.0' },
      entities: [{ id: 'a', type: 'shape', properties: {} }],
      relationships: [{ type: 'bogus', from: 'a', to: 'a' }],
    })
  })

  it('rejects animation with missing keyframes', () => {
    expectInvalid({
      meta: { version: '1.0' },
      entities: [{ id: 'a', type: 'shape', properties: {} }],
      animations: [{ target: 'a.prop', duration: 1000 }],
    })
  })

  it('rejects animation with negative duration', () => {
    expectInvalid({
      meta: { version: '1.0' },
      entities: [{ id: 'a', type: 'shape', properties: {} }],
      animations: [
        {
          target: 'a.prop',
          keyframes: [{ offset: 0, value: 0 }],
          duration: -100,
        },
      ],
    })
  })

  it('rejects keyframe with missing value', () => {
    expectInvalid({
      meta: { version: '1.0' },
      entities: [{ id: 'a', type: 'shape', properties: {} }],
      animations: [
        {
          target: 'a.prop',
          keyframes: [{ offset: 0 }],
          duration: 1000,
        },
      ],
    })
  })

  it('rejects variables as non-object', () => {
    expectInvalid({
      meta: { version: '1.0' },
      entities: [{ id: 'a', type: 'shape', properties: {} }],
      variables: 'not an object',
    })
  })

  it('reports multiple errors', () => {
    const result = validateScene({})
    assert.ok(result.errors.length >= 2)
  })
})

// ─── isScene Type Guard ────────────────────────────────────────────────────

describe('isScene type guard', () => {
  it('returns true for valid scene', () => {
    const doc = {
      meta: { version: '1.0' },
      entities: [{ id: 'a', type: 'shape', properties: {} }],
    }
    assert.ok(isScene(doc))
  })

  it('returns false for invalid scene', () => {
    assert.ok(!isScene(null))
    assert.ok(!isScene({}))
    assert.ok(!isScene({ meta: { version: '1.0' } }))
  })
})
