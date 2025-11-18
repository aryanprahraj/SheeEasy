import { FormulaParser, Token } from './parser'
import { evaluateFunction } from './functions'
import { parseA1Notation } from './utils'

export class FormulaEvaluator {
  private tokens: Token[]
  private position: number
  private getCellValue: (cell: string) => any

  constructor(formula: string, getCellValue: (cell: string) => any) {
    const parser = new FormulaParser(formula)
    this.tokens = parser.tokenize()
    this.position = 0
    this.getCellValue = getCellValue
  }

  private currentToken(): Token {
    return this.tokens[this.position]
  }

  private advance(): void {
    this.position++
  }

  private expect(type: string): Token {
    const token = this.currentToken()
    if (token.type !== type) {
      throw new Error(`Expected ${type} but got ${token.type}`)
    }
    this.advance()
    return token
  }

  public evaluate(): any {
    try {
      const result = this.parseExpression()
      return result
    } catch (error) {
      return '#ERROR!'
    }
  }

  private parseExpression(): any {
    return this.parseComparison()
  }

  private parseComparison(): any {
    let left = this.parseAdditive()

    while (
      this.currentToken().type === 'OPERATOR' &&
      ['=', '<', '>', '<=', '>=', '<>'].includes(this.currentToken().value)
    ) {
      const op = this.currentToken().value
      this.advance()
      const right = this.parseAdditive()

      switch (op) {
        case '=':
          left = left === right
          break
        case '<':
          left = left < right
          break
        case '>':
          left = left > right
          break
        case '<=':
          left = left <= right
          break
        case '>=':
          left = left >= right
          break
        case '<>':
          left = left !== right
          break
      }
    }

    return left
  }

  private parseAdditive(): any {
    let left = this.parseMultiplicative()

    while (
      this.currentToken().type === 'OPERATOR' &&
      ['+', '-', '&'].includes(this.currentToken().value)
    ) {
      const op = this.currentToken().value
      this.advance()
      const right = this.parseMultiplicative()

      if (op === '+') {
        left = (typeof left === 'number' ? left : 0) + (typeof right === 'number' ? right : 0)
      } else if (op === '-') {
        left = (typeof left === 'number' ? left : 0) - (typeof right === 'number' ? right : 0)
      } else if (op === '&') {
        left = String(left) + String(right)
      }
    }

    return left
  }

  private parseMultiplicative(): any {
    let left = this.parseExponentiation()

    while (
      this.currentToken().type === 'OPERATOR' &&
      ['*', '/'].includes(this.currentToken().value)
    ) {
      const op = this.currentToken().value
      this.advance()
      const right = this.parseExponentiation()

      if (op === '*') {
        left = (typeof left === 'number' ? left : 0) * (typeof right === 'number' ? right : 0)
      } else if (op === '/') {
        const rightNum = typeof right === 'number' ? right : 0
        if (rightNum === 0) return '#DIV/0!'
        left = (typeof left === 'number' ? left : 0) / rightNum
      }
    }

    return left
  }

  private parseExponentiation(): any {
    let left = this.parseUnary()

    while (this.currentToken().type === 'OPERATOR' && this.currentToken().value === '^') {
      this.advance()
      const right = this.parseUnary()
      left = Math.pow(
        typeof left === 'number' ? left : 0,
        typeof right === 'number' ? right : 0
      )
    }

    return left
  }

  private parseUnary(): any {
    if (this.currentToken().type === 'OPERATOR' && this.currentToken().value === '-') {
      this.advance()
      const value = this.parseUnary()
      return typeof value === 'number' ? -value : value
    }

    if (this.currentToken().type === 'OPERATOR' && this.currentToken().value === '+') {
      this.advance()
      return this.parseUnary()
    }

    return this.parsePrimary()
  }

  private parsePrimary(): any {
    const token = this.currentToken()

    // Number
    if (token.type === 'NUMBER') {
      this.advance()
      return parseFloat(token.value)
    }

    // String
    if (token.type === 'STRING') {
      this.advance()
      return token.value
    }

    // Cell reference
    if (token.type === 'CELL') {
      this.advance()
      const value = this.getCellValue(token.value)
      
      // If the cell contains a formula error, return it
      if (typeof value === 'string' && value.startsWith('#')) {
        return value
      }
      
      // Try to convert to number if possible
      if (typeof value === 'string' && !isNaN(Number(value))) {
        return Number(value)
      }
      
      return value ?? 0
    }

    // Range (shouldn't appear alone, usually in functions)
    if (token.type === 'RANGE') {
      this.advance()
      return token.value
    }

    // Function call
    if (token.type === 'FUNCTION') {
      const funcName = token.value
      this.advance()
      this.expect('LPAREN')

      const args: any[] = []
      
      // Parse arguments
      if (this.currentToken().type !== 'RPAREN') {
        args.push(this.parseExpression())

        while (this.currentToken().type === 'COMMA') {
          this.advance()
          args.push(this.parseExpression())
        }
      }

      this.expect('RPAREN')

      return evaluateFunction(funcName, args, this.getCellValue)
    }

    // Parenthesized expression
    if (token.type === 'LPAREN') {
      this.advance()
      const value = this.parseExpression()
      this.expect('RPAREN')
      return value
    }

    throw new Error(`Unexpected token: ${token.type}`)
  }
}

export function evaluateFormula(formula: string, getCellValue: (cell: string) => any): any {
  if (!formula || !formula.startsWith('=')) {
    return formula
  }

  const evaluator = new FormulaEvaluator(formula, getCellValue)
  return evaluator.evaluate()
}
