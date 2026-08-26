import type { PropertyBag } from '../../ir/types.js'
import { resolveNumber, resolveString } from './materials.js'

// ─── Shape Type Detection ─────────────────────────────────────────────────

export type Shape3DType =
  | 'box'
  | 'sphere'
  | 'cylinder'
  | 'cone'
  | 'plane'
  | 'torus'
  | 'circle'
  | 'ring'
  | 'dodecahedron'
  | 'icosahedron'
  | 'octahedron'
  | 'tetrahedron'

const VALID_SHAPES: Shape3DType[] = [
  'box', 'sphere', 'cylinder', 'cone', 'plane',
  'torus', 'circle', 'ring', 'dodecahedron', 'icosahedron',
  'octahedron', 'tetrahedron',
]

export function detectShapeType(props: PropertyBag): Shape3DType {
  const shape = resolveString(props.shape, 'box')
  if (VALID_SHAPES.includes(shape as Shape3DType)) {
    return shape as Shape3DType
  }
  return 'box'
}

// ─── Three.js Lazy Import ─────────────────────────────────────────────────

type ThreeModule = typeof import('three')

let _three: ThreeModule | null = null

export function setThreeModule(three: ThreeModule): void {
  _three = three
}

function getThree(): ThreeModule {
  if (_three === null) {
    throw new Error(
      'Three.js is not installed. Run: npm install three @types/three',
    )
  }
  return _three
}

// ─── Geometry Creation ────────────────────────────────────────────────────

export function createGeometry(
  shapeType: Shape3DType,
  props: PropertyBag,
): InstanceType<ThreeModule['BufferGeometry']> {
  const THREE = getThree()

  switch (shapeType) {
    case 'box': {
      const w = resolveNumber(props.width, 1)
      const h = resolveNumber(props.height, 1)
      const d = resolveNumber(props.depth, w)
      return new THREE.BoxGeometry(w, h, d)
    }
    case 'sphere': {
      const r = resolveNumber(props.radius, 0.5)
      const ws = resolveNumber(props.widthSegments, 32)
      const hs = resolveNumber(props.heightSegments, 16)
      return new THREE.SphereGeometry(r, ws, hs)
    }
    case 'cylinder': {
      const rt = resolveNumber(props.radiusTop, resolveNumber(props.radius, 0.5))
      const rb = resolveNumber(props.radiusBottom, rt)
      const height = resolveNumber(props.height, 1)
      const segments = resolveNumber(props.radialSegments, 32)
      return new THREE.CylinderGeometry(rt, rb, height, segments)
    }
    case 'cone': {
      const r = resolveNumber(props.radius, 0.5)
      const height = resolveNumber(props.height, 1)
      const segments = resolveNumber(props.radialSegments, 32)
      return new THREE.ConeGeometry(r, height, segments)
    }
    case 'plane': {
      const w = resolveNumber(props.width, 1)
      const h = resolveNumber(props.height, 1)
      return new THREE.PlaneGeometry(w, h)
    }
    case 'torus': {
      const r = resolveNumber(props.radius, 0.5)
      const tube = resolveNumber(props.tube, 0.1)
      const rs = resolveNumber(props.radialSegments, 16)
      const ts = resolveNumber(props.tubularSegments, 32)
      return new THREE.TorusGeometry(r, tube, rs, ts)
    }
    case 'circle': {
      const r = resolveNumber(props.radius, 0.5)
      const segments = resolveNumber(props.segments, 32)
      return new THREE.CircleGeometry(r, segments)
    }
    case 'ring': {
      const inner = resolveNumber(props.innerRadius, 0.2)
      const outer = resolveNumber(props.outerRadius, 0.5)
      const segments = resolveNumber(props.segments, 32)
      return new THREE.RingGeometry(inner, outer, segments)
    }
    case 'dodecahedron': {
      const r = resolveNumber(props.radius, 0.5)
      return new THREE.DodecahedronGeometry(r)
    }
    case 'icosahedron': {
      const r = resolveNumber(props.radius, 0.5)
      return new THREE.IcosahedronGeometry(r)
    }
    case 'octahedron': {
      const r = resolveNumber(props.radius, 0.5)
      return new THREE.OctahedronGeometry(r)
    }
    case 'tetrahedron': {
      const r = resolveNumber(props.radius, 0.5)
      return new THREE.TetrahedronGeometry(r)
    }
  }
}
