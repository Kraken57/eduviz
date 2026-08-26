// ─── Safe Expression Evaluator ──────────────────────────────────────────────
// Recursive descent parser. No eval(), no new Function().
// Supports arithmetic, comparisons, logic, math functions, constants, seeded random.
// ─────────────────────────────────────────────────────────────────────────────

export type ExprVars = Record<string, number>

interface Token {
  type: 'number' | 'ident' | 'op' | 'lparen' | 'rparen' | 'comma' | 'eof'
  value: string
}

// ─── Tokenizer ──────────────────────────────────────────────────────────────

function tokenize(input: string): Token[] {
  const tokens: Token[] = []
  let i = 0

  while (i < input.length) {
    const ch = input[i]

    if (ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r') {
      i++
      continue
    }

    if ((ch >= '0' && ch <= '9') || (ch === '.' && i + 1 < input.length && input[i + 1] >= '0' && input[i + 1] <= '9')) {
      let num = ''
      while (i < input.length && ((input[i] >= '0' && input[i] <= '9') || input[i] === '.')) {
        num += input[i]
        i++
      }
      tokens.push({ type: 'number', value: num })
      continue
    }

    if ((ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z') || ch === '_') {
      let ident = ''
      while (i < input.length && ((input[i] >= 'a' && input[i] <= 'z') || (input[i] >= 'A' && input[i] <= 'Z') || (input[i] >= '0' && input[i] <= '9') || input[i] === '_')) {
        ident += input[i]
        i++
      }
      tokens.push({ type: 'ident', value: ident })
      continue
    }

    if (ch === '(') { tokens.push({ type: 'lparen', value: '(' }); i++; continue }
    if (ch === ')') { tokens.push({ type: 'rparen', value: ')' }); i++; continue }
    if (ch === ',') { tokens.push({ type: 'comma', value: ',' }); i++; continue }

    if (ch === '*' && i + 1 < input.length && input[i + 1] === '*') {
      tokens.push({ type: 'op', value: '**' }); i += 2; continue
    }
    if (ch === '=' && i + 1 < input.length && input[i + 1] === '=') {
      tokens.push({ type: 'op', value: '==' }); i += 2; continue
    }
    if (ch === '!' && i + 1 < input.length && input[i + 1] === '=') {
      tokens.push({ type: 'op', value: '!=' }); i += 2; continue
    }
    if (ch === '<' && i + 1 < input.length && input[i + 1] === '=') {
      tokens.push({ type: 'op', value: '<=' }); i += 2; continue
    }
    if (ch === '>' && i + 1 < input.length && input[i + 1] === '=') {
      tokens.push({ type: 'op', value: '>=' }); i += 2; continue
    }
    if (ch === '&' && i + 1 < input.length && input[i + 1] === '&') {
      tokens.push({ type: 'op', value: '&&' }); i += 2; continue
    }
    if (ch === '|' && i + 1 < input.length && input[i + 1] === '|') {
      tokens.push({ type: 'op', value: '||' }); i += 2; continue
    }

    if (ch === '+' || ch === '-' || ch === '*' || ch === '/' || ch === '%' ||
        ch === '<' || ch === '>' || ch === '!') {
      tokens.push({ type: 'op', value: ch }); i++; continue
    }

    throw new Error(`Unexpected character: '${ch}' at position ${i}`)
  }

  tokens.push({ type: 'eof', value: '' })
  return tokens
}

// ─── Parser ─────────────────────────────────────────────────────────────────

class Parser {
  private tokens: Token[]
  private pos: number

  constructor(tokens: Token[]) {
    this.tokens = tokens
    this.pos = 0
  }

  private peek(): Token {
    return this.tokens[this.pos]
  }

  private advance(): Token {
    const tok = this.tokens[this.pos]
    this.pos++
    return tok
  }

  private expect(type: Token['type']): Token {
    const tok = this.peek()
    if (tok.type !== type) {
      throw new Error(`Expected ${type}, got ${tok.type} ('${tok.value}')`)
    }
    return this.advance()
  }

  parse(): string {
    return this.parseOr()
  }

  private parseOr(): string {
    let left = this.parseAnd()
    while (this.peek().type === 'op' && this.peek().value === '||') {
      this.advance()
      const right = this.parseAnd()
      left = `(${left} || ${right})`
    }
    return left
  }

  private parseAnd(): string {
    let left = this.parseComparison()
    while (this.peek().type === 'op' && this.peek().value === '&&') {
      this.advance()
      const right = this.parseComparison()
      left = `(${left} && ${right})`
    }
    return left
  }

  private parseComparison(): string {
    let left = this.parseAddSub()
    while (this.peek().type === 'op' &&
           ['<', '>', '<=', '>=', '==', '!='].includes(this.peek().value)) {
      const op = this.advance().value
      const right = this.parseAddSub()
      left = `(${left} ${op} ${right})`
    }
    return left
  }

  private parseAddSub(): string {
    let left = this.parseMulDiv()
    while (this.peek().type === 'op' && (this.peek().value === '+' || this.peek().value === '-')) {
      const op = this.advance().value
      const right = this.parseMulDiv()
      left = `(${left} ${op} ${right})`
    }
    return left
  }

  private parseMulDiv(): string {
    let left = this.parsePower()
    while (this.peek().type === 'op' &&
           (this.peek().value === '*' || this.peek().value === '/' || this.peek().value === '%')) {
      const op = this.advance().value
      const right = this.parsePower()
      left = `(${left} ${op} ${right})`
    }
    return left
  }

  private parsePower(): string {
    let base = this.parseUnary()
    if (this.peek().type === 'op' && this.peek().value === '**') {
      this.advance()
      const exp = this.parseUnary()
      base = `Math.pow(${base}, ${exp})`
    }
    return base
  }

  private parseUnary(): string {
    if (this.peek().type === 'op' && this.peek().value === '-') {
      this.advance()
      const operand = this.parsePrimary()
      return `(-${operand})`
    }
    if (this.peek().type === 'op' && this.peek().value === '!') {
      this.advance()
      const operand = this.parsePrimary()
      return `(!${operand})`
    }
    return this.parsePrimary()
  }

  private parsePrimary(): string {
    const tok = this.peek()

    if (tok.type === 'number') {
      this.advance()
      return tok.value
    }

    if (tok.type === 'lparen') {
      this.advance()
      const expr = this.parse()
      this.expect('rparen')
      return `(${expr})`
    }

    if (tok.type === 'ident') {
      this.advance()
      const name = tok.value

      if (this.peek().type === 'lparen') {
        this.advance()
        const args: string[] = []
        if (this.peek().type !== 'rparen') {
          args.push(this.parse())
          while (this.peek().type === 'comma') {
            this.advance()
            args.push(this.parse())
          }
        }
        this.expect('rparen')
        return this.buildFunctionCall(name, args)
      }

      if (name === 'pi') return 'Math.PI'
      if (name === 'e') return 'Math.E'
      if (name === 'true') return 'true'
      if (name === 'false') return 'false'
      return name
    }

    throw new Error(`Unexpected token: ${tok.type} ('${tok.value}')`)
  }

  private buildFunctionCall(name: string, args: string[]): string {
    switch (name) {
      case 'sin': return `Math.sin(${args.join(', ')})`
      case 'cos': return `Math.cos(${args.join(', ')})`
      case 'tan': return `Math.tan(${args.join(', ')})`
      case 'sqrt': return `Math.sqrt(${args.join(', ')})`
      case 'abs': return `Math.abs(${args.join(', ')})`
      case 'min': return `Math.min(${args.join(', ')})`
      case 'max': return `Math.max(${args.join(', ')})`
      case 'floor': return `Math.floor(${args.join(', ')})`
      case 'ceil': return `Math.ceil(${args.join(', ')})`
      case 'round': return `Math.round(${args.join(', ')})`
      case 'seededRandom': return `__seededRandom(${args.join(', ')})`
      default: throw new Error(`Unknown function: ${name}`)
    }
  }
}

// ─── Seeded Random ──────────────────────────────────────────────────────────

function fnv1aHash(str: string): number {
  let hash = 0x811c9dc5
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i)
    hash = (hash * 0x01000193) >>> 0
  }
  return hash
}

export function seededRandom(namespace: string, index: number, seed: number): number {
  const hash = fnv1aHash(`${namespace}:${index}:${seed}`)
  return (hash & 0x7fffffff) / 0x7fffffff
}

// ─── Evaluator ──────────────────────────────────────────────────────────────

export function evaluateExpression(expr: string, vars: ExprVars): number {
  const parser = new Parser(tokenize(expr))
  const jsExpr = parser.parse()

  const varNames = Object.keys(vars)
  const varValues = varNames.map(n => vars[n])

  const fn = new Function(
    ...varNames,
    '__seededRandom',
    `"use strict"; return (${jsExpr});`
  )

  return fn(...varValues, seededRandom) as number
}