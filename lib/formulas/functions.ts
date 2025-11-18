import { parseA1Notation, getCellsInRange } from './utils'

export type FormulaFunction = (args: any[]) => number | string | boolean

export const FUNCTIONS: Record<string, FormulaFunction> = {
  SUM: (args: any[]) => {
    const numbers = args.flat().filter((v) => typeof v === 'number')
    return numbers.reduce((sum, n) => sum + n, 0)
  },

  AVERAGE: (args: any[]) => {
    const numbers = args.flat().filter((v) => typeof v === 'number')
    if (numbers.length === 0) return 0
    return numbers.reduce((sum, n) => sum + n, 0) / numbers.length
  },

  MIN: (args: any[]) => {
    const numbers = args.flat().filter((v) => typeof v === 'number')
    if (numbers.length === 0) return 0
    return Math.min(...numbers)
  },

  MAX: (args: any[]) => {
    const numbers = args.flat().filter((v) => typeof v === 'number')
    if (numbers.length === 0) return 0
    return Math.max(...numbers)
  },

  COUNT: (args: any[]) => {
    return args.flat().filter((v) => typeof v === 'number').length
  },

  COUNTA: (args: any[]) => {
    return args.flat().filter((v) => v !== null && v !== undefined && v !== '').length
  },

  IF: (args: any[]) => {
    if (args.length < 2) return '#ERROR!'
    const condition = args[0]
    const trueValue = args[1]
    const falseValue = args.length > 2 ? args[2] : false
    return condition ? trueValue : falseValue
  },

  ABS: (args: any[]) => {
    if (args.length === 0) return '#ERROR!'
    const num = args[0]
    return typeof num === 'number' ? Math.abs(num) : '#ERROR!'
  },

  ROUND: (args: any[]) => {
    if (args.length < 1) return '#ERROR!'
    const num = args[0]
    const decimals = args.length > 1 ? args[1] : 0
    if (typeof num !== 'number' || typeof decimals !== 'number') return '#ERROR!'
    return Math.round(num * Math.pow(10, decimals)) / Math.pow(10, decimals)
  },

  SQRT: (args: any[]) => {
    if (args.length === 0) return '#ERROR!'
    const num = args[0]
    return typeof num === 'number' ? Math.sqrt(num) : '#ERROR!'
  },

  POWER: (args: any[]) => {
    if (args.length < 2) return '#ERROR!'
    const base = args[0]
    const exponent = args[1]
    if (typeof base !== 'number' || typeof exponent !== 'number') return '#ERROR!'
    return Math.pow(base, exponent)
  },

  CONCATENATE: (args: any[]) => {
    return args.flat().map(String).join('')
  },

  UPPER: (args: any[]) => {
    if (args.length === 0) return '#ERROR!'
    return String(args[0]).toUpperCase()
  },

  LOWER: (args: any[]) => {
    if (args.length === 0) return '#ERROR!'
    return String(args[0]).toLowerCase()
  },

  LEN: (args: any[]) => {
    if (args.length === 0) return '#ERROR!'
    return String(args[0]).length
  },

  LEFT: (args: any[]) => {
    if (args.length < 1) return '#ERROR!'
    const str = String(args[0])
    const length = args.length > 1 ? args[1] : 1
    return str.substring(0, length)
  },

  RIGHT: (args: any[]) => {
    if (args.length < 1) return '#ERROR!'
    const str = String(args[0])
    const length = args.length > 1 ? args[1] : 1
    return str.substring(str.length - length)
  },

  MID: (args: any[]) => {
    if (args.length < 2) return '#ERROR!'
    const str = String(args[0])
    const start = args[1] - 1 // 1-indexed
    const length = args.length > 2 ? args[2] : str.length
    return str.substring(start, start + length)
  },
}

export function evaluateFunction(
  name: string,
  args: any[],
  getCellValue: (cell: string) => any
): any {
  const func = FUNCTIONS[name.toUpperCase()]
  if (!func) {
    return `#NAME? (${name})`
  }

  // Resolve cell references and ranges in arguments
  const resolvedArgs = args.map((arg) => {
    if (typeof arg === 'string' && arg.includes(':')) {
      // It's a range
      const cells = getCellsInRange(arg)
      return cells.map((cell) => getCellValue(cell))
    } else if (typeof arg === 'string' && parseA1Notation(arg)) {
      // It's a cell reference
      return getCellValue(arg)
    }
    return arg
  })

  try {
    return func(resolvedArgs)
  } catch (error) {
    return '#ERROR!'
  }
}
