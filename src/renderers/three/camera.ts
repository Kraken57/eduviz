import type { Camera, Vec2, Vec3 } from '../../ir/types.js'
import type { ThreeCameraConfig } from './types.js'

// ─── Default Camera Config ────────────────────────────────────────────────

const DEFAULT_CAMERA_CONFIG: ThreeCameraConfig = {
  projection: 'perspective',
  fov: 60,
  near: 0.1,
  far: 1000,
  position: { x: 5, y: 5, z: 10 },
  target: { x: 0, y: 0, z: 0 },
  zoom: 1,
}

// ─── Normalize Vec2/Vec3 to Vec3 ──────────────────────────────────────────

function toVec3(v: Vec2 | Vec3 | undefined, fallback: Vec3): Vec3 {
  if (!v) return fallback
  if ('z' in v) return v
  return { x: v.x, y: v.y, z: 0 }
}

// ─── Resolve Camera Config ────────────────────────────────────────────────

export function resolveCameraConfig(
  irCamera?: Camera,
  options?: Record<string, unknown>,
): ThreeCameraConfig {
  const cameraOpts = (options?.camera ?? {}) as Record<string, unknown>

  const irPos = toVec3(irCamera?.position, DEFAULT_CAMERA_CONFIG.position)
  const irTarget = toVec3(irCamera?.target, DEFAULT_CAMERA_CONFIG.target)

  return {
    projection: (cameraOpts.projection as string) as ThreeCameraConfig['projection']
      ?? irCamera?.projection
      ?? DEFAULT_CAMERA_CONFIG.projection,
    fov: (cameraOpts.fov as number) ?? irCamera?.fov ?? DEFAULT_CAMERA_CONFIG.fov,
    near: (cameraOpts.near as number) ?? irCamera?.near ?? DEFAULT_CAMERA_CONFIG.near,
    far: (cameraOpts.far as number) ?? irCamera?.far ?? DEFAULT_CAMERA_CONFIG.far,
    position: {
      x: (cameraOpts.position as Vec3 | undefined)?.x ?? irPos.x,
      y: (cameraOpts.position as Vec3 | undefined)?.y ?? irPos.y,
      z: (cameraOpts.position as Vec3 | undefined)?.z ?? irPos.z,
    },
    target: {
      x: (cameraOpts.target as Vec3 | undefined)?.x ?? irTarget.x,
      y: (cameraOpts.target as Vec3 | undefined)?.y ?? irTarget.y,
      z: (cameraOpts.target as Vec3 | undefined)?.z ?? irTarget.z,
    },
    zoom: (cameraOpts.zoom as number) ?? irCamera?.zoom ?? DEFAULT_CAMERA_CONFIG.zoom,
  }
}

// ─── Validate Camera Config ───────────────────────────────────────────────

export function validateCameraConfig(config: ThreeCameraConfig): string[] {
  const warnings: string[] = []

  if (config.projection === 'perspective') {
    if (config.fov <= 0 || config.fov >= 180) {
      warnings.push(`Invalid FOV: ${config.fov}. Must be between 0 and 180.`)
    }
  }

  if (config.near >= config.far) {
    warnings.push(`Near plane (${config.near}) must be less than far plane (${config.far}).`)
  }

  if (config.zoom <= 0) {
    warnings.push(`Zoom must be positive. Got: ${config.zoom}.`)
  }

  return warnings
}
