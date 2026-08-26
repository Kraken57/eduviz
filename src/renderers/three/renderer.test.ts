import { describe, it } from 'node:test'
import * as assert from 'node:assert/strict'
import type { PropertyBag } from '../../ir/types.js'
import {
  resolvePrimitive,
  resolveNumber,
  resolveString,
  resolveBoolean,
  resolveMaterialConfig,
  materialCacheKey,
  DEFAULT_MATERIAL_CONFIG,
} from './materials.js'
import { resolveCameraConfig, validateCameraConfig } from './camera.js'
import { resolveLightingConfig, validateLightingConfig } from './lighting.js'
import { resolvePosition, resolveRotation, resolveScale, resolveVisible } from './transforms.js'
import { isRootEntity, findChildren, buildContainmentTree } from './groups.js'
import type { Entity, Relationship, Scene } from '../../ir/types.js'

// ─── Materials Tests ──────────────────────────────────────────────────────

describe('materials', () => {
  describe('resolvePrimitive', () => {
    it('extracts from Prop', () => {
      assert.equal(resolvePrimitive({ value: 42 }), 42)
    })

    it('extracts plain value', () => {
      assert.equal(resolvePrimitive('hello'), 'hello')
    })

    it('extracts null', () => {
      assert.equal(resolvePrimitive(null), null)
    })

    it('returns undefined for undefined', () => {
      assert.equal(resolvePrimitive(undefined), undefined)
    })
  })

  describe('resolveNumber', () => {
    it('returns number from Prop', () => {
      assert.equal(resolveNumber({ value: 3.14 }, 0), 3.14)
    })

    it('returns number from plain value', () => {
      assert.equal(resolveNumber(42, 0), 42)
    })

    it('returns fallback for non-number', () => {
      assert.equal(resolveNumber({ value: 'abc' }, 10), 10)
    })

    it('returns fallback for undefined', () => {
      assert.equal(resolveNumber(undefined, 5), 5)
    })
  })

  describe('resolveString', () => {
    it('returns string from Prop', () => {
      assert.equal(resolveString({ value: 'red' }, 'blue'), 'red')
    })

    it('returns fallback for non-string', () => {
      assert.equal(resolveString({ value: 42 }, 'blue'), 'blue')
    })

    it('returns fallback for undefined', () => {
      assert.equal(resolveString(undefined, 'green'), 'green')
    })
  })

  describe('resolveBoolean', () => {
    it('returns true from Prop', () => {
      assert.equal(resolveBoolean({ value: true }, false), true)
    })

    it('returns false from Prop', () => {
      assert.equal(resolveBoolean({ value: false }, true), false)
    })

    it('returns fallback for non-boolean', () => {
      assert.equal(resolveBoolean({ value: 1 }, false), false)
    })
  })

  describe('resolveMaterialConfig', () => {
    it('returns defaults for empty properties', () => {
      const config = resolveMaterialConfig({})
      assert.equal(config.color, DEFAULT_MATERIAL_CONFIG.color)
      assert.equal(config.opacity, DEFAULT_MATERIAL_CONFIG.opacity)
      assert.equal(config.wireframe, DEFAULT_MATERIAL_CONFIG.wireframe)
    })

    it('reads fill color', () => {
      const props: PropertyBag = { fill: '#FF0000' }
      assert.equal(resolveMaterialConfig(props).color, '#FF0000')
    })

    it('reads opacity', () => {
      const props: PropertyBag = { opacity: 0.5 }
      assert.equal(resolveMaterialConfig(props).opacity, 0.5)
    })

    it('reads wireframe', () => {
      const props: PropertyBag = { wireframe: true }
      assert.equal(resolveMaterialConfig(props).wireframe, true)
    })

    it('reads roughness and metalness', () => {
      const props: PropertyBag = { roughness: 0.3, metalness: 0.8 }
      const config = resolveMaterialConfig(props)
      assert.equal(config.roughness, 0.3)
      assert.equal(config.metalness, 0.8)
    })

    it('reads emissive properties', () => {
      const props: PropertyBag = { emissive: '#FF0000', emissiveIntensity: 0.5 }
      const config = resolveMaterialConfig(props)
      assert.equal(config.emissive, '#FF0000')
      assert.equal(config.emissiveIntensity, 0.5)
    })

    it('reads side property', () => {
      const props: PropertyBag = { side: 'double' }
      assert.equal(resolveMaterialConfig(props).side, 'double')
    })

    it('normalizes 3-char hex color', () => {
      const props: PropertyBag = { fill: '#F00' }
      assert.equal(resolveMaterialConfig(props).color, '#FF0000')
    })
  })

  describe('materialCacheKey', () => {
    it('produces same key for same config', () => {
      const a = resolveMaterialConfig({ fill: '#FF0000', opacity: 0.5 })
      const b = resolveMaterialConfig({ fill: '#FF0000', opacity: 0.5 })
      assert.equal(materialCacheKey(a), materialCacheKey(b))
    })

    it('produces different key for different config', () => {
      const a = resolveMaterialConfig({ fill: '#FF0000' })
      const b = resolveMaterialConfig({ fill: '#0000FF' })
      assert.notEqual(materialCacheKey(a), materialCacheKey(b))
    })
  })
})

