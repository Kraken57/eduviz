import { shape, text, scene, animated, kf, val, viewport, animBinding } from '../../dsl/builders.js'
import type { Scene } from '../../ir/types.js'

// ─── Example 1: Animated Circle ─────────────────────────────────────────────

const animatedCircle: Scene = scene(
  'Animated Circle',
  [
    shape('circle', 'circle', {
      x: val(400),
      y: val(300),
      radius: val(80),
      fill: val('#2196f3'),
      stroke: val('#1565c0'),
      strokeWidth: val(3),
      opacity: animated(1, [kf(0, 0.3), kf(50, 1), kf(100, 0.3)], 3, { loop: true, easing: 'easeInOut' }),
    }),
    text('label', 'Pulsing opacity animation', {
      x: val(400),
      y: val(430),
      fontSize: val(16),
      fill: val('#666'),
      textAnchor: val('middle'),
    }),
    text('title', 'Animated Circle', {
      x: val(400),
      y: val(50),
      fontSize: val(24),
      fill: val('#333'),
      textAnchor: val('middle'),
      fontWeight: val('bold'),
    }),
  ],
  {
    description: 'A circle with a pulsing opacity animation using SVG SMIL.',
    tags: ['animation', 'basic'],
    viewport: viewport(800, 600, '#f8f9fa'),
    animations: [
      animBinding('circle.opacity', [kf(0, 0.3), kf(50, 1), kf(100, 0.3)], 3, {
        loop: true,
        easing: 'easeInOut',
      }),
    ],
  },
)

// ─── Example 2: Coordinate Axes ─────────────────────────────────────────────

const coordinateAxes: Scene = scene(
  'Coordinate Axes with Curve',
  [
    shape('x-axis', 'arrow', {
      x1: val(80),
      y1: val(450),
      x2: val(720),
      y2: val(450),
      stroke: val('#333'),
      strokeWidth: val(2),
    }),
    shape('y-axis', 'arrow', {
      x1: val(80),
      y1: val(450),
      x2: val(80),
      y2: val(50),
      stroke: val('#333'),
      strokeWidth: val(2),
    }),
    text('x-label', 'x', {
      x: val(735),
      y: val(455),
      fontSize: val(18),
      fill: val('#333'),
    }),
    text('y-label', 'y', {
      x: val(65),
      y: val(40),
      fontSize: val(18),
      fill: val('#333'),
    }),
    text('title', 'Sine Wave Plot', {
      x: val(400),
      y: val(40),
      fontSize: val(22),
      fill: val('#333'),
      textAnchor: val('middle'),
      fontWeight: val('bold'),
    }),
    shape('curve', 'path', {
      d: val('M 80 450 Q 165 250 250 450 Q 335 650 420 450 Q 505 250 590 450 Q 675 650 720 450'),
      stroke: val('#e91e63'),
      strokeWidth: val(3),
      fill: val('none'),
    }),
    shape('dot1', 'circle', { x: val(80), y: val(450), radius: val(5), fill: val('#e91e63') }),
    shape('dot2', 'circle', { x: val(250), y: val(450), radius: val(5), fill: val('#e91e63') }),
    shape('dot3', 'circle', { x: val(420), y: val(450), radius: val(5), fill: val('#e91e63') }),
    shape('dot4', 'circle', { x: val(590), y: val(450), radius: val(5), fill: val('#e91e63') }),
    shape('dot5', 'circle', { x: val(720), y: val(450), radius: val(5), fill: val('#e91e63') }),
    text('origin', 'O', {
      x: val(65),
      y: val(465),
      fontSize: val(14),
      fill: val('#666'),
    }),
  ],
  {
    description: 'A coordinate system with axes, labels, and a sine wave curve.',
    tags: ['math', 'graph', 'coordinate-system'],
    viewport: viewport(800, 600, '#ffffff'),
  },
)

// ─── Example 3: Projectile Motion ───────────────────────────────────────────

