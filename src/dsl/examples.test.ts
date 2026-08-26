import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { validateScene } from '../ir/validate.js'
import type { Scene } from '../ir/types.js'
import {
  val,
  animated,
  interactive,
  ref,
  kf,
  edge,
  contains,
  constrained,
  referenced,
  animBinding,
  step,
  timeline,
  shape,
  text,
  data,
  graph,
  connection,
  abstractEntity,
  group,
  scene,
  viewport,
} from './index.js'

// ─── Helpers ────────────────────────────────────────────────────────────────

function expectValid(doc: unknown): Scene {
  const result = validateScene(doc)
  assert.ok(result.valid, `expected valid, got errors: ${JSON.stringify(result.errors)}`)
  return doc as Scene
}

// ─── 1. Mathematics ─────────────────────────────────────────────────────────

describe('math DSL example', () => {
  it('builds a circle with animated radius', () => {
    const s = scene('Circle', [
      shape('circle1', 'circle', {
        radius: animated(1, [kf(0, 1), kf(1, 2)], 2000, { easing: 'easeInOut' }),
        fill: val('#4A90D9'),
        stroke: val('#2C5F8A'),
        strokeWidth: val(2),
      }, { name: 'Unit Circle' }),
      text('label1', 'r = 1', {
        fontSize: val(16),
        position: val({ x: 100, y: 50 } as const),
      }),
    ], {
      relationships: [referenced('label1', 'circle1')],
    })

    expectValid(s)
    assert.equal(s.entities.length, 2)
    assert.equal(s.entities[0].type, 'shape')
  })

  it('builds a coordinate plane with function curve', () => {
    const s = scene('Coordinate Plane', [
      shape('x-axis', 'line', {
        x1: val(-200), y1: val(0), x2: val(200), y2: val(0), stroke: val('#333'),
      }),
      shape('y-axis', 'line', {
        x1: val(0), y1: val(-200), x2: val(0), y2: val(200), stroke: val('#333'),
      }),
      shape('function1', 'path', {
        d: val('M-200,100 Q0,-100 200,100'),
        stroke: val('#E74C3C'), strokeWidth: val(2), fill: val('none'),
      }),
    ], {
      relationships: [
        referenced('function1', 'x-axis'),
        referenced('function1', 'y-axis'),
      ],
      viewport: viewport(400, 400, '#FFFFFF'),
    })

    expectValid(s)
    assert.equal(s.viewport?.width, 400)
  })
})

// ─── 2. Physics ─────────────────────────────────────────────────────────────

describe('physics DSL example', () => {
  it('builds projectile motion with variables', () => {
    const s = scene('Projectile Motion', [
      abstractEntity('particle1', {
        mass: val(1.0),
        position: val({ x: 0, y: 0 }),
        velocity: val({ x: 10, y: 20 }),
        acceleration: val(ref('gravity_field', 'acceleration')),
      }, { name: 'Projectile' }),
      abstractEntity('gravity_field', {
        acceleration: val({ x: 0, y: -9.81 }),
      }, { name: 'Gravity' }),
      shape('ground', 'line', {
        x1: val(-100), y1: val(0), x2: val(300), y2: val(0),
        stroke: val('#8B4513'), strokeWidth: val(3),
      }),
      data('trail', [[0, 0], [10, 20], [20, 36], [30, 48]], {
        chartType: val('scatter'),
        stroke: val('#3498DB'),
      }),
    ], {
      variables: { gravity: 9.81, dt: 0.016 },
      relationships: [
        constrained('particle1', 'gravity_field', 'subject to'),
        contains('particle1', 'ground', 'above'),
        referenced('trail', 'particle1', 'trajectory of'),
      ],
      viewport: viewport(500, 300),
    })

    const result = expectValid(s)
    assert.equal(result.variables?.gravity, 9.81)
  })

  it('builds linked springs', () => {
    const s = scene('Spring System', [
      abstractEntity('mass1', {
        mass: val(2),
        position: val({ x: 0, y: 0 }),
        velocity: val({ x: 0, y: 0 }),
      }),
      abstractEntity('mass2', {
        mass: val(3),
        position: val({ x: 5, y: 0 }),
        velocity: val({ x: 0, y: 0 }),
      }),
      connection('spring1', {
        stiffness: val(10),
        restLength: val(4),
        damping: val(0.1),
      }),
    ], {
      relationships: [
        edge('mass1', 'mass2', 'connected by'),
        contains('spring1', 'mass1'),
        contains('spring1', 'mass2'),
      ],
    })

    expectValid(s)
  })
})