// ─── Camera Config Tests ──────────────────────────────────────────────────

describe('camera', () => {
  describe('resolveCameraConfig', () => {
    it('returns defaults when no IR camera or options', () => {
      const config = resolveCameraConfig(undefined, undefined)
      assert.equal(config.projection, 'perspective')
      assert.equal(config.fov, 60)
      assert.equal(config.near, 0.1)
      assert.equal(config.far, 1000)
      assert.deepEqual(config.position, { x: 5, y: 5, z: 10 })
      assert.deepEqual(config.target, { x: 0, y: 0, z: 0 })
      assert.equal(config.zoom, 1)
    })

    it('uses IR camera position', () => {
      const config = resolveCameraConfig({
        position: { x: 10, y: 20 },
        zoom: 2,
      })
      assert.deepEqual(config.position, { x: 10, y: 20, z: 0 })
      assert.equal(config.zoom, 2)
    })

    it('uses IR camera position with Vec3', () => {
      const config = resolveCameraConfig({
        position: { x: 1, y: 2, z: 3 },
      })
      assert.deepEqual(config.position, { x: 1, y: 2, z: 3 })
    })

    it('IR camera fov/near/far override defaults', () => {
      const config = resolveCameraConfig({
        fov: 90,
        near: 0.5,
        far: 500,
      })
      assert.equal(config.fov, 90)
      assert.equal(config.near, 0.5)
      assert.equal(config.far, 500)
    })

    it('options override IR camera', () => {
      const config = resolveCameraConfig(
        { fov: 60 },
        { camera: { fov: 120 } },
      )
      assert.equal(config.fov, 120)
    })

    it('uses orthographic projection from IR', () => {
      const config = resolveCameraConfig({ projection: 'orthographic' })
      assert.equal(config.projection, 'orthographic')
    })
  })

  describe('validateCameraConfig', () => {
    it('returns no warnings for valid config', () => {
      const config = resolveCameraConfig(undefined, undefined)
      assert.deepEqual(validateCameraConfig(config), [])
    })

    it('warns for invalid FOV', () => {
      const warnings = validateCameraConfig({
        projection: 'perspective',
        fov: 200,
        near: 0.1,
        far: 1000,
        position: { x: 0, y: 0, z: 0 },
        target: { x: 0, y: 0, z: 0 },
        zoom: 1,
      })
      assert.ok(warnings.length > 0)
      assert.ok(warnings[0].includes('FOV'))
    })

    it('warns for near >= far', () => {
      const warnings = validateCameraConfig({
        projection: 'perspective',
        fov: 60,
        near: 10,
        far: 5,
        position: { x: 0, y: 0, z: 0 },
        target: { x: 0, y: 0, z: 0 },
        zoom: 1,
      })
      assert.ok(warnings.length > 0)
      assert.ok(warnings[0].includes('Near'))
    })

    it('warns for non-positive zoom', () => {
      const warnings = validateCameraConfig({
        projection: 'perspective',
        fov: 60,
        near: 0.1,
        far: 1000,
        position: { x: 0, y: 0, z: 0 },
        target: { x: 0, y: 0, z: 0 },
        zoom: -1,
      })
      assert.ok(warnings.length > 0)
      assert.ok(warnings[0].includes('Zoom'))
    })
  })
})