function projectilePath(steps: number): string {
  const v0 = 30, angle = 50, g = 9.8
  const rad = (angle * Math.PI) / 180
  const vx = v0 * Math.cos(rad)
  const vy = v0 * Math.sin(rad)
  const points: Array<{ x: number; y: number }> = []
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * 3
    const x = vx * t
    const y = vy * t - 0.5 * g * t * t
    points.push({ x: 80 + x * 20, y: 480 - y * 15 })
  }
  let d = `M ${points[0].x} ${points[0].y}`
  for (let i = 1; i < points.length; i++) {
    d += ` L ${points[i].x} ${points[i].y}`
  }
  return d
}

const projectileMotion: Scene = scene(
  'Projectile Motion',
  [
    text('title', 'Projectile Trajectory', {
      x: val(400),
      y: val(40),
      fontSize: val(22),
      fill: val('#333'),
      textAnchor: val('middle'),
      fontWeight: val('bold'),
    }),
    shape('ground', 'line', {
      x1: val(40),
      y1: val(480),
      x2: val(760),
      y2: val(480),
      stroke: val('#8d6e63'),
      strokeWidth: val(3),
    }),
    shape('trajectory', 'path', {
      d: val(projectilePath(50)),
      stroke: val('#ff5722'),
      strokeWidth: val(3),
      fill: val('none'),
    }),
    shape('ball', 'circle', {
      x: val(80),
      y: val(480),
      radius: val(8),
      fill: val('#ff5722'),
    }),
    shape('arrow-v0', 'arrow', {
      x1: val(80),
      y1: val(480),
      x2: val(150),
      y2: val(380),
      stroke: val('#4caf50'),
      strokeWidth: val(2),
    }),
    text('v0-label', 'v\u2080 = 30 m/s', {
      x: val(100),
      y: val(510),
      fontSize: val(14),
      fill: val('#4caf50'),
    }),
    text('angle-label', '\u03b8 = 50\u00b0', {
      x: val(100),
      y: val(535),
      fontSize: val(14),
      fill: val('#666'),
    }),
    text('g-label', 'g = 9.8 m/s\u00b2', {
      x: val(600),
      y: val(535),
      fontSize: val(14),
      fill: val('#666'),
    }),
  ],
  {
    description: 'A projectile motion simulation showing the parabolic trajectory of an object launched at 50 degrees.',
    tags: ['physics', 'motion', 'simulation'],
    viewport: viewport(800, 600, '#ffffff'),
  },
)

// ─── Example 4: Cell Hierarchy ──────────────────────────────────────────────

