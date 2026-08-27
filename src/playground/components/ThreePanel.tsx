import { useEffect, useRef } from 'react'
import type { ThreeSceneOutput } from '../../renderers/three/types'

interface Props {
  threeOutput: ThreeSceneOutput | null
  error: string | null
}

export function ThreePanel({ threeOutput, error }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const cleanupRef = useRef<(() => void) | null>(null)
  const rafRef = useRef<number>(0)

  useEffect(() => {
    if (cleanupRef.current) {
      cleanupRef.current()
      cleanupRef.current = null
    }
    cancelAnimationFrame(rafRef.current)

    if (!containerRef.current || !threeOutput) return

    const container = containerRef.current
    container.appendChild(threeOutput.canvas)

    threeOutput.canvas.style.width = '100%'
    threeOutput.canvas.style.height = '100%'
    threeOutput.canvas.style.display = 'block'

    // Animation loop
    const mixer = threeOutput.animationMixer
    const renderer = threeOutput.renderer
    const scene = threeOutput.scene
    const camera = threeOutput.camera

    let lastTime = performance.now()
    const animate = (now: number) => {
      const delta = (now - lastTime) / 1000
      lastTime = now

      if (mixer) {
        mixer.update(delta)
      }
      renderer.render(scene, camera)
      rafRef.current = requestAnimationFrame(animate)
    }
    rafRef.current = requestAnimationFrame(animate)

    cleanupRef.current = () => {
      cancelAnimationFrame(rafRef.current)
      while (container.firstChild) {
        container.removeChild(container.firstChild)
      }
      threeOutput.dispose()
    }

    return () => {
      if (cleanupRef.current) {
        cleanupRef.current()
        cleanupRef.current = null
      }
    }
  }, [threeOutput])

  if (error) {
    return (
      <div className="visualization">
        <div className="error">
          <div className="message">Render Error: {error}</div>
        </div>
      </div>
    )
  }

  if (!threeOutput) {
    return (
      <div className="visualization">
        <div className="empty-state">Select a 3D example to visualize</div>
      </div>
    )
  }

  return (
    <div className="visualization">
      <div className="toolbar">
        <div className="info">
          <span>Renderer: three-3d</span>
          <span>Entities: {Object.keys(threeOutput.entityMap).length}</span>
          {threeOutput.warnings.length > 0 && (
            <span>Warnings: {threeOutput.warnings.length}</span>
          )}
          {threeOutput.animationMixer && (
            <span style={{ color: '#4caf50' }}>● Animating</span>
          )}
        </div>
      </div>
      <div
        ref={containerRef}
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '0',
          background: '#1a1a2e',
          overflow: 'hidden',
        }}
      />
    </div>
  )
}