// ─── Lighting Config Tests ────────────────────────────────────────────────

describe('lighting', () => {
  describe('resolveLightingConfig', () => {
    it('returns defaults when no options', () => {
      const config = resolveLightingConfig(undefined)
      assert.equal(config.ambient.color, '#ffffff')
      assert.equal(config.ambient.intensity, 0.4)
      assert.equal(config.directional.intensity, 0.8)
    })

    it('overrides from options', () => {
      const config = resolveLightingConfig({
        lighting: {
          ambient: { color: '#888888', intensity: 0.6 },
          directional: { intensity: 1.0 },
        },
      })
      assert.equal(config.ambient.color, '#888888')
      assert.equal(config.ambient.intensity, 0.6)
      assert.equal(config.directional.intensity, 1.0)
    })

    it('overrides directional position', () => {
      const config = resolveLightingConfig({
        lighting: {
          directional: { position: { x: 1, y: 2, z: 3 } },
        },
      })
      assert.deepEqual(config.directional.position, { x: 1, y: 2, z: 3 })
    })
  })

  describe('validateLightingConfig', () => {
    it('returns no warnings for valid config', () => {
      const config = resolveLightingConfig(undefined)
      assert.deepEqual(validateLightingConfig(config), [])
    })

    it('warns for extreme ambient intensity', () => {
      const warnings = validateLightingConfig({
        ambient: { color: '#ffffff', intensity: 5 },
        directional: { color: '#ffffff', intensity: 0.8, position: { x: 0, y: 1, z: 0 } },
      })
      assert.ok(warnings.length > 0)
    })

    it('warns for extreme directional intensity', () => {
      const warnings = validateLightingConfig({
        ambient: { color: '#ffffff', intensity: 0.4 },
        directional: { color: '#ffffff', intensity: -1, position: { x: 0, y: 1, z: 0 } },
      })
      assert.ok(warnings.length > 0)
    })
  })
})

// ─── Transforms Tests ─────────────────────────────────────────────────────

describe('transforms', () => {
  describe('resolvePosition', () => {
    it('defaults to origin', () => {
      assert.deepEqual(resolvePosition({}), { x: 0, y: 0, z: 0 })
    })

    it('reads x/y/z properties', () => {
      const props: PropertyBag = { x: 10, y: 20, z: 30 }
      assert.deepEqual(resolvePosition(props), { x: 10, y: 20, z: 30 })
    })

    it('reads position Vec3', () => {
      const props: PropertyBag = { position: { x: 5, y: 6, z: 7 } }
      assert.deepEqual(resolvePosition(props), { x: 5, y: 6, z: 7 })
    })

    it('reads position Vec2 (z defaults to 0)', () => {
      const props: PropertyBag = { position: { x: 3, y: 4 } }
      assert.deepEqual(resolvePosition(props), { x: 3, y: 4, z: 0 })
    })
  })

  describe('resolveRotation', () => {
    it('defaults to zero', () => {
      assert.deepEqual(resolveRotation({}), { x: 0, y: 0, z: 0 })
    })

    it('reads individual rotation axes', () => {
      const props: PropertyBag = { rotationX: 1, rotationY: 2, rotationZ: 3 }
      assert.deepEqual(resolveRotation(props), { x: 1, y: 2, z: 3 })
    })

    it('single rotation becomes Y-axis rotation', () => {
      const props: PropertyBag = { rotation: 45 }
      assert.deepEqual(resolveRotation(props), { x: 0, y: 45, z: 0 })
    })
  })

  describe('resolveScale', () => {
    it('defaults to 1,1,1', () => {
      assert.deepEqual(resolveScale({}), { x: 1, y: 1, z: 1 })
    })

    it('reads uniform scale', () => {
      const props: PropertyBag = { scale: 2 }
      assert.deepEqual(resolveScale(props), { x: 2, y: 2, z: 2 })
    })

    it('reads individual scale axes', () => {
      const props: PropertyBag = { scaleX: 2, scaleY: 3, scaleZ: 4 }
      assert.deepEqual(resolveScale(props), { x: 2, y: 3, z: 4 })
    })

    it('reads scale Vec3', () => {
      const props: PropertyBag = { scale: { x: 1, y: 2, z: 3 } }
      assert.deepEqual(resolveScale(props), { x: 1, y: 2, z: 3 })
    })
  })

  describe('resolveVisible', () => {
    it('defaults to true', () => {
      assert.equal(resolveVisible({}), true)
    })

    it('reads visible false', () => {
      assert.equal(resolveVisible({ visible: false }), false)
    })

    it('reads visible true', () => {
      assert.equal(resolveVisible({ visible: true }), true)
    })
  })
})