// ─── 3. Biology ─────────────────────────────────────────────────────────────

describe('biology DSL example', () => {
  it('builds a cell with organelles', () => {
    const s = scene('Animal Cell', [
      group('cell', {
        shape: val('ellipse'),
        width: val(200), height: val(150),
        fill: val('#F0F8FF'), stroke: val('#2C3E50'), strokeWidth: val(3),
      }, { name: 'Animal Cell' }),
      group('nucleus', {
        shape: val('circle'),
        radius: val(40),
        fill: val('#9B59B6'), stroke: val('#6C3483'),
        position: val({ x: 0, y: 0 }),
      }, { name: 'Nucleus' }),
      shape('nucleolus', 'circle', {
        radius: val(12),
        fill: val('#7D3C98'),
        position: val({ x: 5, y: -3 }),
      }, { name: 'Nucleolus' }),
      shape('mito1', 'ellipse', {
        width: val(30), height: val(15),
        fill: val('#E74C3C'), stroke: val('#C0392B'),
        position: val({ x: 60, y: 30 }),
        rotation: val(30),
      }, { name: 'Mitochondrion' }),
      shape('mito2', 'ellipse', {
        width: val(28), height: val(14),
        fill: val('#E74C3C'), stroke: val('#C0392B'),
        position: val({ x: -50, y: -25 }),
        rotation: val(-20),
      }, { name: 'Mitochondrion' }),
    ], {
      relationships: [
        contains('cell', 'nucleus', 'contains'),
        contains('nucleus', 'nucleolus', 'contains'),
        contains('cell', 'mito1', 'contains'),
        contains('cell', 'mito2', 'contains'),
      ],
    })

    const result = expectValid(s)
    const containmentRels = result.relationships!.filter((r) => r.type === 'containment')
    assert.equal(containmentRels.length, 4)
  })
})

// ─── 4. Process Flow ────────────────────────────────────────────────────────

describe('process DSL example', () => {
  it('builds a state machine with timeline', () => {
    const s = scene('Water Cycle', [
      shape('evaporation', 'roundedRect', {
        width: val(120), height: val(50), fill: val('#3498DB'),
        label: val('Evaporation'),
      }, { name: 'Evaporation' }),
      shape('condensation', 'roundedRect', {
        width: val(120), height: val(50), fill: val('#2ECC71'),
        label: val('Condensation'),
      }, { name: 'Condensation' }),
      shape('precipitation', 'roundedRect', {
        width: val(120), height: val(50), fill: val('#9B59B6'),
        label: val('Precipitation'),
      }, { name: 'Precipitation' }),
      shape('collection', 'roundedRect', {
        width: val(120), height: val(50), fill: val('#E67E22'),
        label: val('Collection'),
      }, { name: 'Collection' }),
    ], {
      relationships: [
        edge('evaporation', 'condensation', 'heat rises'),
        edge('condensation', 'precipitation', 'cools'),
        edge('precipitation', 'collection', 'falls'),
        edge('collection', 'evaporation', 'absorbs heat'),
      ],
      timelines: [
        timeline('cycle', [
          step(0, { description: 'Water absorbs heat' }),
          step(1000, { description: 'Water evaporates' }),
          step(2000, { description: 'Vapor condenses' }),
          step(3000, { description: 'Rain falls' }),
        ], { loop: true }),
      ],
    })

    const result = expectValid(s)
    assert.equal(result.relationships!.length, 4)
    assert.equal(result.timelines!.length, 1)
    assert.equal(result.timelines![0].steps!.length, 4)
  })
})

