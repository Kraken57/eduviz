import type { Entity, Scene, PropertyBag, PolylineRenderData, PointCloudRenderData } from '../../ir/types.js'
import { detectShapeType, createGeometry, setThreeModule as setShapesThree } from './shapes.js'
import { resolveMaterialConfig, resolveNumber, resolveString, materialCacheKey } from './materials.js'
import { resolvePosition, resolveRotation, resolveScale, resolveVisible } from './transforms.js'
import { findChildren, isRootEntity } from './groups.js'
import { setupUserData } from './interactions.js'
import { createFallbackObject } from './fallback.js'
import { createPolylineGeometry, createPolylineMaterial, createPointCloudGeometry, createPointCloudMaterial, setThreeModule as setDataThree } from './data.js'
import { createEdgeLine, setThreeModule as setConnectionsThree } from './connections.js'
import { setThreeModule as setFallbackThree } from './fallback.js'

// ─── Three.js Lazy Import ─────────────────────────────────────────────────

type ThreeModule = typeof import('three')

let _three: ThreeModule | null = null

export function setThreeModule(three: ThreeModule): void {
  _three = three
  setShapesThree(three)
  setDataThree(three)
  setConnectionsThree(three)
  setFallbackThree(three)
}

function getThree(): ThreeModule {
  if (_three === null) {
    throw new Error('Three.js is not available.')
  }
  return _three
}

// ─── Material Cache ───────────────────────────────────────────────────────

const materialCache = new Map<string, InstanceType<ThreeModule['Material']>>()

function getOrCreateMaterial(props: PropertyBag): InstanceType<ThreeModule['MeshStandardMaterial']> {
  const THREE = getThree()
  const config = resolveMaterialConfig(props)
  const key = materialCacheKey(config)

  const cached = materialCache.get(key)
  if (cached && 'isMeshStandardMaterial' in cached && cached.isMeshStandardMaterial) {
    return cached as InstanceType<ThreeModule['MeshStandardMaterial']>
  }

  const material = new THREE.MeshStandardMaterial({
    color: config.color,
    transparent: config.opacity < 1,
    opacity: config.opacity,
    wireframe: config.wireframe,
    roughness: config.roughness,
    metalness: config.metalness,
    emissive: config.emissive,
    emissiveIntensity: config.emissiveIntensity,
    side: config.side === 'double' ? THREE.DoubleSide
      : config.side === 'back' ? THREE.BackSide
      : THREE.FrontSide,
    depthWrite: config.depthWrite,
    flatShading: config.flatShading,
  })

  materialCache.set(key, material)
  return material
}

export function clearMaterialCache(): void {
  for (const mat of materialCache.values()) {
    mat.dispose()
  }
  materialCache.clear()
}

// ─── Position Helpers ─────────────────────────────────────────────────────

function getEntityPosition(entity: Entity): { x: number; y: number; z: number } {
  return resolvePosition(entity.properties)
}

function applyTransforms(
  object: InstanceType<ThreeModule['Object3D']>,
  props: PropertyBag,
): void {
  const pos = resolvePosition(props)
  const rot = resolveRotation(props)
  const scale = resolveScale(props)
  const visible = resolveVisible(props)

  object.position.set(pos.x, pos.y, pos.z)
  object.rotation.set(rot.x, rot.y, rot.z)
  object.scale.set(scale.x, scale.y, scale.z)
  object.visible = visible
}

// ─── Entity to Object3D ───────────────────────────────────────────────────

function createEntityObject(
  entity: Entity,
  scene: Scene,
): InstanceType<ThreeModule['Object3D']> {
  const THREE = getThree()

  const isGroup = entity.type === 'group' ||
    findChildren(entity.id, scene.relationships ?? []).length > 0

  let object: InstanceType<ThreeModule['Object3D']>

  if (isGroup) {
    object = new THREE.Group()
    object.name = entity.id
  } else if (entity.type === 'shape') {
    const shapeType = detectShapeType(entity.properties)
    const geometry = createGeometry(shapeType, entity.properties) as InstanceType<ThreeModule['BufferGeometry']>
    const material = getOrCreateMaterial(entity.properties)
    object = new THREE.Mesh(geometry as never, material)
    object.name = entity.id
  } else if (entity.type === 'data') {
    object = createDataObject(entity)
    object.name = entity.id
  } else if (entity.type === 'text') {
    object = createTextObject(entity)
    object.name = entity.id
  } else {
    object = createFallbackObject(entity)
    object.name = entity.id
  }

  applyTransforms(object, entity.properties)
  setupUserData(object, entity)

  return object
}

// ─── Data Entity ──────────────────────────────────────────────────────────

