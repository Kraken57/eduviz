import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { detectDimension, getDimensionFeature } from './detectDimension.js'
import type { Scene } from '../../ir/types.js'

// ─── Test Fixtures ──────────────────────────────────────────────────────────

const scene2D: Scene = {
  meta: { version: '1.0', title: '2D Scene' },
  entities: [
    { id: 'circle', type: 'shape', properties: { shape: 'circle', x: 100, y: 100, radius: 50, fill: 'blue' } },
  ],
  viewport: { width: 400, height: 400 },
}

const scene3DByCamera: Scene = {
  meta: { version: '1.0', title: '3D by Camera' },
  entities: [
    { id: 'box', type: 'shape', properties: { shape: 'box', x: 0, y: 0, z: 0, width: 1, height: 1, depth: 1 } },
  ],
  viewport: { width: 800, height: 600, camera: { projection: 'perspective', fov: 60 } },
}

const scene3DByMeta: Scene = {
  meta: { version: '1.0', title: '3D by Meta', dimension: '3d' } as Scene['meta'] & { dimension: string },
  entities: [
    { id: 'sphere', type: 'shape', properties: { shape: 'sphere', x: 0, y: 0, radius: 1 } },
  ],
  viewport: { width: 800, height: 600 },
}

const scene3DByZ: Scene = {
  meta: { version: '1.0', title: '3D by Z' },
  entities: [
    { id: 'cube', type: 'shape', properties: { shape: 'box', x: 0, y: 0, z: 5, width: 1, height: 1, depth: 1 } },
  ],
  viewport: { width: 800, height: 600 },
}

const scene2DNoViewport: Scene = {
  meta: { version: '1.0', title: 'No Viewport' },
  entities: [
    { id: 'label', type: 'text', properties: { text: 'Hello', x: 50, y: 50 } },
  ],
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('detectDimension', () => {
  it('detects 2D scene', () => {
    assert.equal(detectDimension(scene2D), '2d')
  })

  it('detects 3D from perspective camera', () => {
    assert.equal(detectDimension(scene3DByCamera), '3d')
  })

  it('detects 3D from metadata hint', () => {
    assert.equal(detectDimension(scene3DByMeta), '3d')
  })

  it('detects 3D from z-coordinate', () => {
    assert.equal(detectDimension(scene3DByZ), '3d')
  })

  it('defaults to 2D when no viewport', () => {
    assert.equal(detectDimension(scene2DNoViewport), '2d')
  })

  it('returns 2D for orthographic camera', () => {
    const scene: Scene = {
      ...scene2D,
      viewport: { width: 400, height: 400, camera: { projection: 'orthographic' } },
    }
    assert.equal(detectDimension(scene), '2d')
  })
})

describe('getDimensionFeature', () => {
  it('returns "2d" for 2D scenes', () => {
    assert.equal(getDimensionFeature(scene2D), '2d')
  })

  it('returns "3d" for 3D scenes', () => {
    assert.equal(getDimensionFeature(scene3DByCamera), '3d')
  })
})
