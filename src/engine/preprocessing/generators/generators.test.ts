import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { expandGenerator, DEFAULT_LIMITS } from './expander.js'
import type { RepeatGeneratorDef, ParametricGeneratorDef, GridGeneratorDef, SeriesGeneratorDef, ScatterGeneratorDef } from '../../../ir/types.js'

describe('Generator Expansion', () => {
  describe('repeat generator', () => {
    it('generates correct number of entities', () => {
      const gen: RepeatGeneratorDef = {
        type: 'repeat',
        count: 5,
        template: {
          shape: { value: 'circle' },
          radius: { value: 3 },
        },
      }
      const result = expandGenerator('particles', gen)
      assert.equal(result.entities.length, 5)
      assert.equal(result.errors.length, 0)
    })

    it('resolves index variable', () => {
      const gen: RepeatGeneratorDef = {
        type: 'repeat',
        count: 3,
        template: {
          x: { expr: 'i * 10' },
        },
      }
      const result = expandGenerator('items', gen)
      assert.equal(result.entities[0].properties.x, 0)
      assert.equal(result.entities[1].properties.x, 10)
      assert.equal(result.entities[2].properties.x, 20)
    })

    it('generates unique IDs', () => {
      const gen: RepeatGeneratorDef = {
        type: 'repeat',
        count: 3,
        template: { shape: { value: 'circle' } },
      }
      const result = expandGenerator('test', gen)
      assert.equal(result.entities[0].id, 'gen_test_0')
      assert.equal(result.entities[1].id, 'gen_test_1')
      assert.equal(result.entities[2].id, 'gen_test_2')
    })

    it('clamps count to max', () => {
      const gen: RepeatGeneratorDef = {
        type: 'repeat',
        count: 100000,
        template: { shape: { value: 'circle' } },
      }
      const result = expandGenerator('test', gen, { ...DEFAULT_LIMITS, maxCount: 10 })
      assert.equal(result.entities.length, 10)
    })
  })

  describe('parametric generator', () => {
    it('generates polyline output', () => {
      const gen: ParametricGeneratorDef = {
        type: 'parametric',
        xExpr: 't * 100',
        yExpr: 'sin(t) * 50',
        tMin: 0,
        tMax: 6.28,
        samples: 10,
        outputStyle: 'polyline',
        template: {
          stroke: { value: '#E74C3C' },
        },
      }
      const result = expandGenerator('sine', gen)
      assert.equal(result.entities.length, 1)
      assert.equal(result.entities[0].type, 'data')
      const renderData = result.entities[0].properties.renderData as unknown as { value: { kind: string; points: Array<{x: number; y: number}> } }
      assert.equal(renderData.value.kind, 'polyline')
      assert.equal(renderData.value.points.length, 10)
    })

    it('generates points output', () => {
      const gen: ParametricGeneratorDef = {
        type: 'parametric',
        xExpr: 't * 100',
        yExpr: 'cos(t) * 50',
        tMin: 0,
        tMax: 6.28,
        samples: 5,
        outputStyle: 'points',
        template: {
          shape: { value: 'circle' },
          radius: { value: 2 },
        },
      }
      const result = expandGenerator('cosine', gen)
      assert.equal(result.entities.length, 5)
      assert.equal(result.entities[0].type, 'shape')
    })

    it('evaluates sine function', () => {
      const gen: ParametricGeneratorDef = {
        type: 'parametric',
        xExpr: 't',
        yExpr: 'sin(t)',
        tMin: 0,
        tMax: 0,
        samples: 2,
        template: {},
      }
      const result = expandGenerator('test', gen)
      assert.ok(Math.abs(result.entities.length - 1) <= 1)
    })
  })

  describe('grid generator', () => {
    it('generates correct number of entities', () => {
      const gen: GridGeneratorDef = {
        type: 'grid',
        rows: 3,
        cols: 4,
        cellWidth: 40,
        cellHeight: 40,
        template: {
          shape: { value: 'rect' },
          width: { value: 38 },
          height: { value: 38 },
        },
      }
      const result = expandGenerator('grid', gen)
      assert.equal(result.entities.length, 12)
    })

    it('resolves row and col variables', () => {
      const gen: GridGeneratorDef = {
        type: 'grid',
        rows: 2,
        cols: 2,
        cellWidth: 40,
        cellHeight: 40,
        template: {
          x: { expr: 'col * 40' },
          y: { expr: 'row * 40' },
        },
      }
      const result = expandGenerator('grid', gen)
      assert.equal(result.entities[0].properties.x, 0)
      assert.equal(result.entities[0].properties.y, 0)
      assert.equal(result.entities[1].properties.x, 40)
      assert.equal(result.entities[1].properties.y, 0)
      assert.equal(result.entities[2].properties.x, 0)
      assert.equal(result.entities[2].properties.y, 40)
      assert.equal(result.entities[3].properties.x, 40)
      assert.equal(result.entities[3].properties.y, 40)
    })
  })

  describe('series generator', () => {
    it('generates polyline output', () => {
      const gen: SeriesGeneratorDef = {
        type: 'series',
        data: [10, 20, 30, 40],
        xExpr: 'i * 80',
        yExpr: '400 - value * 10',
        outputStyle: 'polyline',
        template: {
          stroke: { value: '#3498DB' },
        },
      }
      const result = expandGenerator('chart', gen)
      assert.equal(result.entities.length, 1)
      const renderData = result.entities[0].properties.renderData as unknown as { value: { kind: string; points: Array<{x: number; y: number}> } }
      assert.equal(renderData.value.points.length, 4)
    })

    it('generates points output', () => {
      const gen: SeriesGeneratorDef = {
        type: 'series',
        data: [10, 20, 30],
        xExpr: 'i * 100',
        yExpr: 'value * 5',
        outputStyle: 'points',
        template: {
          shape: { value: 'circle' },
          radius: { value: 5 },
        },
      }
      const result = expandGenerator('scatter', gen)
      assert.equal(result.entities.length, 3)
    })

    it('resolves value variable', () => {
      const gen: SeriesGeneratorDef = {
        type: 'series',
        data: [10, 20, 30],
        xExpr: 'i',
        yExpr: 'value',
        outputStyle: 'points',
        template: {},
      }
      const result = expandGenerator('test', gen)
      const y0 = result.entities[0].properties.y as { value: number }
      const y1 = result.entities[1].properties.y as { value: number }
      const y2 = result.entities[2].properties.y as { value: number }
      assert.equal(y0.value, 10)
      assert.equal(y1.value, 20)
      assert.equal(y2.value, 30)
    })
  })

  describe('scatter generator', () => {
    it('generates correct number of entities', () => {
      const gen: ScatterGeneratorDef = {
        type: 'scatter',
        points: [
          { x: 10, y: 20 },
          { x: 30, y: 40 },
          { x: 50, y: 60 },
        ],
        template: {
          shape: { value: 'circle' },
          radius: { value: 5 },
        },
      }
      const result = expandGenerator('scatter', gen)
      assert.equal(result.entities.length, 3)
    })

    it('resolves template variables from scatter coordinates', () => {
      const gen: ScatterGeneratorDef = {
        type: 'scatter',
        points: [
          { x: 10, y: 20 },
          { x: 30, y: 40 },
        ],
        template: {
          radius: { value: { expr: 'i * 2 + 1' } },
          stroke: { value: '#E74C3C' },
        },
      }
      const result = expandGenerator('test', gen)
      const r0 = result.entities[0].properties.radius as { value: number }
      const r1 = result.entities[1].properties.radius as { value: number }
      assert.equal(r0.value, 1)
      assert.equal(r1.value, 3)
      const x0 = result.entities[0].properties.x as { value: number }
      const y0 = result.entities[0].properties.y as { value: number }
      const x1 = result.entities[1].properties.x as { value: number }
      const y1 = result.entities[1].properties.y as { value: number }
      assert.equal(x0.value, 10)
      assert.equal(y0.value, 20)
      assert.equal(x1.value, 30)
      assert.equal(y1.value, 40)
    })
  })
})