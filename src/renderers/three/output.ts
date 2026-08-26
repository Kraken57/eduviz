import type { ThreeSceneOutput } from './types.js'

// ─── Output Assembly ──────────────────────────────────────────────────────

export function buildThreeOutput(
  scene: ThreeSceneOutput['scene'],
  camera: ThreeSceneOutput['camera'],
  renderer: ThreeSceneOutput['renderer'],
  canvas: HTMLCanvasElement,
  entityMap: ThreeSceneOutput['entityMap'],
  warnings: string[],
  animationMixer?: ThreeSceneOutput['animationMixer'],
): ThreeSceneOutput {
  return {
    scene,
    camera,
    renderer,
    canvas,
    entityMap,
    warnings,
    animationMixer,
    dispose: () => {
      renderer.dispose()
      const gl = renderer.getContext()
      const ext = gl.getExtension('WEBGL_lose_context')
      ext?.loseContext()
    },
  }
}