// ─── Groups Tests ─────────────────────────────────────────────────────────

describe('groups', () => {
  describe('isRootEntity', () => {
    it('returns true when no containment relationships', () => {
      assert.equal(isRootEntity('e1', []), true)
    })

    it('returns false when entity is child', () => {
      const rels: Relationship[] = [
        { type: 'containment', from: 'parent', to: 'child' },
      ]
      assert.equal(isRootEntity('child', rels), false)
    })

    it('returns true when entity is parent', () => {
      const rels: Relationship[] = [
        { type: 'containment', from: 'parent', to: 'child' },
      ]
      assert.equal(isRootEntity('parent', rels), true)
    })

    it('ignores non-containment relationships', () => {
      const rels: Relationship[] = [
        { type: 'edge', from: 'a', to: 'b' },
      ]
      assert.equal(isRootEntity('b', rels), true)
    })
  })

  describe('findChildren', () => {
    it('returns empty for no containment', () => {
      assert.deepEqual(findChildren('p', []), [])
    })

    it('returns children', () => {
      const rels: Relationship[] = [
        { type: 'containment', from: 'p', to: 'c1' },
        { type: 'containment', from: 'p', to: 'c2' },
        { type: 'edge', from: 'p', to: 'x' },
      ]
      assert.deepEqual(findChildren('p', rels), ['c1', 'c2'])
    })
  })

  describe('buildContainmentTree', () => {
    it('builds flat tree', () => {
      const entities: Entity[] = [
        { id: 'a', type: 'shape', properties: {} },
        { id: 'b', type: 'shape', properties: {} },
      ]
      const tree = buildContainmentTree(entities, [])
      assert.equal(tree.length, 2)
      assert.equal(tree[0]!.entityId, 'a')
      assert.equal(tree[0]!.children.length, 0)
    })

    it('builds nested tree', () => {
      const entities: Entity[] = [
        { id: 'root', type: 'group', properties: {} },
        { id: 'child1', type: 'shape', properties: {} },
        { id: 'child2', type: 'shape', properties: {} },
      ]
      const rels: Relationship[] = [
        { type: 'containment', from: 'root', to: 'child1' },
        { type: 'containment', from: 'root', to: 'child2' },
      ]
      const tree = buildContainmentTree(entities, rels)
      assert.equal(tree.length, 1)
      assert.equal(tree[0]!.entityId, 'root')
      assert.equal(tree[0]!.children.length, 2)
    })
  })
})

// ─── Renderer Capabilities Tests ──────────────────────────────────────────