const cellHierarchy: Scene = scene(
  'Cell Structure',
  [
    shape('membrane', 'ellipse', {
      x: val(400),
      y: val(300),
      radius: val(320),
      height: val(250),
      stroke: val('#1565c0'),
      strokeWidth: val(3),
      fill: val('#e3f2fd'),
    }),
    text('cell-label', 'Animal Cell', {
      x: val(400),
      y: val(50),
      fontSize: val(22),
      fill: val('#1565c0'),
      textAnchor: val('middle'),
      fontWeight: val('bold'),
    }),
    shape('nucleus', 'ellipse', {
      x: val(400),
      y: val(280),
      radius: val(90),
      height: val(65),
      fill: val('#bbdefb'),
      stroke: val('#1565c0'),
      strokeWidth: val(2),
    }),
    text('nucleus-label', 'Nucleus', {
      x: val(400),
      y: val(280),
      fontSize: val(16),
      fill: val('#1565c0'),
      textAnchor: val('middle'),
    }),
    shape('mitochondria1', 'ellipse', {
      x: val(250),
      y: val(400),
      radius: val(50),
      height: val(25),
      fill: val('#c8e6c9'),
      stroke: val('#388e3c'),
      strokeWidth: val(1.5),
    }),
    text('mito1-label', 'Mitochondria', {
      x: val(250),
      y: val(440),
      fontSize: val(12),
      fill: val('#388e3c'),
      textAnchor: val('middle'),
    }),
    shape('mitochondria2', 'ellipse', {
      x: val(560),
      y: val(400),
      radius: val(50),
      height: val(25),
      fill: val('#c8e6c9'),
      stroke: val('#388e3c'),
      strokeWidth: val(1.5),
    }),
    shape('er', 'path', {
      d: val('M 500 200 Q 540 180 560 210 Q 540 240 500 220 Q 540 200 560 190'),
      stroke: val('#ff9800'),
      strokeWidth: val(2),
      fill: val('none'),
    }),
    text('er-label', 'Endoplasmic Reticulum', {
      x: val(530),
      y: val(260),
      fontSize: val(12),
      fill: val('#e65100'),
      textAnchor: val('middle'),
    }),
    shape('ribosome1', 'circle', {
      x: val(310),
      y: val(220),
      radius: val(8),
      fill: val('#9c27b0'),
    }),
    shape('ribosome2', 'circle', {
      x: val(330),
      y: val(210),
      radius: val(8),
      fill: val('#9c27b0'),
    }),
    shape('ribosome3', 'circle', {
      x: val(320),
      y: val(230),
      radius: val(8),
      fill: val('#9c27b0'),
    }),
    text('ribo-label', 'Ribosomes', {
      x: val(320),
      y: val(260),
      fontSize: val(11),
      fill: val('#7b1fa2'),
      textAnchor: val('middle'),
    }),
    shape('golgi', 'path', {
      d: val('M 200 260 Q 220 240 240 260 Q 220 280 200 260 M 205 265 Q 225 245 245 265 Q 225 285 205 265'),
      stroke: val('#ff5722'),
      strokeWidth: val(1.5),
      fill: val('none'),
    }),
    text('golgi-label', 'Golgi Apparatus', {
      x: val(220),
      y: val(300),
      fontSize: val(11),
      fill: val('#d84315'),
      textAnchor: val('middle'),
    }),
  ],
  {
    description: 'A simplified animal cell structure showing nucleus, mitochondria, ER, ribosomes, and Golgi apparatus.',
    tags: ['biology', 'cell', 'hierarchy'],
    viewport: viewport(800, 600, '#ffffff'),
  },
)

// ─── Example 5: Aircraft Subsystems ─────────────────────────────────────────