function createDataObject(entity: Entity): InstanceType<ThreeModule['Object3D']> {
  const THREE = getThree()
  const renderData = entity.properties.renderData
  if (!renderData || typeof renderData !== 'object') {
    return createFallbackObject(entity)
  }

  const rd = 'value' in renderData ? renderData.value : renderData
  if (!rd || typeof rd !== 'object') {
    return createFallbackObject(entity)
  }

  const data = rd as Record<string, unknown>

  if (data.kind === 'polyline') {
    const polylineData = data as unknown as PolylineRenderData
    const geometry = createPolylineGeometry(polylineData)
    const material = createPolylineMaterial(entity.properties)
    return new THREE.Line(geometry as never, material)
  }

  if (data.kind === 'pointcloud') {
    const pcData = data as unknown as PointCloudRenderData
    const geometry = createPointCloudGeometry(pcData)
    const material = createPointCloudMaterial(entity.properties)
    return new THREE.Points(geometry as never, material)
  }

  return createFallbackObject(entity)
}

// ─── Text Entity ──────────────────────────────────────────────────────────

function createTextObject(entity: Entity): InstanceType<ThreeModule['Object3D']> {
  const THREE = getThree()
  const text = resolveString(entity.properties.text, entity.id)
  const fontSize = resolveNumber(entity.properties.fontSize, 1)

  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    return createFallbackObject(entity)
  }

  canvas.width = 512
  canvas.height = 128
  ctx.fillStyle = 'transparent'
  ctx.fillRect(0, 0, 512, 128)
  ctx.fillStyle = resolveString(entity.properties.fill, '#333333')
  ctx.font = `${Math.round(fontSize * 32)}px sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(text, 256, 64)

  const texture = new THREE.CanvasTexture(canvas)
  texture.needsUpdate = true
  const material = new THREE.SpriteMaterial({ map: texture, transparent: true })
  const sprite = new THREE.Sprite(material)
  sprite.scale.set(fontSize * 4, fontSize, 1)
  sprite.name = `text-${entity.id}`

  return sprite
}

// ─── Build Full Scene ─────────────────────────────────────────────────────

export function buildThreeScene(
  scene: Scene,
): {
  threeScene: InstanceType<ThreeModule['Scene']>
  objectMap: Map<string, InstanceType<ThreeModule['Object3D']>>
  warnings: string[]
} {
  const THREE = getThree()
  const threeScene = new THREE.Scene()
  const objectMap = new Map<string, InstanceType<ThreeModule['Object3D']>>()
  const warnings: string[] = []

  const bg = scene.viewport?.background
  if (bg) {
    threeScene.background = new THREE.Color(bg)
  }

  for (const entity of scene.entities) {
    try {
      const object = createEntityObject(entity, scene)
      objectMap.set(entity.id, object)
    } catch (err) {
      warnings.push(`Failed to create object for entity ${entity.id}: ${err}`)
    }
  }

  const relationships = scene.relationships ?? []

  for (const entity of scene.entities) {
    const object = objectMap.get(entity.id)
    if (!object) continue

    if (isRootEntity(entity.id, relationships)) {
      threeScene.add(object)
    }

    const children = findChildren(entity.id, relationships)
    for (const childId of children) {
      const child = objectMap.get(childId)
      if (child) {
        object.add(child)
      }
    }
  }

  for (const rel of relationships) {
    if (rel.type === 'edge') {
      const fromObj = objectMap.get(rel.from)
      const toObj = objectMap.get(rel.to)
      if (fromObj && toObj) {
        const fromPos = getEntityPosition({ id: rel.from, type: 'shape', properties: {} })
        const toPos = getEntityPosition({ id: rel.to, type: 'shape', properties: {} })
        const line = createEdgeLine(fromPos, toPos)
        line.name = `edge-${rel.from}-${rel.to}`
        threeScene.add(line)
      }
    }
  }

  return { threeScene, objectMap, warnings }
}

// ─── Scene Disposal ───────────────────────────────────────────────────────

export function disposeScene(
  scene: InstanceType<ThreeModule['Scene']>,
): void {
  scene.traverse((obj) => {
    const mesh = obj as InstanceType<ThreeModule['Mesh']> & {
      geometry?: InstanceType<ThreeModule['BufferGeometry']>
      material?: InstanceType<ThreeModule['Material']>
    }
    if (mesh.geometry) {
      mesh.geometry.dispose()
    }
    if (mesh.material) {
      const mat = mesh.material as InstanceType<ThreeModule['Material']> & {
        map?: InstanceType<ThreeModule['Texture']>
      }
      mat.dispose()
      if (mat.map) {
        mat.map.dispose()
      }
    }
  })
}
