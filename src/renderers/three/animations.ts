import type {
  AnimationBinding,
  PropertyAnim,
  PropertyBag,
} from '../../ir/types.js'

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

// ─── Property Animation ───────────────────────────────────────────────────

const PROPERTY_MAP: Record<string, string> = {
  x: 'position.x',
  y: 'position.y',
  z: 'position.z',
  rotationX: 'rotation.x',
  rotationY: 'rotation.y',
  rotationZ: 'rotation.z',
  scaleX: 'scale.x',
  scaleY: 'scale.y',
  scaleZ: 'scale.z',
  opacity: 'material.opacity',
}

function resolveThreeProperty(irProp: string): string | null {
  return PROPERTY_MAP[irProp] ?? null
}

// ─── Keyframes to Three.js KeyframeTrack ──────────────────────────────────

export function createKeyframeTracks(
  binding: AnimationBinding,
  objectMap: Map<string, InstanceType<ThreeModule['Object3D']>>,
): InstanceType<ThreeModule['KeyframeTrack']>[] {
  const THREE = getThree()
  const parts = binding.target.split('.')
  if (parts.length < 2) return []

  const entityId = parts[0]!
  const irProp = parts.slice(1).join('.')
  const threeProp = resolveThreeProperty(irProp)
  if (!threeProp) return []

  const object = objectMap.get(entityId)
  if (!object) return []

  const times: number[] = []
  const values: number[] = []

  for (const kf of binding.keyframes) {
    times.push(kf.offset * (binding.duration / 1000))
    const v = typeof kf.value === 'number' ? kf.value : 0
    values.push(v)
  }

  const trackName = `${entityId}.${threeProp}`
  return [new THREE.NumberKeyframeTrack(trackName, times, values)]
}

// ─── Property Anim to Keyframe Track ──────────────────────────────────────

export function createPropertyAnimTracks(
  entityId: string,
  _props: PropertyBag,
  anim: PropertyAnim,
  _objectMap: Map<string, InstanceType<ThreeModule['Object3D']>>,
): InstanceType<ThreeModule['KeyframeTrack']>[] {
  const THREE = getThree()
  const threeProp = resolveThreeProperty(entityId)
  if (!threeProp) return []

  const times: number[] = []
  const values: number[] = []

  for (const kf of anim.keyframes) {
    times.push(kf.offset * (anim.duration / 1000))
    const v = typeof kf.value === 'number' ? kf.value : 0
    values.push(v)
  }

  if (times.length === 0) return []

  const trackName = `${entityId}.${threeProp}`
  return [new THREE.NumberKeyframeTrack(trackName, times, values)]
}

// ─── Scene Animations ─────────────────────────────────────────────────────

export function createSceneAnimations(
  animations: AnimationBinding[],
  objectMap: Map<string, InstanceType<ThreeModule['Object3D']>>,
): InstanceType<ThreeModule['AnimationClip']>[] {
  const THREE = getThree()
  const clips: InstanceType<ThreeModule['AnimationClip']>[] = []

  for (let i = 0; i < animations.length; i++) {
    const binding = animations[i]!
    const tracks = createKeyframeTracks(binding, objectMap)
    if (tracks.length > 0) {
      const duration = binding.duration / 1000
      const clip = new THREE.AnimationClip(
        `animation-${i}`,
        duration,
        tracks,
      )
      clips.push(clip)
    }
  }

  return clips
}
