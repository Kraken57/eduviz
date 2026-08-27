import type { Scene } from '../../ir/types.js'

// ─── 3D Example 1: Basic 3D Shapes ────────────────────────────────────────

export const basicShapes3D: Scene = {
  meta: {
    version: '1.0',
    title: '3D Basic Shapes',
    description: 'A collection of fundamental 3D primitives: box, sphere, cylinder, and cone.',
    tags: ['3d', 'basic', 'shapes'],
  },
  viewport: {
    width: 800,
    height: 600,
    background: '#1a1a2e',
    camera: {
      position: { x: 6, y: 4, z: 8 },
      target: { x: 0, y: 0, z: 0 },
      projection: 'perspective',
      fov: 60,
    },
  },
  entities: [
    { id: 'box', type: 'shape', properties: { shape: 'box', width: 2, height: 2, depth: 2, x: -3, y: 1, z: 0, fill: '#3498db' } },
    { id: 'sphere', type: 'shape', properties: { shape: 'sphere', radius: 1, x: 0, y: 1, z: 0, fill: '#e74c3c' } },
    { id: 'cylinder', type: 'shape', properties: { shape: 'cylinder', radius: 0.8, height: 2, x: 3, y: 1, z: 0, fill: '#2ecc71' } },
    { id: 'cone', type: 'shape', properties: { shape: 'cone', radius: 0.8, height: 2, x: 0, y: 1, z: -4, fill: '#f39c12' } },
    { id: 'plane', type: 'shape', properties: { shape: 'plane', width: 12, height: 12, x: 0, y: -0.01, z: 0, rotationX: -1.5708, fill: '#2c3e50' } },
    { id: 'box-label', type: 'text', properties: { text: 'Box', x: -3, y: -1.5, z: 0, fontSize: 0.4, fill: '#ecf0f1' } },
    { id: 'sphere-label', type: 'text', properties: { text: 'Sphere', x: 0, y: -1.5, z: 0, fontSize: 0.4, fill: '#ecf0f1' } },
    { id: 'cylinder-label', type: 'text', properties: { text: 'Cylinder', x: 3, y: -1.5, z: 0, fontSize: 0.4, fill: '#ecf0f1' } },
    { id: 'cone-label', type: 'text', properties: { text: 'Cone', x: 0, y: -1.5, z: -4, fontSize: 0.4, fill: '#ecf0f1' } },
    { id: 'title', type: 'text', properties: { text: '3D Basic Shapes', x: 0, y: 5, z: 0, fontSize: 0.8, fill: '#ecf0f1' } },
  ],
}

// ─── 3D Example 2: Solar System ───────────────────────────────────────────

export const solarSystem3D: Scene = {
  meta: {
    version: '1.0',
    title: 'Solar System',
    description: 'A simplified solar system with planets orbiting the sun.',
    tags: ['3d', 'solar-system', 'astronomy'],
  },
  viewport: {
    width: 800,
    height: 600,
    background: '#0d1117',
    camera: {
      position: { x: 8, y: 6, z: 12 },
      target: { x: 0, y: 0, z: 0 },
      projection: 'perspective',
      fov: 50,
    },
  },
  entities: [
    { id: 'sun', type: 'shape', properties: { shape: 'sphere', radius: 1.2, x: 0, y: 0, z: 0, fill: '#f1c40f', emissive: '#f39c12', emissiveIntensity: 0.5 } },
    { id: 'mercury', type: 'shape', properties: { shape: 'sphere', radius: 0.2, x: 2.5, y: 0, z: 0, fill: '#95a5a6' } },
    { id: 'venus', type: 'shape', properties: { shape: 'sphere', radius: 0.35, x: 4, y: 0, z: 0, fill: '#e67e22' } },
    { id: 'earth', type: 'shape', properties: { shape: 'sphere', radius: 0.4, x: 5.5, y: 0, z: 0, fill: '#3498db' } },
    { id: 'mars', type: 'shape', properties: { shape: 'sphere', radius: 0.3, x: 7, y: 0, z: 0, fill: '#c0392b' } },
    { id: 'orbit1', type: 'shape', properties: { shape: 'ring', innerRadius: 2.4, outerRadius: 2.6, segments: 64, x: 0, y: 0, z: 0, rotationX: -1.5708, fill: 'none', opacity: 0.3 } },
    { id: 'orbit2', type: 'shape', properties: { shape: 'ring', innerRadius: 3.9, outerRadius: 4.1, segments: 64, x: 0, y: 0, z: 0, rotationX: -1.5708, fill: 'none', opacity: 0.3 } },
    { id: 'orbit3', type: 'shape', properties: { shape: 'ring', innerRadius: 5.4, outerRadius: 5.6, segments: 64, x: 0, y: 0, z: 0, rotationX: -1.5708, fill: 'none', opacity: 0.3 } },
    { id: 'orbit4', type: 'shape', properties: { shape: 'ring', innerRadius: 6.9, outerRadius: 7.1, segments: 64, x: 0, y: 0, z: 0, rotationX: -1.5708, fill: 'none', opacity: 0.3 } },
    { id: 'title', type: 'text', properties: { text: 'Solar System', x: 0, y: 4, z: 0, fontSize: 0.8, fill: '#ecf0f1' } },
  ],
}

