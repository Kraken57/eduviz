import type { Vec3 } from '../../ir/types.js'

// ─── Default Lighting Config ──────────────────────────────────────────────

export interface ThreeLightingConfig {
  ambient: { color: string; intensity: number }
  directional: { color: string; intensity: number; position: Vec3 }
}

const DEFAULT_LIGHTING_CONFIG: ThreeLightingConfig = {
  ambient: { color: '#ffffff', intensity: 0.4 },
  directional: { color: '#ffffff', intensity: 0.8, position: { x: 5, y: 10, z: 7 } },
}

// ─── Resolve Lighting Config ──────────────────────────────────────────────

export function resolveLightingConfig(
  options?: Record<string, unknown>,
): ThreeLightingConfig {
  const lightOpts = (options?.lighting ?? {}) as Record<string, unknown>
  const ambientOpts = (lightOpts.ambient ?? {}) as Record<string, unknown>
  const dirOpts = (lightOpts.directional ?? {}) as Record<string, unknown>
  const dirPos = (dirOpts.position ?? {}) as Record<string, unknown>

  return {
    ambient: {
      color: (ambientOpts.color as string) ?? DEFAULT_LIGHTING_CONFIG.ambient.color,
      intensity: (ambientOpts.intensity as number) ?? DEFAULT_LIGHTING_CONFIG.ambient.intensity,
    },
    directional: {
      color: (dirOpts.color as string) ?? DEFAULT_LIGHTING_CONFIG.directional.color,
      intensity: (dirOpts.intensity as number) ?? DEFAULT_LIGHTING_CONFIG.directional.intensity,
      position: {
        x: (dirPos.x as number) ?? DEFAULT_LIGHTING_CONFIG.directional.position.x,
        y: (dirPos.y as number) ?? DEFAULT_LIGHTING_CONFIG.directional.position.y,
        z: (dirPos.z as number) ?? DEFAULT_LIGHTING_CONFIG.directional.position.z,
      },
    },
  }
}

// ─── Validate Lighting Config ─────────────────────────────────────────────

export function validateLightingConfig(config: ThreeLightingConfig): string[] {
  const warnings: string[] = []

  if (config.ambient.intensity < 0 || config.ambient.intensity > 2) {
    warnings.push(`Ambient intensity ${config.ambient.intensity} outside recommended range [0, 2].`)
  }

  if (config.directional.intensity < 0 || config.directional.intensity > 2) {
    warnings.push(`Directional intensity ${config.directional.intensity} outside recommended range [0, 2].`)
  }

  return warnings
}
