// Convert column letter to number (A=0, B=1, Z=25, AA=26, etc.)
export function columnToNumber(col: string): number {
  let result = 0
  for (let i = 0; i < col.length; i++) {
    result *= 26
    result += col.charCodeAt(i) - 'A'.charCodeAt(0) + 1
  }
  return result - 1
}

// Convert column number to letter (0=A, 1=B, 25=Z, 26=AA, etc.)
export function numberToColumn(num: number): string {
  let result = ''
  let n = num + 1
  while (n > 0) {
    const remainder = (n - 1) % 26
    result = String.fromCharCode(65 + remainder) + result
    n = Math.floor((n - 1) / 26)
  }
  return result
}

// Parse A1 notation to row and column (e.g., "A1" => {row: 0, col: 0})
export function parseA1Notation(cell: string): { row: number; col: number } | null {
  const match = cell.match(/^([A-Z]+)(\d+)$/)
  if (!match) return null
  
  const col = columnToNumber(match[1])
  const row = parseInt(match[2], 10) - 1
  
  return { row, col }
}

// Convert row and column to A1 notation (e.g., {row: 0, col: 0} => "A1")
export function toA1Notation(row: number, col: number): string {
  return `${numberToColumn(col)}${row + 1}`
}

// Parse range notation (e.g., "A1:B10" => {start: {row: 0, col: 0}, end: {row: 9, col: 1}})
export function parseRange(range: string): {
  start: { row: number; col: number }
  end: { row: number; col: number }
} | null {
  const parts = range.split(':')
  if (parts.length !== 2) return null
  
  const start = parseA1Notation(parts[0])
  const end = parseA1Notation(parts[1])
  
  if (!start || !end) return null
  
  return { start, end }
}

// Get all cells in a range
export function getCellsInRange(range: string): string[] {
  const parsed = parseRange(range)
  if (!parsed) return []
  
  const cells: string[] = []
  for (let row = parsed.start.row; row <= parsed.end.row; row++) {
    for (let col = parsed.start.col; col <= parsed.end.col; col++) {
      cells.push(toA1Notation(row, col))
    }
  }
  return cells
}