describe('renderer capabilities', () => {
  it('exports correct entity types', async () => {
    const { ThreeRenderer } = await import('./renderer.js')
    const renderer = new ThreeRenderer()
    assert.deepEqual(renderer.capabilities.entityTypes, ['shape', 'text', 'group', 'data'])
  })

  it('exports correct relationship types', async () => {
    const { ThreeRenderer } = await import('./renderer.js')
    const renderer = new ThreeRenderer()
    assert.deepEqual(renderer.capabilities.relationshipTypes, ['edge', 'containment', 'constraint', 'reference'])
  })

  it('exports correct features', async () => {
    const { ThreeRenderer } = await import('./renderer.js')
    const renderer = new ThreeRenderer()
    assert.ok(renderer.capabilities.features.includes('3d'))
    assert.ok(renderer.capabilities.features.includes('animations'))
    assert.ok(renderer.capabilities.features.includes('interactions'))
    assert.ok(renderer.capabilities.features.includes('procedural'))
  })

  it('has correct renderer info', async () => {
    const { ThreeRenderer } = await import('./renderer.js')
    const renderer = new ThreeRenderer()
    assert.equal(renderer.info.id, 'three-3d')
    assert.equal(renderer.info.name, 'Three.js 3D Renderer')
  })

  it('canRender returns true for compatible requirements', async () => {
    const { ThreeRenderer } = await import('./renderer.js')
    const renderer = new ThreeRenderer()
    const scene: Scene = {
      meta: { version: '1.0' },
      entities: [{ id: 'e1', type: 'shape', properties: {} }],
    }
    assert.equal(renderer.canRender(scene), true)
  })

  it('canRender returns false for incompatible requirements', async () => {
    const { ThreeRenderer } = await import('./renderer.js')
    const renderer = new ThreeRenderer()
    const scene: Scene = {
      meta: { version: '1.0' },
      entities: [{ id: 'e1', type: 'shape', properties: {} }],
    }
    assert.equal(renderer.canRender(scene, {
      entityTypes: ['shape'],
      relationshipTypes: [],
      features: ['2d'],
    }), false)
  })
})

// ─── Camera Extended IR Tests ─────────────────────────────────────────────

describe('camera IR extension', () => {
  it('Camera interface accepts projection field', () => {
    const camera = {
      position: { x: 1, y: 2, z: 3 },
      projection: 'perspective' as const,
      fov: 90,
      near: 0.5,
      far: 500,
    }
    assert.equal(camera.projection, 'perspective')
    assert.equal(camera.fov, 90)
  })

  it('Camera works without new fields (backward compatible)', () => {
    const camera: import('../../ir/types.js').Camera = {
      position: { x: 1, y: 2 },
      zoom: 2,
    }
    assert.equal(camera.projection, undefined)
    assert.equal(camera.fov, undefined)
  })
})

// ─── Output Module Tests ──────────────────────────────────────────────────

describe('output', () => {
  it('buildThreeOutput returns output object shape', async () => {
    const { buildThreeOutput } = await import('./output.js')
    const fakeScene = { add: () => {} } as unknown as import('three').Scene
    const fakeCamera = {} as unknown as import('three').Camera
    const fakeRenderer = {
      dispose: () => {},
      getContext: () => ({
        getExtension: () => null,
      }),
    } as unknown as import('three').WebGLRenderer
    const fakeCanvas = {} as HTMLCanvasElement

    const output = buildThreeOutput(
      fakeScene,
      fakeCamera,
      fakeRenderer,
      fakeCanvas,
      { e1: { object: {} as unknown as import('three').Object3D, entityType: 'shape' } },
      ['warn1'],
    )

    assert.equal(output.scene, fakeScene)
    assert.equal(output.camera, fakeCamera)
    assert.equal(output.canvas, fakeCanvas)
    assert.equal(output.entityMap['e1'].entityType, 'shape')
    assert.deepEqual(output.warnings, ['warn1'])
    assert.equal(typeof output.dispose, 'function')
  })
})

// ─── Animation Module Tests ───────────────────────────────────────────────

describe('animations', () => {
  it('exports createSceneAnimations function', async () => {
    const mod = await import('./animations.js')
    assert.equal(typeof mod.createSceneAnimations, 'function')
    assert.equal(typeof mod.createKeyframeTracks, 'function')
  })
})

// ─── Interactions Module Tests ────────────────────────────────────────────

describe('interactions', () => {
  it('exports performRaycast function', async () => {
    const mod = await import('./interactions.js')
    assert.equal(typeof mod.performRaycast, 'function')
  })

  it('exports setupUserData function', async () => {
    const mod = await import('./interactions.js')
    assert.equal(typeof mod.setupUserData, 'function')
  })
})

// ─── Data Module Tests ────────────────────────────────────────────────────

describe('data module', () => {
  it('exports data rendering functions', async () => {
    const mod = await import('./data.js')
    assert.equal(typeof mod.createPolylineGeometry, 'function')
    assert.equal(typeof mod.createPolylineMaterial, 'function')
    assert.equal(typeof mod.createPointCloudGeometry, 'function')
    assert.equal(typeof mod.createPointCloudMaterial, 'function')
  })
})

// ─── Connections Module Tests ─────────────────────────────────────────────

