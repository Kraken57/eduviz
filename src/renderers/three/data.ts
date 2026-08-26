import type {
  PolylineRenderData,
  PointCloudRenderData,
  PropertyBag,
} from '../../ir/types.js'
import { resolveNumber, resolveString, resolvePrimitive } from './materials.js'

// ─── Three.js Lazy Import ─────────────────────────────────────────────────

type ThreeModule = typeof import('three')

let _three: ThreeModule | null = null

export function setThreeModule(three: ThreeModule): void {
  _three = three
}

function getThree(): ThreeModule {
  if (_three === null) {
    throw new Error('Three.js is not available.')
  }
  return _three
}

// ─── Polyline to Line ─────────────────────────────────────────────────────

export function createPolylineGeometry(data: PolylineRenderData): InstanceType<ThreeModule['BufferGeometry']> {
  const THREE = getThree()
  const points: number[] = []

  for (const pt of data.points) {
    points.push(pt.x, pt.y, 0)
  }

  if (data.closed && data.points.length > 0) {
    const first = data.points[0]!
    points.push(first.x, first.y, 0)
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(points, 3),
  )
  return geometry
}

export function createPolylineMaterial(
  props: PropertyBag,
): InstanceType<ThreeModule['LineBasicMaterial']> {
  const THREE = getThree()
  const color = resolveString(props.fill ?? props.stroke, '#4A90D9')
  const opacity = resolveNumber(props.opacity, 1)

  return new THREE.LineBasicMaterial({
    color,
    transparent: opacity < 1,
    opacity,
  })
}

// ─── PointCloud to Points ─────────────────────────────────────────────────

export function createPointCloudGeometry(
  data: PointCloudRenderData,
): InstanceType<ThreeModule['BufferGeometry']> {
  const THREE = getThree()
  const positions: number[] = []
  const colors: number[] = []

  for (const pt of data.points) {
    positions.push(pt.x, pt.y, 0)

    const color = resolvePrimitive(pt.fill)
    if (typeof color === 'string') {
      const parsed = parseColorToRgb(color)
      colors.push(parsed.r, parsed.g, parsed.b)
    } else {
      colors.push(0.29, 0.56, 0.85)
    }
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(positions, 3),
  )
  geometry.setAttribute(
    'color',
    new THREE.Float32BufferAttribute(colors, 3),
  )
  return geometry
}

export function createPointCloudMaterial(
  props: PropertyBag,
): InstanceType<ThreeModule['PointsMaterial']> {
  const THREE = getThree()
  const opacity = resolveNumber(props.opacity, 1)
  const size = resolveNumber(props.radius, 0.1)

  return new THREE.PointsMaterial({
    size,
    vertexColors: true,
    transparent: opacity < 1,
    opacity,
    sizeAttenuation: true,
  })
}

// ─── Color Parsing ────────────────────────────────────────────────────────

function parseColorToRgb(color: string): { r: number; g: number; b: number } {
  const hex = color.startsWith('#') ? color.slice(1) : color
  if (hex.length === 3) {
    const r = parseInt(hex[0]!.repeat(2), 16) / 255
    const g = parseInt(hex[1]!.repeat(2), 16) / 255
    const b = parseInt(hex[2]!.repeat(2), 16) / 255
    return { r, g, b }
  }
  if (hex.length === 6) {
    const r = parseInt(hex.slice(0, 2), 16) / 255
    const g = parseInt(hex.slice(2, 4), 16) / 255
    const b = parseInt(hex.slice(4, 6), 16) / 255
    return { r, g, b }
  }
  return { r: 0.29, g: 0.56, b: 0.85 }
}
