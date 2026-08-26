import type * as THREE from 'three'
import type { EntityType, Vec3, Color } from '../../ir/types.js'

// ─── Three.js Camera Config ───────────────────────────────────────────────

export interface ThreeCameraConfig {
  projection: 'perspective' | 'orthographic'
  fov: number
  near: number
  far: number
  position: Vec3
  target: Vec3
  zoom: number
}

// ─── Three.js Lighting Config ─────────────────────────────────────────────

export interface ThreeLightingConfig {
  ambient: { color: Color; intensity: number }
  directional: { color: Color; intensity: number; position: Vec3 }
}

// ─── Three.js Render Context ──────────────────────────────────────────────

export interface ThreeRenderContext {
  scene: THREE.Scene
  camera: THREE.Camera
  objectMap: Map<string, THREE.Object3D>
  warnings: string[]
}

// ─── Entity Render Entry ──────────────────────────────────────────────────

export interface ThreeEntityRenderEntry {
  object: THREE.Object3D
  entityType: EntityType
}

// ─── Three.js Scene Output ────────────────────────────────────────────────

export interface ThreeSceneOutput {
  scene: THREE.Scene
  camera: THREE.Camera
  renderer: THREE.WebGLRenderer
  canvas: HTMLCanvasElement
  entityMap: Record<string, ThreeEntityRenderEntry>
  warnings: string[]
  animationMixer?: THREE.AnimationMixer
  dispose: () => void
}

// ─── Shape Definitions ────────────────────────────────────────────────────

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

// ─── Material Cache Key ───────────────────────────────────────────────────

export interface MaterialConfig {
  color: string
  opacity: number
  wireframe: boolean
  roughness: number
  metalness: number
  emissive: string
  emissiveIntensity: number
  side: 'front' | 'back' | 'double'
  depthWrite: boolean
  flatShading: boolean
}
