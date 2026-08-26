import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { renderData } from './data.js'
import type { Entity, PolylineRenderData, PointCloudRenderData } from '../../ir/types.js'
import type { SvgRenderContext } from './types.js'

function createCtx(): SvgRenderContext {
  return {
    viewport: { width: 800, height: 600, background: '#FFFFFF' },
    entityMap: {},
    animations: [],
    warnings: [],
  }
}

describe('Data Renderer', () => {
  describe('polyline', () => {
    it('renders a polyline with points', () => {
      const polyData: PolylineRenderData = {
        kind: 'polyline',
        points: [
          { x: 0, y: 0 },
          { x: 100, y: 50 },
          { x: 200, y: 0 },
        ],
        closed: false,
      }
      const entity: Entity = {
        id: 'line1',
        type: 'data',
        properties: {
          stroke: { value: '#E74C3C' },
          strokeWidth: { value: 2 },
          renderData: { value: polyData as unknown as Record<string, never> },
        },
      }
      const ctx = createCtx()
      const svg = renderData(entity, ctx)
      assert.ok(svg.includes('polyline'))
      assert.ok(svg.includes('M 0 0'))
      assert.ok(svg.includes('L 100 50'))
      assert.ok(svg.includes('L 200 0'))
      assert.ok(!svg.includes('Z'))
      assert.equal(ctx.entityMap['line1']?.entityType, 'data')
    })

    it('renders a closed polyline', () => {
      const polyData: PolylineRenderData = {
        kind: 'polyline',
        points: [
          { x: 0, y: 0 },
          { x: 100, y: 0 },
          { x: 100, y: 100 },
        ],
        closed: true,
      }
      const entity: Entity = {
        id: 'poly1',
        type: 'data',
        properties: {
          renderData: { value: polyData as unknown as Record<string, never> },
        },
      }
      const ctx = createCtx()
      const svg = renderData(entity, ctx)
      assert.ok(svg.includes('Z'))
    })

    it('returns empty for invisible polyline', () => {
      const polyData: PolylineRenderData = {
        kind: 'polyline',
        points: [{ x: 0, y: 0 }],
        closed: false,
      }
      const entity: Entity = {
        id: 'hidden',
        type: 'data',
        properties: {
          visible: { value: false },
          renderData: { value: polyData as unknown as Record<string, never> },
        },
      }
      const ctx = createCtx()
      const svg = renderData(entity, ctx)
      assert.equal(svg, '')
    })
  })

  describe('pointcloud', () => {
    it('renders a pointcloud', () => {
      const cloudData: PointCloudRenderData = {
        kind: 'pointcloud',
        points: [
          { x: 10, y: 20 },
          { x: 30, y: 40, radius: 6 },
          { x: 50, y: 60, fill: '#E74C3C' },
        ],
      }
      const entity: Entity = {
        id: 'cloud1',
        type: 'data',
        properties: {
          renderData: { value: cloudData as unknown as Record<string, never> },
        },
      }
      const ctx = createCtx()
      const svg = renderData(entity, ctx)
      assert.ok(svg.includes('cloud1'))
      assert.ok(svg.includes('circle'))
      assert.ok(svg.includes('cx="10"'))
      assert.ok(svg.includes('cy="20"'))
      assert.ok(svg.includes('cx="30"'))
      assert.ok(svg.includes('cx="50"'))
      assert.equal(ctx.entityMap['cloud1']?.entityType, 'data')
    })

    it('returns empty for invisible pointcloud', () => {
      const cloudData: PointCloudRenderData = {
        kind: 'pointcloud',
        points: [{ x: 10, y: 20 }],
      }
      const entity: Entity = {
        id: 'hidden',
        type: 'data',
        properties: {
          visible: { value: false },
          renderData: { value: cloudData as unknown as Record<string, never> },
        },
      }
      const ctx = createCtx()
      const svg = renderData(entity, ctx)
      assert.equal(svg, '')
    })
  })

  describe('fallback', () => {
    it('warns on missing renderData', () => {
      const entity: Entity = {
        id: 'empty',
        type: 'data',
        properties: {},
      }
      const ctx = createCtx()
      const svg = renderData(entity, ctx)
      assert.equal(svg, '')
      assert.ok(ctx.warnings.length > 0)
    })
  })
})