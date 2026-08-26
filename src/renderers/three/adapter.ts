import type { ThreeSceneOutput } from './types.js'

// ─── DOM Adapter ──────────────────────────────────────────────────────────
//
// This module is the only code that touches browser DOM APIs for Three.js.
// It is guarded behind a typeof check for Node.js compatibility.

// ─── Mount ────────────────────────────────────────────────────────────────

export function mountThree(
  output: ThreeSceneOutput,
  container: HTMLElement,
): HTMLCanvasElement | null {
  if (typeof document === 'undefined') return null
  container.appendChild(output.canvas)
  return output.canvas
}

// ─── Unmount ──────────────────────────────────────────────────────────────

export function unmountThree(container: HTMLElement): void {
  while (container.firstChild) {
    container.removeChild(container.firstChild)
  }
}

// ─── Get Canvas ───────────────────────────────────────────────────────────

export function getThreeCanvas(container: HTMLElement): HTMLCanvasElement | null {
  if (typeof document === 'undefined') return null
  return container.querySelector('canvas')
}

// ─── ThreeAdapter Class ───────────────────────────────────────────────────

export class ThreeAdapter {
  private container: HTMLElement
  private output: ThreeSceneOutput | null = null
  private animationFrameId: number | null = null
  private disposed = false

  constructor(container: HTMLElement) {
    this.container = container
  }

  render(output: ThreeSceneOutput): void {
    if (this.disposed) return

    if (this.output) {
      this.cleanup()
    }

    this.output = output
    mountThree(output, this.container)

    if (output.animationMixer) {
      this.startAnimationLoop(output)
    }
  }

  private startAnimationLoop(output: ThreeSceneOutput): void {
    const mixer = output.animationMixer
    if (!mixer) return

    let lastTime = performance.now()

    const animate = () => {
      if (this.disposed) return
      const now = performance.now()
      const delta = (now - lastTime) / 1000
      lastTime = now
      mixer.update(delta)
      output.renderer.render(output.scene, output.camera)
      this.animationFrameId = requestAnimationFrame(animate)
    }

    this.animationFrameId = requestAnimationFrame(animate)
  }

  private cleanup(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId)
      this.animationFrameId = null
    }

    if (this.output) {
      unmountThree(this.container)
      this.output.dispose()
      this.output = null
    }
  }

  dispose(): void {
    this.disposed = true
    this.cleanup()
  }
}