// ─── 5. Graph ───────────────────────────────────────────────────────────────

describe('graph DSL example', () => {
  it('builds a social network graph', () => {
    const s = scene('Social Network', [
      graph('n1', undefined, {
        shape: val('circle'), radius: val(25),
        fill: val('#3498DB'), position: val({ x: 0, y: 0 }),
      }, { name: 'Alice' }),
      graph('n2', undefined, {
        shape: val('circle'), radius: val(25),
        fill: val('#E74C3C'), position: val({ x: 100, y: 0 }),
      }, { name: 'Bob' }),
      graph('n3', undefined, {
        shape: val('circle'), radius: val(25),
        fill: val('#2ECC71'), position: val({ x: 50, y: 80 }),
      }, { name: 'Carol' }),
    ], {
      relationships: [
        edge('n1', 'n2', 'friends', { weight: val(5) }),
        edge('n2', 'n3', 'colleagues', { weight: val(3) }),
        edge('n1', 'n3', 'family', { weight: val(7) }),
      ],
    })

    const result = expectValid(s)
    const nodes = result.entities.filter((e) => e.type === 'graph')
    const edges = result.relationships!.filter((r) => r.type === 'edge')
    assert.equal(nodes.length, 3)
    assert.equal(edges.length, 3)
  })

  it('builds a tree hierarchy', () => {
    const s = scene('File System Tree', [
      group('root', {}, { name: 'root' }),
      group('src', {}, { name: 'src' }),
      group('tests', {}, { name: 'tests' }),
      shape('index', 'rect', {}, { name: 'index.ts' }),
      shape('test1', 'rect', {}, { name: 'test.ts' }),
    ], {
      relationships: [
        contains('root', 'src'),
        contains('root', 'tests'),
        contains('src', 'index'),
        contains('tests', 'test1'),
      ],
    })

    expectValid(s)
  })
})

// ─── 6. Animations & Interactions ───────────────────────────────────────────

describe('animation/interaction DSL example', () => {
  it('builds a bouncing ball with animation bindings', () => {
    const s = scene('Bouncing Ball', [
      shape('ball', 'circle', {
        radius: val(20),
        fill: val('#E74C3C'),
        position: animated({ x: 100, y: 50 }, [
          kf(0, { x: 100, y: 50 }),
          kf(0.5, { x: 100, y: 200 }),
          kf(1, { x: 100, y: 50 }),
        ], 1000, { easing: 'easeInOut', loop: true }),
      }, { name: 'Ball' }),
    ], {
      animations: [
        animBinding('ball.radius', [kf(0, 20), kf(0.5, 25), kf(1, 20)], 1000, {
          easing: 'linear',
          loop: true,
        }),
      ],
    })

    const result = expectValid(s)
    assert.equal(result.animations!.length, 1)
    assert.equal(result.animations![0].target, 'ball.radius')
  })

  it('builds an interactive toggle', () => {
    const s = scene('Interactive Toggle', [
      shape('toggle_btn', 'roundedRect', {
        width: val(100), height: val(40), fill: val('#3498DB'),
        label: val('Toggle'),
        cursor: interactive('pointer', [
          { event: 'click', action: { type: 'toggle', target: 'target_box.fill' } },
        ]),
      }, { name: 'Toggle Button' }),
      shape('target_box', 'rect', {
        width: val(80), height: val(80), fill: val('#2ECC71'),
      }, { name: 'Target Box' }),
    ])

    expectValid(s)
  })

  it('builds a proof with timeline reveal', () => {
    const s = scene('Proof Steps', [
      text('step1', 'Given: a = b', { fontSize: val(18), opacity: val(1) }),
      text('step2', 'Multiply both sides by a: a² = ab', { fontSize: val(18), opacity: val(0) }),
      text('step3', 'Subtract b²: a² - b² = ab - b²', { fontSize: val(18), opacity: val(0) }),
    ], {
      animations: [
        animBinding('step2.opacity', [kf(0, 0), kf(1, 1)], 500, { delay: 2000 }),
        animBinding('step3.opacity', [kf(0, 0), kf(1, 1)], 500, { delay: 4000 }),
      ],
      timelines: [
        timeline('proof', [
          step(0, { description: 'State given' }),
          step(2000, { description: 'Multiply by a', animations: ['step2.opacity'] }),
          step(4000, { description: 'Subtract b²', animations: ['step3.opacity'] }),
        ], { auto: true }),
      ],
    })

    const result = expectValid(s)
    assert.equal(result.animations!.length, 2)
    assert.equal(result.timelines![0].steps!.length, 3)
  })

  it('builds easing comparison', () => {
    const s = scene('Easing Comparison', [
      shape('box_linear', 'rect', {
        width: val(20), height: val(20), fill: val('#3498DB'),
        position: animated({ x: 0, y: 0 }, [kf(0, { x: 0, y: 0 }), kf(1, { x: 200, y: 0 })], 2000, { easing: 'linear' }),
      }),
      shape('box_easein', 'rect', {
        width: val(20), height: val(20), fill: val('#E74C3C'),
        position: animated({ x: 0, y: 30 }, [kf(0, { x: 0, y: 30 }), kf(1, { x: 200, y: 30 })], 2000, { easing: 'easeIn' }),
      }),
      shape('box_spring', 'rect', {
        width: val(20), height: val(20), fill: val('#2ECC71'),
        position: animated({ x: 0, y: 60 }, [kf(0, { x: 0, y: 60 }), kf(1, { x: 200, y: 60 })], 2000, { easing: 'spring' }),
      }),
    ])

    const result = expectValid(s)
    assert.equal(result.entities.length, 3)
  })
})

