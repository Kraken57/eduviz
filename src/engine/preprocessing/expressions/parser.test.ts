import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { evaluateExpression, seededRandom } from './parser.js'

describe('Expression Evaluator', () => {
  describe('arithmetic', () => {
    it('evaluates addition', () => {
      assert.equal(evaluateExpression('2 + 3', {}), 5)
    })

    it('evaluates subtraction', () => {
      assert.equal(evaluateExpression('10 - 4', {}), 6)
    })

    it('evaluates multiplication', () => {
      assert.equal(evaluateExpression('6 * 7', {}), 42)
    })

    it('evaluates division', () => {
      assert.equal(evaluateExpression('15 / 3', {}), 5)
    })

    it('evaluates modulo', () => {
      assert.equal(evaluateExpression('17 % 5', {}), 2)
    })

    it('evaluates power', () => {
      assert.equal(evaluateExpression('2 ** 10', {}), 1024)
    })

    it('evaluates complex expression', () => {
      assert.equal(evaluateExpression('2 + 3 * 4', {}), 14)
    })

    it('evaluates parentheses', () => {
      assert.equal(evaluateExpression('(2 + 3) * 4', {}), 20)
    })

    it('evaluates nested parentheses', () => {
      assert.equal(evaluateExpression('((2 + 3) * (4 - 1))', {}), 15)
    })
  })

  describe('comparison', () => {
    it('evaluates less than', () => {
      assert.equal(evaluateExpression('3 < 5', {}), 1)
    })

    it('evaluates greater than', () => {
      assert.equal(evaluateExpression('7 > 3', {}), 1)
    })

    it('evaluates less or equal', () => {
      assert.equal(evaluateExpression('5 <= 5', {}), 1)
    })

    it('evaluates greater or equal', () => {
      assert.equal(evaluateExpression('6 >= 5', {}), 1)
    })

    it('evaluates equality', () => {
      assert.equal(evaluateExpression('5 == 5', {}), 1)
    })

    it('evaluates inequality', () => {
      assert.equal(evaluateExpression('5 != 3', {}), 1)
    })
  })

  describe('string literals', () => {
    it('evaluates a double-quoted string', () => {
      assert.equal(evaluateExpression('"hello"', {}), 'hello')
    })

    it('evaluates a single-quoted string', () => {
      assert.equal(evaluateExpression(`'world'`, {}), 'world')
    })

    it('evaluates string equality', () => {
      assert.equal(evaluateExpression('"red" == "red"', {}), 1)
    })

    it('evaluates string inequality', () => {
      assert.equal(evaluateExpression('"red" != "blue"', {}), 1)
    })

    it('uses strings in conditional expression', () => {
      assert.equal(evaluateExpression('3 > 2 ? "#3498DB" : "#E74C3C"', {}), '#3498DB')
    })
  })

  describe('logic', () => {
    it('evaluates logical AND', () => {
      assert.equal(evaluateExpression('true && true', {}), 1)
    })

    it('evaluates logical OR', () => {
      assert.equal(evaluateExpression('false || true', {}), 1)
    })

    it('evaluates logical NOT', () => {
      assert.equal(evaluateExpression('!false', {}), 1)
    })
  })

  describe('math functions', () => {
    it('evaluates sin', () => {
      assert.ok(Math.abs((evaluateExpression('sin(0)', {}) as number) - 0) < 0.0001)
    })

    it('evaluates cos', () => {
      assert.ok(Math.abs((evaluateExpression('cos(0)', {}) as number) - 1) < 0.0001)
    })

    it('evaluates sqrt', () => {
      assert.equal(evaluateExpression('sqrt(9)', {}), 3)
    })

    it('evaluates abs', () => {
      assert.equal(evaluateExpression('abs(-5)', {}), 5)
    })

    it('evaluates min', () => {
      assert.equal(evaluateExpression('min(3, 7)', {}), 3)
    })

    it('evaluates max', () => {
      assert.equal(evaluateExpression('max(3, 7)', {}), 7)
    })

    it('evaluates floor', () => {
      assert.equal(evaluateExpression('floor(3.7)', {}), 3)
    })

    it('evaluates ceil', () => {
      assert.equal(evaluateExpression('ceil(3.2)', {}), 4)
    })

    it('evaluates round', () => {
      assert.equal(evaluateExpression('round(3.5)', {}), 4)
    })
  })

  describe('constants', () => {
    it('evaluates pi', () => {
      assert.ok(Math.abs((evaluateExpression('pi', {}) as number) - Math.PI) < 0.0001)
    })

    it('evaluates e', () => {
      assert.ok(Math.abs((evaluateExpression('e', {}) as number) - Math.E) < 0.0001)
    })
  })

  describe('variables', () => {
    it('evaluates variable reference', () => {
      assert.equal(evaluateExpression('x', { x: 42 }), 42)
    })

    it('evaluates variable in expression', () => {
      assert.equal(evaluateExpression('x * 2 + 1', { x: 5 }), 11)
    })

    it('evaluates multiple variables', () => {
      assert.equal(evaluateExpression('x + y', { x: 3, y: 4 }), 7)
    })
  })

  describe('seeded random', () => {
    it('returns deterministic values', () => {
      const a = seededRandom('test', 0, 42)
      const b = seededRandom('test', 0, 42)
      assert.equal(a, b)
    })

    it('returns different values for different indices', () => {
      const a = seededRandom('test', 0, 42)
      const b = seededRandom('test', 1, 42)
      assert.notEqual(a, b)
    })

    it('returns different values for different seeds', () => {
      const a = seededRandom('test', 0, 42)
      const b = seededRandom('test', 0, 99)
      assert.notEqual(a, b)
    })

    it('returns values in [0, 1]', () => {
      for (let i = 0; i < 100; i++) {
        const v = seededRandom('test', i, 42)
        assert.ok(v >= 0 && v <= 1, `Value ${v} out of range`)
      }
    })
  })

  describe('edge cases', () => {
    it('evaluates nested function calls', () => {
      assert.equal(evaluateExpression('sqrt(abs(-9))', {}), 3)
    })

    it('evaluates unary minus', () => {
      assert.equal(evaluateExpression('-5', {}), -5)
    })

    it('evaluates negative in expression', () => {
      assert.equal(evaluateExpression('3 + (-2)', {}), 1)
    })
  })
})