// ─── 3D Example 3: Molecule ───────────────────────────────────────────────

export const molecule3D: Scene = {
  meta: {
    version: '1.0',
    title: 'Water Molecule (H2O)',
    description: 'A 3D representation of a water molecule with oxygen and hydrogen atoms.',
    tags: ['3d', 'chemistry', 'molecule'],
  },
  viewport: {
    width: 800,
    height: 600,
    background: '#1a1a2e',
    camera: {
      position: { x: 4, y: 3, z: 6 },
      target: { x: 0, y: 0, z: 0 },
      projection: 'perspective',
      fov: 50,
    },
  },
  entities: [
    { id: 'oxygen', type: 'shape', properties: { shape: 'sphere', radius: 0.7, x: 0, y: 0, z: 0, fill: '#e74c3c', roughness: 0.3, metalness: 0.1 } },
    { id: 'hydrogen1', type: 'shape', properties: { shape: 'sphere', radius: 0.4, x: -1.2, y: -0.8, z: 0, fill: '#3498db', roughness: 0.3 } },
    { id: 'hydrogen2', type: 'shape', properties: { shape: 'sphere', radius: 0.4, x: 1.2, y: -0.8, z: 0, fill: '#3498db', roughness: 0.3 } },
    { id: 'bond1', type: 'shape', properties: { shape: 'cylinder', radius: 0.08, height: 1.5, x: -0.6, y: -0.4, z: 0, rotationZ: 0.588, fill: '#95a5a6' } },
    { id: 'bond2', type: 'shape', properties: { shape: 'cylinder', radius: 0.08, height: 1.5, x: 0.6, y: -0.4, z: 0, rotationZ: -0.588, fill: '#95a5a6' } },
    { id: 'o-label', type: 'text', properties: { text: 'O', x: 0, y: 0, z: 0, fontSize: 0.5, fill: '#ffffff' } },
    { id: 'h1-label', type: 'text', properties: { text: 'H', x: -1.2, y: -0.8, z: 0, fontSize: 0.4, fill: '#ffffff' } },
    { id: 'h2-label', type: 'text', properties: { text: 'H', x: 1.2, y: -0.8, z: 0, fontSize: 0.4, fill: '#ffffff' } },
    { id: 'title', type: 'text', properties: { text: 'Water Molecule (H\u2082O)', x: 0, y: 3, z: 0, fontSize: 0.7, fill: '#ecf0f1' } },
    { id: 'angle-label', type: 'text', properties: { text: 'Bond angle: 104.5\u00b0', x: 0, y: 2.2, z: 0, fontSize: 0.35, fill: '#95a5a6' } },
  ],
}

// ─── 3D Example 4: 3D Coordinate System ───────────────────────────────────