// ─── Round-trip Tests ───────────────────────────────────────────────────────

describe('round-trip: DSL → IR → JSON → parse → validate', () => {
  it('round-trips a math scene', () => {
    const s = scene('Round Trip Math', [
      shape('c', 'circle', { radius: val(5), fill: val('#FFF') }),
      text('t', 'hello'),
    ], {
      relationships: [referenced('t', 'c')],
      viewport: viewport(400, 300, '#000'),
    })

    const json = JSON.stringify(s)
    const parsed = JSON.parse(json)
    const result = validateScene(parsed)
    assert.ok(result.valid, `round-trip failed: ${JSON.stringify(result.errors)}`)
  })

  it('round-trips a complex scene with animations', () => {
    const s = scene('Complex Round Trip', [
      shape('box', 'rect', {
        fill: animated('#F00', [kf(0, '#F00'), kf(1, '#00F')], 1000),
      }),
      group('container', { x: val(0) }),
      abstractEntity('particle', { mass: val(1) }),
    ], {
      variables: { t: 0 },
      animations: [animBinding('box.fill', [kf(0, '#F00'), kf(1, '#00F')], 1000)],
      relationships: [contains('container', 'box'), edge('particle', 'box')],
    })

    const json = JSON.stringify(s)
    const parsed = JSON.parse(json)
    const result = validateScene(parsed)
    assert.ok(result.valid, `round-trip failed: ${JSON.stringify(result.errors)}`)
  })

  it('round-trips a graph scene', () => {
    const s = scene('Graph Round Trip', [
      graph('a', 'Node A', { position: val({ x: 0, y: 0 }) }),
      graph('b', 'Node B', { position: val({ x: 100, y: 0 }) }),
      graph('c', 'Node C', { position: val({ x: 50, y: 80 }) }),
    ], {
      relationships: [
        edge('a', 'b', 'link1', { weight: val(1) }),
        edge('b', 'c', 'link2'),
        edge('a', 'c', 'link3'),
      ],
    })

    const json = JSON.stringify(s)
    const parsed = JSON.parse(json)
    const result = validateScene(parsed)
    assert.ok(result.valid, `round-trip failed: ${JSON.stringify(result.errors)}`)
  })
})
