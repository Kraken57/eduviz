

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

// ─── Edge Line Creation ───────────────────────────────────────────────────

export function createEdgeLine(
  fromPos: { x: number; y: number; z: number },
  toPos: { x: number; y: number; z: number },
): InstanceType<ThreeModule['Line']> {
  const THREE = getThree()
  const points = [
    new THREE.Vector3(fromPos.x, fromPos.y, fromPos.z),
    new THREE.Vector3(toPos.x, toPos.y, toPos.z),
  ]

  const geometry = new THREE.BufferGeometry().setFromPoints(points)
  const material = new THREE.LineBasicMaterial({
    color: '#666666',
    transparent: true,
    opacity: 0.6,
  })

  return new THREE.Line(geometry, material)
}