const aircraftSubsystems: Scene = scene(
  'Aircraft Subsystems',
  [
    text('title', 'Aircraft Subsystem Architecture', {
      x: val(400),
      y: val(40),
      fontSize: val(22),
      fill: val('#333'),
      textAnchor: val('middle'),
      fontWeight: val('bold'),
    }),
    shape('fuselage', 'roundedRect', {
      x: val(400),
      y: val(300),
      width: val(200),
      height: val(100),
      radius: val(10),
      fill: val('#e3f2fd'),
      stroke: val('#1565c0'),
      strokeWidth: val(2),
    }),
    text('fuselage-label', 'Fuselage', {
      x: val(400),
      y: val(300),
      fontSize: val(16),
      fill: val('#1565c0'),
      textAnchor: val('middle'),
      fontWeight: val('bold'),
    }),
    shape('engine-l', 'roundedRect', {
      x: val(200),
      y: val(300),
      width: val(100),
      height: val(50),
      radius: val(6),
      fill: val('#fff3e0'),
      stroke: val('#e65100'),
      strokeWidth: val(2),
    }),
    text('engine-l-label', 'Engine L', {
      x: val(200),
      y: val(300),
      fontSize: val(13),
      fill: val('#e65100'),
      textAnchor: val('middle'),
    }),
    shape('engine-r', 'roundedRect', {
      x: val(600),
      y: val(300),
      width: val(100),
      height: val(50),
      radius: val(6),
      fill: val('#fff3e0'),
      stroke: val('#e65100'),
      strokeWidth: val(2),
    }),
    text('engine-r-label', 'Engine R', {
      x: val(600),
      y: val(300),
      fontSize: val(13),
      fill: val('#e65100'),
      textAnchor: val('middle'),
    }),
    shape('avionics', 'roundedRect', {
      x: val(400),
      y: val(160),
      width: val(140),
      height: val(50),
      radius: val(8),
      fill: val('#e8f5e9'),
      stroke: val('#2e7d32'),
      strokeWidth: val(2),
    }),
    text('avionics-label', 'Avionics', {
      x: val(400),
      y: val(160),
      fontSize: val(14),
      fill: val('#2e7d32'),
      textAnchor: val('middle'),
      fontWeight: val('bold'),
    }),
    shape('fuel', 'roundedRect', {
      x: val(400),
      y: val(460),
      width: val(140),
      height: val(50),
      radius: val(8),
      fill: val('#fce4ec'),
      stroke: val('#c62828'),
      strokeWidth: val(2),
    }),
    text('fuel-label', 'Fuel System', {
      x: val(400),
      y: val(460),
      fontSize: val(14),
      fill: val('#c62828'),
      textAnchor: val('middle'),
      fontWeight: val('bold'),
    }),
    shape('hydraulics', 'roundedRect', {
      x: val(150),
      y: val(460),
      width: val(120),
      height: val(45),
      radius: val(6),
      fill: val('#f3e5f5'),
      stroke: val('#7b1fa2'),
      strokeWidth: val(1.5),
    }),
    text('hyd-label', 'Hydraulics', {
      x: val(150),
      y: val(460),
      fontSize: val(12),
      fill: val('#7b1fa2'),
      textAnchor: val('middle'),
    }),
    shape('electrical', 'roundedRect', {
      x: val(650),
      y: val(460),
      width: val(120),
      height: val(45),
      radius: val(6),
      fill: val('#fffde7'),
      stroke: val('#f9a825'),
      strokeWidth: val(1.5),
    }),
    text('elec-label', 'Electrical', {
      x: val(650),
      y: val(460),
      fontSize: val(12),
      fill: val('#f9a825'),
      textAnchor: val('middle'),
    }),
  ],
  {
    description: 'An aircraft subsystem diagram showing the relationship between fuselage, engines, avionics, fuel, hydraulics, and electrical systems.',
    tags: ['aerospace', 'systems', 'architecture'],
    viewport: viewport(800, 600, '#ffffff'),
    relationships: [
      { type: 'edge', from: 'engine-l', to: 'fuselage', label: 'thrust' },
      { type: 'edge', from: 'engine-r', to: 'fuselage', label: 'thrust' },
      { type: 'edge', from: 'avionics', to: 'fuselage', label: 'control' },
      { type: 'edge', from: 'fuel', to: 'engine-l', label: 'supply' },
      { type: 'edge', from: 'fuel', to: 'engine-r', label: 'supply' },
      { type: 'edge', from: 'hydraulics', to: 'fuselage', label: 'actuation' },
      { type: 'edge', from: 'electrical', to: 'avionics', label: 'power' },
    ],
  },
)

// ─── Example 6: LLM Architecture ────────────────────────────────────────────

