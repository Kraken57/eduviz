import type { Entity, InteractionEvent } from '../../ir/types.js'


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

// ─── User Data Setup ──────────────────────────────────────────────────────

export interface EntityUserData {
  entityId: string
  entityType: string
  interactive: boolean
  cursor?: string
  tooltip?: string
  interactions?: InteractionEvent[]
}

export function setupUserData(
  object: InstanceType<ThreeModule['Object3D']>,
  entity: Entity,
): void {
  const props = entity.properties
  const interactProp = props.interact
  const interactObj = interactProp && typeof interactProp === 'object' && 'value' in interactProp
    ? (interactProp as { value: unknown }).value
    : interactProp

  let interactions: InteractionEvent[] | undefined
  let cursor: string | undefined
  let tooltip: string | undefined

  if (interactObj && typeof interactObj === 'object' && !Array.isArray(interactObj)) {
    const io = interactObj as Record<string, unknown>
    if (Array.isArray(io.on)) {
      interactions = io.on as InteractionEvent[]
    }
    if (typeof io.cursor === 'string') {
      cursor = io.cursor
    }
    if (typeof io.tooltip === 'string') {
      tooltip = io.tooltip
    }
  }

  object.userData = {
    entityId: entity.id,
    entityType: entity.type,
    interactive: interactions !== undefined && interactions.length > 0,
    cursor: cursor ?? (interactions ? 'pointer' : undefined),
    tooltip,
    interactions,
  }
}

// ─── Raycasting Setup ─────────────────────────────────────────────────────

export interface RaycastResult {
  entityId: string
  entityType: string
  object: InstanceType<ThreeModule['Object3D']>
  point: InstanceType<ThreeModule['Vector3']>
  distance: number
}

export function performRaycast(
  raycaster: InstanceType<ThreeModule['Raycaster']>,
  mouse: { x: number; y: number },
  camera: InstanceType<ThreeModule['Camera']>,
  scene: InstanceType<ThreeModule['Scene']>,
): RaycastResult[] {
  const THREE = getThree()
  raycaster.setFromCamera(new THREE.Vector2(mouse.x, mouse.y), camera)
  const intersects = raycaster.intersectObjects(scene.children, true)

  const results: RaycastResult[] = []
  for (const hit of intersects) {
    let obj: InstanceType<ThreeModule['Object3D']> | null = hit.object
    while (obj) {
      if (obj.userData?.entityId) {
        results.push({
          entityId: obj.userData.entityId,
          entityType: obj.userData.entityType ?? 'unknown',
          object: obj,
          point: hit.point,
          distance: hit.distance,
        })
        break
      }
      obj = obj.parent
    }
  }

  return results
}

// ─── Cursor Style Update ──────────────────────────────────────────────────

export function updateCursor(
  canvas: HTMLCanvasElement,
  results: RaycastResult[],
): void {
  if (results.length > 0) {
    const cursor = results[0]!.object.userData?.cursor ?? 'pointer'
    canvas.style.cursor = cursor
  } else {
    canvas.style.cursor = 'default'
  }
}
