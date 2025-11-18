import * as XLSX from 'xlsx'
import Papa from 'papaparse'
import { SpreadsheetData } from '@/types/spreadsheet'
import { toA1Notation, parseA1Notation } from './formulas/utils'

// Export to CSV
export function exportToCSV(data: SpreadsheetData, filename: string) {
  const activeSheet = data.sheets.find((s) => s.id === data.activeSheetId)
  if (!activeSheet) return

  const { cells, rows, columns } = activeSheet.data

  // Convert cells to 2D array
  const csvData: string[][] = []
  for (let row = 0; row < rows; row++) {
    const rowData: string[] = []
    for (let col = 0; col < columns; col++) {
      const cellRef = toA1Notation(row, col)
      const cell = cells[cellRef]
      const value = cell?.formula || cell?.value?.toString() || ''
      rowData.push(value)
    }
    csvData.push(rowData)
  }

  // Convert to CSV string
  const csv = Papa.unparse(csvData)

  // Download
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = `${filename}.csv`
  link.click()
}

// Export to XLSX
export function exportToXLSX(data: SpreadsheetData, filename: string) {
  const workbook = XLSX.utils.book_new()

  data.sheets.forEach((sheet) => {
    const { cells, rows, columns } = sheet.data

    // Convert cells to 2D array
    const sheetData: any[][] = []
    for (let row = 0; row < rows; row++) {
      const rowData: any[] = []
      for (let col = 0; col < columns; col++) {
        const cellRef = toA1Notation(row, col)
        const cell = cells[cellRef]
        const value = cell?.value ?? ''
        rowData.push(value)
      }
      sheetData.push(rowData)
    }

    const worksheet = XLSX.utils.aoa_to_sheet(sheetData)

    // Apply cell styles and formulas
    Object.entries(cells).forEach(([cellRef, cellData]) => {
      if (!worksheet[cellRef]) {
        worksheet[cellRef] = {}
      }

      if (cellData.formula) {
        const excelFormula = cellData.formula.startsWith('=') 
          ? cellData.formula 
          : `=${cellData.formula}`
        worksheet[cellRef] = { ...worksheet[cellRef], f: excelFormula }
      }

      // Apply cell styling
      if (cellData.style) {
        const style = cellData.style
        const cellStyle: any = {}

        // Font styling
        const font: any = {}
        if (style.bold) font.bold = true
        if (style.italic) font.italic = true
        if (style.underline) font.underline = true
        if (style.color) font.color = { rgb: style.color.replace('#', '') }
        if (style.fontSize) font.sz = style.fontSize
        if (Object.keys(font).length > 0) cellStyle.font = font

        // Fill (background color)
        if (style.backgroundColor) {
          cellStyle.fill = {
            fgColor: { rgb: style.backgroundColor.replace('#', '') }
          }
        }

        // Alignment
        const alignment: any = {}
        if (style.horizontalAlign) {
          alignment.horizontal = style.horizontalAlign
        }
        if (style.verticalAlign) {
          alignment.vertical = style.verticalAlign === 'top' ? 'top' : 
                              style.verticalAlign === 'bottom' ? 'bottom' : 'center'
        }
        if (style.wrapText) alignment.wrapText = true
        if (style.rotation) alignment.textRotation = style.rotation
        if (style.indent) alignment.indent = style.indent
        if (Object.keys(alignment).length > 0) cellStyle.alignment = alignment

        if (Object.keys(cellStyle).length > 0) {
          worksheet[cellRef].s = cellStyle
        }
      }
    })

    XLSX.utils.book_append_sheet(workbook, worksheet, sheet.name)
  })

  // Download
  XLSX.writeFile(workbook, `${filename}.xlsx`)
}

