import type { Entity } from '../../ir/types.js'
import { resolveNumber, resolveString } from './materials.js'

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

// ─── Fallback Box with Label ──────────────────────────────────────────────

export function createFallbackObject(entity: Entity): InstanceType<ThreeModule['Group']> {
  const THREE = getThree()
  const group = new THREE.Group()
  group.name = `fallback-${entity.id}`

  const width = resolveNumber(entity.properties.width, 1)
  const height = resolveNumber(entity.properties.height, 1)
  const depth = resolveNumber(entity.properties.depth, 1)

  const geometry = new THREE.BoxGeometry(width, height, depth)
  const edges = new THREE.EdgesGeometry(geometry)
  const color = resolveString(entity.properties.fill ?? entity.properties.stroke, '#999999')
  const lineMaterial = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.6 })
  const wireframe = new THREE.LineSegments(edges, lineMaterial)
  group.add(wireframe)

  const label = entity.name ?? entity.id
  if (label) {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (ctx) {
      canvas.width = 256
      canvas.height = 64
      ctx.fillStyle = 'transparent'
      ctx.fillRect(0, 0, 256, 64)
      ctx.fillStyle = '#333333'
      ctx.font = '20px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(label, 128, 36)

      const texture = new THREE.CanvasTexture(canvas)
      const spriteMaterial = new THREE.SpriteMaterial({ map: texture, transparent: true })
      const sprite = new THREE.Sprite(spriteMaterial)
      sprite.scale.set(width * 0.8, width * 0.2, 1)
      sprite.position.set(0, height * 0.6, 0)
      group.add(sprite)
    }
  }

  return group
}