const llmArchitecture: Scene = scene(
  'LLM Transformer Architecture',
  [
    text('title', 'Transformer Architecture', {
      x: val(400),
      y: val(35),
      fontSize: val(22),
      fill: val('#333'),
      textAnchor: val('middle'),
      fontWeight: val('bold'),
    }),
    shape('input', 'roundedRect', {
      x: val(400),
      y: val(530),
      width: val(260),
      height: val(45),
      radius: val(8),
      fill: val('#e8eaf6'),
      stroke: val('#3f51b5'),
      strokeWidth: val(2),
    }),
    text('input-label', 'Input Embeddings', {
      x: val(400),
      y: val(530),
      fontSize: val(14),
      fill: val('#3f51b5'),
      textAnchor: val('middle'),
    }),
    shape('pos-enc', 'roundedRect', {
      x: val(400),
      y: val(460),
      width: val(260),
      height: val(45),
      radius: val(8),
      fill: val('#e0f7fa'),
      stroke: val('#00838f'),
      strokeWidth: val(2),
    }),
    text('pos-label', 'Positional Encoding', {
      x: val(400),
      y: val(460),
      fontSize: val(14),
      fill: val('#00838f'),
      textAnchor: val('middle'),
    }),
    shape('attn-bg', 'roundedRect', {
      x: val(400),
      y: val(340),
      width: val(280),
      height: val(70),
      radius: val(10),
      fill: val('#fff3e0'),
      stroke: val('#e65100'),
      strokeWidth: val(2),
    }),
    text('attn-label', 'Multi-Head Attention', {
      x: val(400),
      y: val(340),
      fontSize: val(15),
      fill: val('#e65100'),
      textAnchor: val('middle'),
      fontWeight: val('bold'),
    }),
    shape('ln1', 'roundedRect', {
      x: val(400),
      y: val(270),
      width: val(160),
      height: val(30),
      radius: val(6),
      fill: val('#f5f5f5'),
      stroke: val('#9e9e9e'),
      strokeWidth: val(1.5),
    }),
    text('ln1-label', 'Layer Norm', {
      x: val(400),
      y: val(270),
      fontSize: val(12),
      fill: val('#757575'),
      textAnchor: val('middle'),
    }),
    shape('ff-bg', 'roundedRect', {
      x: val(400),
      y: val(190),
      width: val(280),
      height: val(70),
      radius: val(10),
      fill: val('#e8f5e9'),
      stroke: val('#2e7d32'),
      strokeWidth: val(2),
    }),
    text('ff-label', 'Feed Forward Network', {
      x: val(400),
      y: val(190),
      fontSize: val(15),
      fill: val('#2e7d32'),
      textAnchor: val('middle'),
      fontWeight: val('bold'),
    }),
    shape('ln2', 'roundedRect', {
      x: val(400),
      y: val(120),
      width: val(160),
      height: val(30),
      radius: val(6),
      fill: val('#f5f5f5'),
      stroke: val('#9e9e9e'),
      strokeWidth: val(1.5),
    }),
    text('ln2-label', 'Layer Norm', {
      x: val(400),
      y: val(120),
      fontSize: val(12),
      fill: val('#757575'),
      textAnchor: val('middle'),
    }),
    shape('output', 'roundedRect', {
      x: val(400),
      y: val(60),
      width: val(260),
      height: val(45),
      radius: val(8),
      fill: val('#fce4ec'),
      stroke: val('#c62828'),
      strokeWidth: val(2),
    }),
    text('output-label', 'Output Probabilities', {
      x: val(400),
      y: val(60),
      fontSize: val(14),
      fill: val('#c62828'),
      textAnchor: val('middle'),
    }),
  ],
  {
    description: 'A simplified Transformer architecture diagram showing the main components: input embeddings, positional encoding, multi-head attention, feed forward networks, and output layer.',
    tags: ['ai', 'transformer', 'architecture', 'llm'],
    viewport: viewport(800, 600, '#ffffff'),
    relationships: [
      { type: 'edge', from: 'input', to: 'pos-enc' },
      { type: 'edge', from: 'pos-enc', to: 'attn-bg' },
      { type: 'edge', from: 'attn-bg', to: 'ln1' },
      { type: 'edge', from: 'ln1', to: 'ff-bg' },
      { type: 'edge', from: 'ff-bg', to: 'ln2' },
      { type: 'edge', from: 'ln2', to: 'output' },
    ],
  },
)

// ─── Export ──────────────────────────────────────────────────────────────────

export interface Example {
  title: string
  description: string
  tags: string[]
  scene: Scene
}

function toExample(s: Scene): Example {
  return {
    title: s.meta.title ?? s.meta.version,
    description: s.meta.description ?? '',
    tags: s.meta.tags ?? [],
    scene: s,
  }
}

export const examples: Example[] = [
  toExample(animatedCircle),
  toExample(coordinateAxes),
  toExample(projectileMotion),
  toExample(cellHierarchy),
  toExample(aircraftSubsystems),
  toExample(llmArchitecture),
]
