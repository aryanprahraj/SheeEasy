export type TokenType =
  | 'NUMBER'
  | 'CELL'
  | 'RANGE'
  | 'FUNCTION'
  | 'OPERATOR'
  | 'LPAREN'
  | 'RPAREN'
  | 'COMMA'
  | 'STRING'
  | 'EOF'

export interface Token {
  type: TokenType
  value: string
  position: number
}

export class FormulaParser {
  private input: string
  private position: number
  private currentChar: string | null

  constructor(formula: string) {
    // Remove leading = if present
    this.input = formula.startsWith('=') ? formula.slice(1) : formula
    this.position = 0
    this.currentChar = this.input[0] || null
  }

  private advance(): void {
    this.position++
    this.currentChar = this.position < this.input.length ? this.input[this.position] : null
  }

  private peek(offset: number = 1): string | null {
    const pos = this.position + offset
    return pos < this.input.length ? this.input[pos] : null
  }

  private skipWhitespace(): void {
    while (this.currentChar && /\s/.test(this.currentChar)) {
      this.advance()
    }
  }

  private readNumber(): Token {
    const start = this.position
    let numStr = ''

    while (this.currentChar && /[\d.]/.test(this.currentChar)) {
      numStr += this.currentChar
      this.advance()
    }

    return { type: 'NUMBER', value: numStr, position: start }
  }

  private readCellOrRange(): Token {
    const start = this.position
    let cellStr = ''

    // Read column letters
    while (this.currentChar && /[A-Z]/i.test(this.currentChar)) {
      cellStr += this.currentChar.toUpperCase()
      this.advance()
    }

    // Read row numbers
    while (this.currentChar && /\d/.test(this.currentChar)) {
      cellStr += this.currentChar
      this.advance()
    }

    // Check if it's a range (A1:B10)
    if (this.currentChar === ':') {
      this.advance()
      cellStr += ':'

      // Read second cell
      while (this.currentChar && /[A-Z\d]/i.test(this.currentChar)) {
        cellStr += this.currentChar.toUpperCase()
        this.advance()
      }

      return { type: 'RANGE', value: cellStr, position: start }
    }

    return { type: 'CELL', value: cellStr, position: start }
  }

  private readFunction(): Token {
    const start = this.position
    let funcName = ''

    while (this.currentChar && /[A-Z]/i.test(this.currentChar)) {
      funcName += this.currentChar.toUpperCase()
      this.advance()
    }

    return { type: 'FUNCTION', value: funcName, position: start }
  }

  private readString(): Token {
    const start = this.position
    let str = ''
    this.advance() // Skip opening quote

    while (this.currentChar && this.currentChar !== '"') {
      if (this.currentChar === '\\' && this.peek() === '"') {
        this.advance()
        str += '"'
      } else {
        str += this.currentChar
      }
      this.advance()
    }

    if (this.currentChar === '"') {
      this.advance() // Skip closing quote
    }

    return { type: 'STRING', value: str, position: start }
  }

  public tokenize(): Token[] {
    const tokens: Token[] = []

    while (this.currentChar !== null) {
      this.skipWhitespace()

      if (this.currentChar === null) break

      // Numbers
      if (/\d/.test(this.currentChar)) {
        tokens.push(this.readNumber())
        continue
      }

      // Strings
      if (this.currentChar === '"') {
        tokens.push(this.readString())
        continue
      }

      // Cell references, ranges, or functions
      if (/[A-Z]/i.test(this.currentChar)) {
        const start = this.position
        const next = this.peek()

        // Check if it's a function (followed by '(')
        let tempPos = this.position
        let tempStr = ''
        while (tempPos < this.input.length && /[A-Z]/i.test(this.input[tempPos])) {
          tempStr += this.input[tempPos]
          tempPos++
        }
        if (tempPos < this.input.length && this.input[tempPos] === '(') {
          tokens.push(this.readFunction())
          continue
        }

        // Otherwise, it's a cell or range
        tokens.push(this.readCellOrRange())
        continue
      }

      // Operators
      if (['+', '-', '*', '/', '^', '=', '<', '>', '&'].includes(this.currentChar)) {
        let op = this.currentChar
        const start = this.position
        this.advance()

        // Handle two-character operators
        if (this.currentChar === '=' && ['<', '>', '='].includes(op)) {
          op += this.currentChar
          this.advance()
        }

        tokens.push({ type: 'OPERATOR', value: op, position: start })
        continue
      }

      // Parentheses
      if (this.currentChar === '(') {
        tokens.push({ type: 'LPAREN', value: '(', position: this.position })
        this.advance()
        continue
      }

      if (this.currentChar === ')') {
        tokens.push({ type: 'RPAREN', value: ')', position: this.position })
        this.advance()
        continue
      }

      // Comma
      if (this.currentChar === ',') {
        tokens.push({ type: 'COMMA', value: ',', position: this.position })
        this.advance()
        continue
      }

      // Unknown character - skip it
      this.advance()
    }

    tokens.push({ type: 'EOF', value: '', position: this.position })
    return tokens
  }
}