describe('connections module', () => {
  it('exports createEdgeLine function', async () => {
    const mod = await import('./connections.js')
    assert.equal(typeof mod.createEdgeLine, 'function')
  })
})

// ─── Fallback Module Tests ────────────────────────────────────────────────

describe('fallback module', () => {
  it('exports createFallbackObject function', async () => {
    const mod = await import('./fallback.js')
    assert.equal(typeof mod.createFallbackObject, 'function')
  })
})

// ─── Scene Module Tests ───────────────────────────────────────────────────

describe('scene module', () => {
  it('exports buildThreeScene function', async () => {
    const mod = await import('./scene.js')
    assert.equal(typeof mod.buildThreeScene, 'function')
    assert.equal(typeof mod.setThreeModule, 'function')
  })
})

// ─── Adapter Module Tests ─────────────────────────────────────────────────

describe('adapter module', () => {
  it('exports adapter functions', async () => {
    const mod = await import('./adapter.js')
    assert.equal(typeof mod.mountThree, 'function')
    assert.equal(typeof mod.unmountThree, 'function')
    assert.equal(typeof mod.getThreeCanvas, 'function')
    assert.equal(typeof mod.ThreeAdapter, 'function')
  })
})

// ─── Shape Module Tests ───────────────────────────────────────────────────

describe('shapes', () => {
  it('exports shape functions', async () => {
    const mod = await import('./shapes.js')
    assert.equal(typeof mod.detectShapeType, 'function')
    assert.equal(typeof mod.createGeometry, 'function')
    assert.equal(typeof mod.setThreeModule, 'function')
  })

  it('detectShapeType returns box by default', async () => {
    const { detectShapeType } = await import('./shapes.js')
    assert.equal(detectShapeType({}), 'box')
  })

  it('detectShapeType detects sphere', async () => {
    const { detectShapeType } = await import('./shapes.js')
    assert.equal(detectShapeType({ shape: 'sphere' }), 'sphere')
  })

  it('detectShapeType detects cylinder', async () => {
    const { detectShapeType } = await import('./shapes.js')
    assert.equal(detectShapeType({ shape: 'cylinder' }), 'cylinder')
  })

  it('detectShapeType detects cone', async () => {
    const { detectShapeType } = await import('./shapes.js')
    assert.equal(detectShapeType({ shape: 'cone' }), 'cone')
  })

  it('detectShapeType detects plane', async () => {
    const { detectShapeType } = await import('./shapes.js')
    assert.equal(detectShapeType({ shape: 'plane' }), 'plane')
  })

  it('detectShapeType detects torus', async () => {
    const { detectShapeType } = await import('./shapes.js')
    assert.equal(detectShapeType({ shape: 'torus' }), 'torus')
  })

  it('detectShapeType detects circle', async () => {
    const { detectShapeType } = await import('./shapes.js')
    assert.equal(detectShapeType({ shape: 'circle' }), 'circle')
  })

  it('detectShapeType detects ring', async () => {
    const { detectShapeType } = await import('./shapes.js')
    assert.equal(detectShapeType({ shape: 'ring' }), 'ring')
  })

  it('detectShapeType detects dodecahedron', async () => {
    const { detectShapeType } = await import('./shapes.js')
    assert.equal(detectShapeType({ shape: 'dodecahedron' }), 'dodecahedron')
  })

  it('detectShapeType detects icosahedron', async () => {
    const { detectShapeType } = await import('./shapes.js')
    assert.equal(detectShapeType({ shape: 'icosahedron' }), 'icosahedron')
  })

  it('detectShapeType detects octahedron', async () => {
    const { detectShapeType } = await import('./shapes.js')
    assert.equal(detectShapeType({ shape: 'octahedron' }), 'octahedron')
  })

  it('detectShapeType detects tetrahedron', async () => {
    const { detectShapeType } = await import('./shapes.js')
    assert.equal(detectShapeType({ shape: 'tetrahedron' }), 'tetrahedron')
  })

  it('detectShapeType falls back to box for unknown', async () => {
    const { detectShapeType } = await import('./shapes.js')
    assert.equal(detectShapeType({ shape: 'star' }), 'box')
  })
})