export const coordinateSystem3D: Scene = {
  meta: {
    version: '1.0',
    title: '3D Coordinate System',
    description: 'A 3D coordinate system with X, Y, Z axes and a grid plane.',
    tags: ['3d', 'coordinate-system', 'math'],
  },
  viewport: {
    width: 800,
    height: 600,
    background: '#1a1a2e',
    camera: {
      position: { x: 6, y: 5, z: 8 },
      target: { x: 0, y: 0, z: 0 },
      projection: 'perspective',
      fov: 50,
    },
  },
  entities: [
    { id: 'grid', type: 'shape', properties: { shape: 'plane', width: 10, height: 10, x: 0, y: 0, z: 0, rotationX: -1.5708, fill: '#34495e', opacity: 0.5 } },
    { id: 'x-axis', type: 'shape', properties: { shape: 'cylinder', radius: 0.04, height: 5, x: 2.5, y: 0.05, z: 0, rotationZ: -1.5708, fill: '#e74c3c' } },
    { id: 'y-axis', type: 'shape', properties: { shape: 'cylinder', radius: 0.04, height: 5, x: 0, y: 2.55, z: 0, fill: '#2ecc71' } },
    { id: 'z-axis', type: 'shape', properties: { shape: 'cylinder', radius: 0.04, height: 5, x: 0, y: 0.05, z: 2.5, rotationX: 1.5708, fill: '#3498db' } },
    { id: 'x-label', type: 'text', properties: { text: 'X', x: 5.2, y: 0.05, z: 0, fontSize: 0.5, fill: '#e74c3c' } },
    { id: 'y-label', type: 'text', properties: { text: 'Y', x: 0, y: 5.2, z: 0, fontSize: 0.5, fill: '#2ecc71' } },
    { id: 'z-label', type: 'text', properties: { text: 'Z', x: 0, y: 0.05, z: 5.2, fontSize: 0.5, fill: '#3498db' } },
    { id: 'origin', type: 'shape', properties: { shape: 'sphere', radius: 0.12, x: 0, y: 0.05, z: 0, fill: '#ecf0f1' } },
    { id: 'title', type: 'text', properties: { text: '3D Coordinate System', x: 0, y: 5.5, z: 0, fontSize: 0.7, fill: '#ecf0f1' } },
  ],
}

// ─── 3D Example 5: Tower of Shapes ────────────────────────────────────────

export const towerOfShapes3D: Scene = {
  meta: {
    version: '1.0',
    title: 'Tower of Shapes',
    description: 'A stack of different 3D shapes demonstrating containment and vertical arrangement.',
    tags: ['3d', 'stack', 'basic'],
  },
  viewport: {
    width: 800,
    height: 600,
    background: '#1a1a2e',
    camera: {
      position: { x: 5, y: 4, z: 7 },
      target: { x: 0, y: 2, z: 0 },
      projection: 'perspective',
      fov: 50,
    },
  },
  entities: [
    { id: 'base', type: 'shape', properties: { shape: 'box', width: 3, height: 0.5, depth: 3, x: 0, y: 0.25, z: 0, fill: '#2c3e50' } },
    { id: 'mid', type: 'shape', properties: { shape: 'cylinder', radius: 1, height: 0.8, x: 0, y: 0.9, z: 0, fill: '#2980b9' } },
    { id: 'top', type: 'shape', properties: { shape: 'sphere', radius: 0.6, x: 0, y: 2, z: 0, fill: '#e74c3c' } },
    { id: 'ring', type: 'shape', properties: { shape: 'torus', radius: 0.8, tube: 0.1, x: 0, y: 1.5, z: 0, fill: '#f39c12' } },
    { id: 'title', type: 'text', properties: { text: 'Tower of Shapes', x: 0, y: 4, z: 0, fontSize: 0.7, fill: '#ecf0f1' } },
    { id: 'base-label', type: 'text', properties: { text: 'Box', x: 0, y: -0.5, z: 0, fontSize: 0.3, fill: '#95a5a6' } },
    { id: 'mid-label', type: 'text', properties: { text: 'Cylinder', x: 0, y: 0.9, z: 0, fontSize: 0.3, fill: '#95a5a6' } },
    { id: 'ring-label', type: 'text', properties: { text: 'Torus', x: 0, y: 1.5, z: 0, fontSize: 0.3, fill: '#95a5a6' } },
    { id: 'top-label', type: 'text', properties: { text: 'Sphere', x: 0, y: 2.8, z: 0, fontSize: 0.3, fill: '#95a5a6' } },
  ],
}