// Export to JSON
export function exportToJSON(data: SpreadsheetData, filename: string) {
  const json = JSON.stringify(data, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = `${filename}.json`
  link.click()
}

// Import from CSV
export function importFromCSV(file: File): Promise<SpreadsheetData> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      complete: (results) => {
        const data = results.data as string[][]
        
        const cells: Record<string, any> = {}
        data.forEach((row, rowIndex) => {
          row.forEach((cell, colIndex) => {
            if (cell) {
              const cellRef = toA1Notation(rowIndex, colIndex)
              cells[cellRef] = {
                value: cell,
                formula: cell.startsWith('=') ? cell : undefined,
              }
            }
          })
        })

        const spreadsheetData: SpreadsheetData = {
          sheets: [
            {
              id: 'sheet1',
              name: 'Imported Sheet',
              data: {
                cells,
                rows: Math.max(100, data.length),
                columns: Math.max(26, Math.max(...data.map((r) => r.length))),
                mergedCells: [],
                rowHeights: {},
                columnWidths: {},
              },
            },
          ],
          activeSheetId: 'sheet1',
        }

        resolve(spreadsheetData)
      },
      error: (error) => {
        reject(error)
      },
    })
  })
}

// Import from XLSX
export function importFromXLSX(file: File): Promise<SpreadsheetData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer)
        const workbook = XLSX.read(data, { type: 'array' })

        const sheets = workbook.SheetNames.map((sheetName) => {
          const worksheet = workbook.Sheets[sheetName]
          const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1')

          const cells: Record<string, any> = {}
          
          for (let row = range.s.r; row <= range.e.r; row++) {
            for (let col = range.s.c; col <= range.e.c; col++) {
              const cellAddress = { r: row, c: col }
              const cellRef = XLSX.utils.encode_cell(cellAddress)
              const cell = worksheet[cellRef]

              if (cell) {
                const a1Notation = toA1Notation(row, col)
                const cellData: any = {
                  value: cell.v,
                  formula: cell.f ? `=${cell.f}` : undefined,
                }

                // Import cell styling
                if (cell.s) {
                  const style: any = {}

                  // Font styling
                  if (cell.s.font) {
                    if (cell.s.font.bold) style.bold = true
                    if (cell.s.font.italic) style.italic = true
                    if (cell.s.font.underline) style.underline = true
                    if (cell.s.font.color?.rgb) {
                      style.color = `#${cell.s.font.color.rgb}`
                    }
                    if (cell.s.font.sz) style.fontSize = cell.s.font.sz
                  }

                  // Fill (background color)
                  if (cell.s.fill?.fgColor?.rgb) {
                    style.backgroundColor = `#${cell.s.fill.fgColor.rgb}`
                  }

                  // Alignment
                  if (cell.s.alignment) {
                    if (cell.s.alignment.horizontal) {
                      style.horizontalAlign = cell.s.alignment.horizontal
                    }
                    if (cell.s.alignment.vertical) {
                      style.verticalAlign = cell.s.alignment.vertical
                    }
                    if (cell.s.alignment.wrapText) {
                      style.wrapText = true
                    }
                    if (cell.s.alignment.textRotation) {
                      style.rotation = cell.s.alignment.textRotation
                    }
                    if (cell.s.alignment.indent) {
                      style.indent = cell.s.alignment.indent
                    }
                  }

                  if (Object.keys(style).length > 0) {
                    cellData.style = style
                  }
                }

                cells[a1Notation] = cellData
              }
            }
          }

          return {
            id: sheetName.toLowerCase().replace(/\s+/g, '-'),
            name: sheetName,
            data: {
              cells,
              rows: Math.max(100, range.e.r + 1),
              columns: Math.max(26, range.e.c + 1),
              mergedCells: [],
              rowHeights: {},
              columnWidths: {},
            },
          }
        })

        const spreadsheetData: SpreadsheetData = {
          sheets,
          activeSheetId: sheets[0]?.id || 'sheet1',
        }

        resolve(spreadsheetData)
      } catch (error) {
        reject(error)
      }
    }

    reader.onerror = () => {
      reject(new Error('Failed to read file'))
    }

    reader.readAsArrayBuffer(file)
  })
}
