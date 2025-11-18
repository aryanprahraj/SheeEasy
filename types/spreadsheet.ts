export interface CellData {
  value: string | number | null
  formula?: string
  style?: CellStyle
}

export interface CellStyle {
  bold?: boolean
  italic?: boolean
  underline?: boolean
  backgroundColor?: string
  color?: string
  fontSize?: number
  fontFamily?: string
  textAlign?: 'left' | 'center' | 'right'
  wrapText?: boolean
  horizontalAlign?: 'left' | 'center' | 'right'
  verticalAlign?: 'top' | 'middle' | 'bottom'
  indent?: number
  rotation?: 0 | 45 | -45 | 90 | -90
}

export interface MergedCell {
  startRow: number
  startCol: number
  endRow: number
  endCol: number
}

export interface SheetData {
  cells: Record<string, CellData>
  rows: number
  columns: number
  mergedCells: MergedCell[]
  rowHeights: Record<number, number>
  columnWidths: Record<number, number>
  frozenRows?: number
  frozenColumns?: number
}

export interface Sheet {
  id: string
  name: string
  data: SheetData
}

export interface SpreadsheetData {
  sheets: Sheet[]
  activeSheetId: string
}

export interface Spreadsheet {
  id: string
  user_id: string
  title: string
  sheet_data: SpreadsheetData
  created_at: string
  updated_at: string
}

export interface CellPosition {
  row: number
  col: number
}

export interface CellRange {
  start: CellPosition
  end: CellPosition
}