// ─── 3D Example 6: Animated Rotating Shapes ───────────────────────────────

export const rotatingShapes3D: Scene = {
  meta: {
    version: '1.0',
    title: 'Rotating Shapes',
    description: 'A spinning cube, orbiting sphere, and pulsing torus demonstrating 3D animations.',
    tags: ['3d', 'animation', 'rotation'],
  },
  viewport: {
    width: 800,
    height: 600,
    background: '#0d1117',
    camera: {
      position: { x: 5, y: 4, z: 8 },
      target: { x: 0, y: 1, z: 0 },
      projection: 'perspective',
      fov: 50,
    },
  },
  entities: [
    {
      id: 'spinning-cube', type: 'shape',
      properties: {
        shape: 'box', width: 1.5, height: 1.5, depth: 1.5,
        x: -2.5, y: 1, z: 0, fill: '#3498db',
        rotationY: { value: 0, anim: { keyframes: [{ offset: 0, value: 0 }, { offset: 1, value: 6.283 }], duration: 4, loop: true } },
      },
    },
    {
      id: 'orbiting-sphere', type: 'shape',
      properties: {
        shape: 'sphere', radius: 0.4,
        x: { value: 3, anim: { keyframes: [{ offset: 0, value: 3 }, { offset: 0.25, value: 0 }, { offset: 0.5, value: -3 }, { offset: 0.75, value: 0 }, { offset: 1, value: 3 }], duration: 6, loop: true } },
        z: { value: 0, anim: { keyframes: [{ offset: 0, value: 0 }, { offset: 0.25, value: 3 }, { offset: 0.5, value: 0 }, { offset: 0.75, value: -3 }, { offset: 1, value: 0 }], duration: 6, loop: true } },
        y: 1, fill: '#e74c3c',
      },
    },
    {
      id: 'pulsing-torus', type: 'shape',
      properties: {
        shape: 'torus', radius: 0.8, tube: 0.15,
        x: 0, y: 1, z: 0, fill: '#f39c12',
        scaleX: { value: 1, anim: { keyframes: [{ offset: 0, value: 0.8 }, { offset: 0.5, value: 1.3 }, { offset: 1, value: 0.8 }], duration: 2, loop: true } },
        scaleY: { value: 1, anim: { keyframes: [{ offset: 0, value: 0.8 }, { offset: 0.5, value: 1.3 }, { offset: 1, value: 0.8 }], duration: 2, loop: true } },
        scaleZ: { value: 1, anim: { keyframes: [{ offset: 0, value: 0.8 }, { offset: 0.5, value: 1.3 }, { offset: 1, value: 0.8 }], duration: 2, loop: true } },
      },
    },
    { id: 'ground', type: 'shape', properties: { shape: 'plane', width: 12, height: 12, x: 0, y: -0.01, z: 0, rotationX: -1.5708, fill: '#1a1a2e', opacity: 0.5 } },
    { id: 'title', type: 'text', properties: { text: '3D Animations', x: 0, y: 3.5, z: 0, fontSize: 0.7, fill: '#ecf0f1' } },
  ],
  animations: [
    {
      target: 'spinning-cube.rotationY',
      keyframes: [{ offset: 0, value: 0 }, { offset: 1, value: 6.283 }],
      duration: 4,
      loop: true,
    },
  ],
}

// ─── 3D Examples Array ────────────────────────────────────────────────────

export const examples3D: Scene[] = [
  basicShapes3D,
  solarSystem3D,
  molecule3D,
  coordinateSystem3D,
  towerOfShapes3D,
  rotatingShapes3D,
]
