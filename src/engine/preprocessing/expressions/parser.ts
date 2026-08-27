// ─── Safe Expression Evaluator ──────────────────────────────────────────────
// Recursive descent parser → AST → tree-walking evaluator.
// No eval(), no new Function().
// Supports arithmetic, comparisons, logic, math functions, constants, seeded random.
// ─────────────────────────────────────────────────────────────────────────────

export type ExprVars = Record<string, number>

// ─── AST ────────────────────────────────────────────────────────────────────

export type ASTNode =
  | { type: 'number'; value: number }
  | { type: 'variable'; name: string }
  | { type: 'binary'; op: string; left: ASTNode; right: ASTNode }
  | { type: 'unary'; op: string; expr: ASTNode }
  | { type: 'call'; name: string; args: ASTNode[] }

// ─── Tokenizer ──────────────────────────────────────────────────────────────

interface Token {
  type: 'number' | 'ident' | 'op' | 'lparen' | 'rparen' | 'comma' | 'eof'
  value: string
}

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

// ─── Parser (produces AST) ─────────────────────────────────────────────────

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

  parse(): ASTNode {
    return this.parseOr()
  }

  private parseOr(): ASTNode {
    let left = this.parseAnd()
    while (this.peek().type === 'op' && this.peek().value === '||') {
      this.advance()
      const right = this.parseAnd()
      left = { type: 'binary', op: '||', left, right }
    }
    return left
  }

  private parseAnd(): ASTNode {
    let left = this.parseComparison()
    while (this.peek().type === 'op' && this.peek().value === '&&') {
      this.advance()
      const right = this.parseComparison()
      left = { type: 'binary', op: '&&', left, right }
    }
    return left
  }

  private parseComparison(): ASTNode {
    let left = this.parseAddSub()
    while (this.peek().type === 'op' &&
           ['<', '>', '<=', '>=', '==', '!='].includes(this.peek().value)) {
      const op = this.advance().value
      const right = this.parseAddSub()
      left = { type: 'binary', op, left, right }
    }
    return left
  }

  private parseAddSub(): ASTNode {
    let left = this.parseMulDiv()
    while (this.peek().type === 'op' && (this.peek().value === '+' || this.peek().value === '-')) {
      const op = this.advance().value
      const right = this.parseMulDiv()
      left = { type: 'binary', op, left, right }
    }
    return left
  }

  private parseMulDiv(): ASTNode {
    let left = this.parsePower()
    while (this.peek().type === 'op' &&
           (this.peek().value === '*' || this.peek().value === '/' || this.peek().value === '%')) {
      const op = this.advance().value
      const right = this.parsePower()
      left = { type: 'binary', op, left, right }
    }
    return left
  }

  private parsePower(): ASTNode {
    let base = this.parseUnary()
    if (this.peek().type === 'op' && this.peek().value === '**') {
      this.advance()
      const exp = this.parseUnary()
      base = { type: 'call', name: 'pow', args: [base, exp] }
    }
    return base
  }

  private parseUnary(): ASTNode {
    if (this.peek().type === 'op' && this.peek().value === '-') {
      this.advance()
      const operand = this.parsePrimary()
      return { type: 'unary', op: '-', expr: operand }
    }
    if (this.peek().type === 'op' && this.peek().value === '!') {
      this.advance()
      const operand = this.parsePrimary()
      return { type: 'unary', op: '!', expr: operand }
    }
    return this.parsePrimary()
  }

  private parsePrimary(): ASTNode {
    const tok = this.peek()

    if (tok.type === 'number') {
      this.advance()
      return { type: 'number', value: parseFloat(tok.value) }
    }

    if (tok.type === 'lparen') {
      this.advance()
      const expr = this.parse()
      this.expect('rparen')
      return expr
    }

    if (tok.type === 'ident') {
      this.advance()
      const name = tok.value

      if (this.peek().type === 'lparen') {
        this.advance()
        const args: ASTNode[] = []
        if (this.peek().type !== 'rparen') {
          args.push(this.parse())
          while (this.peek().type === 'comma') {
            this.advance()
            args.push(this.parse())
          }
        }
        this.expect('rparen')
        return { type: 'call', name, args }
      }

      if (name === 'pi') return { type: 'number', value: Math.PI }
      if (name === 'e') return { type: 'number', value: Math.E }
      if (name === 'true') return { type: 'number', value: 1 }
      if (name === 'false') return { type: 'number', value: 0 }
      return { type: 'variable', name }
    }

    throw new Error(`Unexpected token: ${tok.type} ('${tok.value}')`)
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

// ─── Math Functions ─────────────────────────────────────────────────────────

function callMathFn(name: string, args: number[]): number {
  switch (name) {
    case 'sin': return Math.sin(args[0])
    case 'cos': return Math.cos(args[0])
    case 'tan': return Math.tan(args[0])
    case 'sqrt': return Math.sqrt(args[0])
    case 'abs': return Math.abs(args[0])
    case 'pow': return Math.pow(args[0], args[1])
    case 'min': return Math.min(...args)
    case 'max': return Math.max(...args)
    case 'floor': return Math.floor(args[0])
    case 'ceil': return Math.ceil(args[0])
    case 'round': return Math.round(args[0])
    case 'seededRandom': return seededRandom(String(args[0] ?? ''), args[1] ?? 0, args[2] ?? 0)
    default: throw new Error(`Unknown function: ${name}`)
  }
}

// ─── AST Evaluator (tree-walking, no eval) ──────────────────────────────────

function evaluateAST(node: ASTNode, vars: ExprVars): number {
  switch (node.type) {
    case 'number':
      return node.value

    case 'variable':
      return vars[node.name] ?? 0

    case 'unary': {
      const val = evaluateAST(node.expr, vars)
      return node.op === '-' ? -val : (val ? 0 : 1)
    }

    case 'binary': {
      const left = evaluateAST(node.left, vars)
      const right = evaluateAST(node.right, vars)
      switch (node.op) {
        case '+': return left + right
        case '-': return left - right
        case '*': return left * right
        case '/': return right !== 0 ? left / right : NaN
        case '%': return right !== 0 ? left % right : NaN
        case '<': return left < right ? 1 : 0
        case '>': return left > right ? 1 : 0
        case '<=': return left <= right ? 1 : 0
        case '>=': return left >= right ? 1 : 0
        case '==': return left === right ? 1 : 0
        case '!=': return left !== right ? 1 : 0
        case '&&': return (left && right) ? 1 : 0
        case '||': return (left || right) ? 1 : 0
        default: throw new Error(`Unknown operator: ${node.op}`)
      }
    }

    case 'call': {
      const args = node.args.map(a => evaluateAST(a, vars))
      return callMathFn(node.name, args)
    }
  }
}

// ─── Public API ─────────────────────────────────────────────────────────────

export function parseExpression(expr: string): ASTNode {
  return new Parser(tokenize(expr)).parse()
}

export function evaluateExpression(expr: string, vars: ExprVars): number {
  const ast = parseExpression(expr)
  return evaluateAST(ast, vars)
}
