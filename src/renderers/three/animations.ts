import type {
  AnimationBinding,
  PropertyBag,
  Prop,
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

// ─── Property → Three.js Path Map ──────────────────────────────────────────

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

// ─── Scene-level AnimationBinding → KeyframeTrack ──────────────────────────

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
    times.push(kf.offset * binding.duration)
    const v = typeof kf.value === 'number' ? kf.value : 0
    values.push(v)
  }

  const trackName = `${entityId}.${threeProp}`
  return [new THREE.NumberKeyframeTrack(trackName, times, values)]
}

// ─── Per-entity PropertyAnim → KeyframeTrack ───────────────────────────────

export function createPropertyAnimTracks(
  entityId: string,
  properties: PropertyBag,
  objectMap: Map<string, InstanceType<ThreeModule['Object3D']>>,
): InstanceType<ThreeModule['KeyframeTrack']>[] {
  const THREE = getThree()
  const object = objectMap.get(entityId)
  if (!object) return []

  const tracks: InstanceType<ThreeModule['KeyframeTrack']>[] = []

  for (const [key, prop] of Object.entries(properties)) {
    if (prop === null || typeof prop !== 'object' || !('anim' in prop)) continue
    const propObj = prop as Prop
    const anim = propObj.anim
    if (!anim) continue

    const threeProp = resolveThreeProperty(key)
    if (!threeProp) continue

    const times: number[] = []
    const values: number[] = []

    for (const kf of anim.keyframes) {
      times.push(kf.offset * anim.duration)
      const v = typeof kf.value === 'number' ? kf.value : 0
      values.push(v)
    }

    if (times.length === 0) continue

    const trackName = `${entityId}.${threeProp}`
    const track = new THREE.NumberKeyframeTrack(trackName, times, values)
    tracks.push(track)
  }

  return tracks
}

// ─── Collect all entity animations → AnimationClip[] ───────────────────────

export function createEntityAnimations(
  entities: Array<{ id: string; properties: PropertyBag }>,
  objectMap: Map<string, InstanceType<ThreeModule['Object3D']>>,
): InstanceType<ThreeModule['AnimationClip']>[] {
  const THREE = getThree()
  const clips: InstanceType<ThreeModule['AnimationClip']>[] = []

  for (let i = 0; i < entities.length; i++) {
    const entity = entities[i]!
    const tracks = createPropertyAnimTracks(entity.id, entity.properties, objectMap)
    if (tracks.length > 0) {
      const maxDuration = Math.max(
        ...tracks.map(t => {
          const times = t.times
          return times.length > 0 ? times[times.length - 1] : 0
        }),
      )
      const clip = new THREE.AnimationClip(
        `entity-${entity.id}`,
        maxDuration || 1,
        tracks,
      )
      clips.push(clip)
    }
  }

  return clips
}

// ─── Scene Animations (AnimationBinding[]) ─────────────────────────────────

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
      const duration = binding.duration
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
