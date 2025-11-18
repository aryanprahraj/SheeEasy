import { create } from 'zustand'
import { produce } from 'immer'
import { CellData, SheetData, Sheet, SpreadsheetData, CellPosition } from '@/types/spreadsheet'
import { evaluateFormula } from '@/lib/formulas/evaluator'
import { DependencyGraph } from '@/lib/formulas/dependencyGraph'
import { toA1Notation, parseA1Notation, numberToColumn } from '@/lib/formulas/utils'

interface HistoryState {
  sheets: Sheet[]
  activeSheetId: string
}

interface SpreadsheetStore {
  // Spreadsheet metadata
  spreadsheetId: string | null
  title: string
  sheets: Sheet[]
  activeSheetId: string
  
  // Selection state
  selectedCell: CellPosition | null
  selectedRange: { start: CellPosition; end: CellPosition } | null
  
  // Edit state
  editingCell: CellPosition | null
  editValue: string
  isEditMode: boolean
  
  // Formula dependencies
  dependencyGraph: DependencyGraph
  
  // History for undo/redo
  history: HistoryState[]
  historyIndex: number
  
  // Auto-save state
  lastSaved: Date | null
  isDirty: boolean
  
  // View state
  zoom: number
  setZoom: (zoom: number) => void
  
  // Actions
  setSpreadsheetId: (id: string) => void
  setTitle: (title: string) => void
  loadSpreadsheet: (data: SpreadsheetData) => void
  
  // Sheet operations
  addSheet: (name?: string) => void
  deleteSheet: (sheetId: string) => void
  renameSheet: (sheetId: string, name: string) => void
  setActiveSheet: (sheetId: string) => void
  duplicateSheet: (sheetId: string) => void
  
  // Cell operations
  setCellValue: (row: number, col: number, value: string) => void
  setCellStyle: (row: number, col: number, style: Partial<CellData['style']>) => void
  getCellValue: (cellRef: string) => any
  getCellData: (row: number, col: number) => CellData | null
  
  // Selection
  selectCell: (row: number, col: number) => void
  selectRange: (start: CellPosition, end: CellPosition) => void
  selectRow: (row: number) => void
  selectColumn: (col: number) => void
  clearSelection: () => void
  
  // Editing
  startEditing: (row: number, col: number, initialValue?: string) => void
  updateEditValue: (value: string) => void
  finishEditing: () => void
  finishEditingAndMove: (direction: 'down' | 'up' | 'right' | 'left') => void
  cancelEditing: () => void
  
  // Clipboard operations
  copiedCells: { data: CellData; position: CellPosition }[] | null
  cutCells: { data: CellData; position: CellPosition }[] | null
  copy: () => void
  cut: () => void
  paste: (forceTranspose?: boolean) => Promise<void>
  
  // Row/Column operations
  setRowHeight: (row: number, height: number) => void
  setColumnWidth: (col: number, width: number) => void
  insertRow: (row: number) => void
  deleteRow: (row: number) => void
  insertColumn: (col: number) => void
  deleteColumn: (col: number) => void
  setFrozenRows: (rows: number) => void
  setFrozenColumns: (columns: number) => void
  sortColumn: (col: number, ascending: boolean, sortType?: 'text' | 'numeric' | 'date') => void
  
  // History
  undo: () => void
  redo: () => void
  canUndo: () => boolean
  canRedo: () => boolean
  
  // Save state
  markSaved: () => void
  getSpreadsheetData: () => SpreadsheetData
}

export const useSpreadsheetStore = create<SpreadsheetStore>((set, get) => ({
  spreadsheetId: null,
  title: 'Untitled Spreadsheet',
  sheets: [
    {
      id: 'sheet1',
      name: 'Sheet 1',
      data: {
        cells: {},
        rows: 100,
        columns: 26,
        mergedCells: [],
        rowHeights: {},
        columnWidths: {},
      },
    },
  ],
  activeSheetId: 'sheet1',
  selectedCell: null,
  selectedRange: null,
  editingCell: null,
  editValue: '',
  isEditMode: false,
  dependencyGraph: new DependencyGraph(),
  history: [],
  historyIndex: -1,
  lastSaved: null,
  isDirty: false,
  zoom: 100,
  copiedCells: null,
  cutCells: null,

  setSpreadsheetId: (id) => set({ spreadsheetId: id }),
  
  setTitle: (title) => set({ title, isDirty: true }),

  loadSpreadsheet: (data) => {
    const depGraph = new DependencyGraph()
    
    // Build dependency graph for all sheets
    data.sheets.forEach((sheet) => {
      Object.entries(sheet.data.cells).forEach(([cellRef, cellData]) => {
        if (cellData.formula) {
          depGraph.updateCellDependencies(cellRef, cellData.formula)
        }
      })
    })

    set({
      sheets: data.sheets,
      activeSheetId: data.activeSheetId,
      dependencyGraph: depGraph,
      history: [],
      historyIndex: -1,
      isDirty: false,
      lastSaved: new Date(),
    })
  },

  addSheet: (name) => {
    set(
      produce((state: SpreadsheetStore) => {
        const sheetNumber = state.sheets.length + 1
        const newSheet: Sheet = {
          id: `sheet${Date.now()}`,
          name: name || `Sheet ${sheetNumber}`,
          data: {
            cells: {},
            rows: 100,
            columns: 26,
            mergedCells: [],
            rowHeights: {},
            columnWidths: {},
          },
        }
        state.sheets.push(newSheet)
        state.activeSheetId = newSheet.id
        state.isDirty = true
      })
    )
  },

  deleteSheet: (sheetId) => {
    const state = get()
    if (state.sheets.length === 1) return // Can't delete the last sheet

    set(
      produce((state: SpreadsheetStore) => {
        const index = state.sheets.findIndex((s) => s.id === sheetId)
        if (index === -1) return

        state.sheets.splice(index, 1)
        
        if (state.activeSheetId === sheetId) {
          state.activeSheetId = state.sheets[Math.max(0, index - 1)].id
        }
        state.isDirty = true
      })
    )
  },

  renameSheet: (sheetId, name) => {
    set(
      produce((state: SpreadsheetStore) => {
        const sheet = state.sheets.find((s) => s.id === sheetId)
        if (sheet) {
          sheet.name = name
          state.isDirty = true
        }
      })
    )
  },

  setActiveSheet: (sheetId) => {
    set({ activeSheetId: sheetId, selectedCell: null, selectedRange: null })
  },

  duplicateSheet: (sheetId) => {
    set(
      produce((state: SpreadsheetStore) => {
        const sheet = state.sheets.find((s) => s.id === sheetId)
        if (!sheet) return

        const newSheet: Sheet = {
          id: `sheet${Date.now()}`,
          name: `${sheet.name} (Copy)`,
          data: JSON.parse(JSON.stringify(sheet.data)),
        }
        state.sheets.push(newSheet)
        state.activeSheetId = newSheet.id
        state.isDirty = true
      })
    )
  },

  setCellValue: (row, col, value) => {
    const cellRef = toA1Notation(row, col)
    const state = get()
    const activeSheet = state.sheets.find((s) => s.id === state.activeSheetId)
    if (!activeSheet) return

    set(
      produce((state: SpreadsheetStore) => {
        const sheet = state.sheets.find((s) => s.id === state.activeSheetId)
        if (!sheet) return

        // Save current state to history
        if (state.historyIndex < state.history.length - 1) {
          state.history = state.history.slice(0, state.historyIndex + 1)
        }
        state.history.push({
          sheets: JSON.parse(JSON.stringify(state.sheets)),
          activeSheetId: state.activeSheetId,
        })
        state.historyIndex++
        if (state.history.length > 50) {
          state.history.shift()
          state.historyIndex--
        }

        const existingCell = sheet.data.cells[cellRef] || {}
        
        // Safely convert value to string before checking
        const stringValue = typeof value === 'string' ? value : String(value ?? '')
        
        if (stringValue.startsWith('=')) {
          // It's a formula
          sheet.data.cells[cellRef] = {
            ...existingCell,
            formula: stringValue,
            value: null,
          }
          
          // Update dependencies
          state.dependencyGraph.updateCellDependencies(cellRef, stringValue)
          
          // Recalculate this cell and affected cells
          const affectedCells = [cellRef, ...state.dependencyGraph.getAffectedCells(cellRef)]
          
          affectedCells.forEach((cell) => {
            const cellData = sheet.data.cells[cell]
            if (cellData?.formula) {
              const result = evaluateFormula(cellData.formula, (ref) => get().getCellValue(ref))
              cellData.value = result
            }
          })
        } else {
          // It's a regular value
          sheet.data.cells[cellRef] = {
            ...existingCell,
            value: stringValue === '' ? null : stringValue,
            formula: undefined,
          }
          
          // Remove from dependency graph
          state.dependencyGraph.removeDependencies(cellRef)
          
          // Recalculate cells that depend on this cell
          const affectedCells = state.dependencyGraph.getAffectedCells(cellRef)
          affectedCells.forEach((cell) => {
            const cellData = sheet.data.cells[cell]
            if (cellData?.formula) {
              const result = evaluateFormula(cellData.formula, (ref) => get().getCellValue(ref))
              cellData.value = result
            }
          })
        }

        state.isDirty = true
      })
    )
  },

  setCellStyle: (row, col, style) => {
    const cellRef = toA1Notation(row, col)
    
    set(
      produce((state: SpreadsheetStore) => {
        const sheet = state.sheets.find((s) => s.id === state.activeSheetId)
        if (!sheet) return

        if (!sheet.data.cells[cellRef]) {
          sheet.data.cells[cellRef] = { value: null }
        }

        sheet.data.cells[cellRef].style = {
          ...sheet.data.cells[cellRef].style,
          ...style,
        }

        state.isDirty = true
      })
    )
  },

  getCellValue: (cellRef) => {
    const state = get()
    const activeSheet = state.sheets.find((s) => s.id === state.activeSheetId)
    if (!activeSheet) return null

    const cellData = activeSheet.data.cells[cellRef]
    if (!cellData) return null

    if (cellData.formula) {
      return cellData.value
    }

    return cellData.value
  },

  getCellData: (row, col) => {
    const cellRef = toA1Notation(row, col)
    const state = get()
    const activeSheet = state.sheets.find((s) => s.id === state.activeSheetId)
    if (!activeSheet) return null

    return activeSheet.data.cells[cellRef] || null
  },

  selectCell: (row, col) => {
    set({
      selectedCell: { row, col },
      selectedRange: null,
    })
  },

  selectRange: (start, end) => {
    set({
      selectedCell: null,
      selectedRange: { start, end },
    })
  },

  selectRow: (row) => {
    const { sheets, activeSheetId } = get()
    const activeSheet = sheets.find((s) => s.id === activeSheetId)
    if (!activeSheet) return
    
    const columns = activeSheet.data.columns
    set({
      selectedCell: null,
      selectedRange: {
        start: { row, col: 0 },
        end: { row, col: columns - 1 },
      },
    })
  },

  selectColumn: (col) => {
    const { sheets, activeSheetId } = get()
    const activeSheet = sheets.find((s) => s.id === activeSheetId)
    if (!activeSheet) return
    
    const rows = activeSheet.data.rows
    set({
      selectedCell: null,
      selectedRange: {
        start: { row: 0, col },
        end: { row: rows - 1, col },
      },
    })
  },

  clearSelection: () => {
    set({ selectedCell: null, selectedRange: null })
  },

  startEditing: (row, col, initialValue) => {
    const cellData = get().getCellData(row, col)
    const value = initialValue !== undefined 
      ? initialValue 
      : (cellData?.formula || cellData?.value?.toString() || '')
    
    set({
      editingCell: { row, col },
      editValue: value,
      isEditMode: true,
    })
  },

  updateEditValue: (value) => {
    set({ editValue: value })
  },

  finishEditing: () => {
    const state = get()
    if (!state.editingCell) return

    get().setCellValue(state.editingCell.row, state.editingCell.col, state.editValue)
    
    set({
      editingCell: null,
      editValue: '',
      isEditMode: false,
    })
  },

  finishEditingAndMove: (direction) => {
    const state = get()
    if (!state.editingCell) return

    // Save the current cell
    get().setCellValue(state.editingCell.row, state.editingCell.col, state.editValue)
    
    const activeSheet = state.sheets.find((s) => s.id === state.activeSheetId)
    if (!activeSheet) return

    const { rows, columns } = activeSheet.data
    let newRow = state.editingCell.row
    let newCol = state.editingCell.col

    // Calculate new position
    switch (direction) {
      case 'down':
        if (newRow < rows - 1) newRow++
        break
      case 'up':
        if (newRow > 0) newRow--
        break
      case 'right':
        if (newCol < columns - 1) newCol++
        break
      case 'left':
        if (newCol > 0) newCol--
        break
    }

    // Move to new cell and immediately start editing
    const cellRef = toA1Notation(newRow, newCol)
    const cellData = activeSheet.data.cells[cellRef]
    const cellValue = cellData?.formula || cellData?.value?.toString() || ''

    set({
      selectedCell: { row: newRow, col: newCol },
      editingCell: { row: newRow, col: newCol },
      editValue: cellValue,
      isEditMode: true,
    })
  },

  cancelEditing: () => {
    set({
      editingCell: null,
      editValue: '',
      isEditMode: false,
    })
  },

  copy: () => {
    const state = get()
    if (!state.selectedCell && !state.selectedRange) return

    const activeSheet = state.sheets.find((s) => s.id === state.activeSheetId)
    if (!activeSheet) return

    const cells: { data: CellData; position: CellPosition }[] = []

    if (state.selectedCell) {
      const cellRef = toA1Notation(state.selectedCell.row, state.selectedCell.col)
      const cellData = activeSheet.data.cells[cellRef] || { value: null, formula: undefined }
      cells.push({ data: cellData, position: state.selectedCell })
    } else if (state.selectedRange) {
      for (let row = state.selectedRange.start.row; row <= state.selectedRange.end.row; row++) {
        for (let col = state.selectedRange.start.col; col <= state.selectedRange.end.col; col++) {
          const cellRef = toA1Notation(row, col)
          const cellData = activeSheet.data.cells[cellRef] || { value: null, formula: undefined }
          cells.push({ data: cellData, position: { row, col } })
        }
      }
    }

    console.log('Copied cells:', cells)
    set({ copiedCells: cells, cutCells: null })

    // Copy to browser clipboard (plain text)
    if (cells.length > 0) {
      const textToCopy = cells.map(({ data }) => {
        return data.formula || data.value?.toString() || ''
      }).join('\t')
      
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        navigator.clipboard.writeText(textToCopy).catch(err => {
          console.error('Failed to copy to clipboard:', err)
        })
      }
    }
  },

  cut: () => {
    get().copy()
    const state = get()
    set({ cutCells: state.copiedCells, copiedCells: null })
  },

  paste: async (forceTranspose = false) => {
    const state = get()
    console.log('Paste triggered, selectedCell:', state.selectedCell, 'selectedRange:', state.selectedRange, 'forceTranspose:', forceTranspose)
    
    // Get the target cell - either the selected cell or the start of the selected range
    let targetCell = state.selectedCell
    if (!targetCell && state.selectedRange) {
      targetCell = state.selectedRange.start
    }
    
    if (!targetCell) {
      console.log('No selected cell or range, aborting paste')
      return
    }

    // Try to paste from browser clipboard first
    let clipboardText = ''
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      try {
        clipboardText = await navigator.clipboard.readText()
      } catch (err) {
        console.error('Failed to read from clipboard:', err)
      }
    }

    // If clipboard has text and no internal copied cells, paste from clipboard
    if (clipboardText && !state.copiedCells && !state.cutCells) {
      console.log('Pasting from browser clipboard:', clipboardText)
      const value = clipboardText.trim()
      const { row, col } = targetCell
      get().setCellValue(row, col, value)
      return
    }

    // Otherwise use internal copy/paste
    const cells = state.copiedCells || state.cutCells
    console.log('Pasting from internal clipboard, cells:', cells)
    if (!cells) {
      console.log('No copied cells, aborting paste')
      return
    }

    // Calculate dimensions of copied data
    const minRow = Math.min(...cells.map(c => c.position.row))
    const maxRow = Math.max(...cells.map(c => c.position.row))
    const minCol = Math.min(...cells.map(c => c.position.col))
    const maxCol = Math.max(...cells.map(c => c.position.col))
    
    const copiedRows = maxRow - minRow + 1
    const copiedCols = maxCol - minCol + 1
    
    console.log(`Copied dimensions: ${copiedRows} rows × ${copiedCols} cols`)
    
    // Check if we should transpose (copy rows to columns or columns to rows)
    let shouldTranspose = forceTranspose
    
    // Auto-detect transpose: if copied is a row (1×N) or column (N×1), and it's not a single cell
    const isCopiedRow = copiedRows === 1 && copiedCols > 1
    const isCopiedColumn = copiedCols === 1 && copiedRows > 1
    
    if (!forceTranspose) {
      // If selecting a range while pasting
      if (state.selectedRange) {
        const selectedRows = state.selectedRange.end.row - state.selectedRange.start.row + 1
        const selectedCols = state.selectedRange.end.col - state.selectedRange.start.col + 1
        
        console.log(`Selected dimensions: ${selectedRows} rows × ${selectedCols} cols`)
        
        // Transpose if dimensions are swapped (rows → columns or columns → rows)
        if (copiedRows === selectedCols && copiedCols === selectedRows && 
            (copiedRows !== copiedCols)) { // Don't transpose squares
          shouldTranspose = true
          console.log('Transpose detected: dimensions are swapped')
        }
      }
    }
    
    if (shouldTranspose) {
      console.log('✓ Pasting with TRANSPOSE')
    } else {
      console.log('→ Pasting normally')
    }

    if (shouldTranspose) {
      // Paste with transpose
      cells.forEach(({ data, position }) => {
        // Calculate relative position in source
        const relRow = position.row - minRow
        const relCol = position.col - minCol
        
        // Transpose: swap row and column offsets
        const newRow = targetCell.row + relCol
        const newCol = targetCell.col + relRow
        const newCellRef = toA1Notation(newRow, newCol)

        set(
          produce((state: SpreadsheetStore) => {
            const sheet = state.sheets.find((s) => s.id === state.activeSheetId)
            if (!sheet) return

            sheet.data.cells[newCellRef] = JSON.parse(JSON.stringify(data))
            state.isDirty = true
          })
        )
      })
    } else {
      // Normal paste without transpose
      const offsetRow = targetCell.row - cells[0].position.row
      const offsetCol = targetCell.col - cells[0].position.col

      cells.forEach(({ data, position }) => {
        const newRow = position.row + offsetRow
        const newCol = position.col + offsetCol
        const newCellRef = toA1Notation(newRow, newCol)

        set(
          produce((state: SpreadsheetStore) => {
            const sheet = state.sheets.find((s) => s.id === state.activeSheetId)
            if (!sheet) return

            sheet.data.cells[newCellRef] = JSON.parse(JSON.stringify(data))
            state.isDirty = true
          })
        )
      })
    }

    // If it was a cut operation, clear the original cells
    if (state.cutCells) {
      state.cutCells.forEach(({ position }) => {
        const cellRef = toA1Notation(position.row, position.col)
        set(
          produce((state: SpreadsheetStore) => {
            const sheet = state.sheets.find((s) => s.id === state.activeSheetId)
            if (!sheet) return
            delete sheet.data.cells[cellRef]
          })
        )
      })
      set({ cutCells: null })
    }
  },

  setRowHeight: (row, height) => {
    set(
      produce((state: SpreadsheetStore) => {
        const sheet = state.sheets.find((s) => s.id === state.activeSheetId)
        if (!sheet) return
        sheet.data.rowHeights[row] = height
        state.isDirty = true
      })
    )
  },

  setColumnWidth: (col, width) => {
    set(
      produce((state: SpreadsheetStore) => {
        const sheet = state.sheets.find((s) => s.id === state.activeSheetId)
        if (!sheet) return
        sheet.data.columnWidths[col] = width
        state.isDirty = true
      })
    )
  },

  insertRow: (row) => {
    set(
      produce((state: SpreadsheetStore) => {
        const sheet = state.sheets.find((s) => s.id === state.activeSheetId)
        if (!sheet) return
        sheet.data.rows++
        // TODO: Shift cell references
        state.isDirty = true
      })
    )
  },

  deleteRow: (row) => {
    set(
      produce((state: SpreadsheetStore) => {
        const sheet = state.sheets.find((s) => s.id === state.activeSheetId)
        if (!sheet) return
        sheet.data.rows--
        // TODO: Remove cells and shift references
        state.isDirty = true
      })
    )
  },

  insertColumn: (col) => {
    set(
      produce((state: SpreadsheetStore) => {
        const sheet = state.sheets.find((s) => s.id === state.activeSheetId)
        if (!sheet) return
        sheet.data.columns++
        state.isDirty = true
      })
    )
  },

  deleteColumn: (col) => {
    set(
      produce((state: SpreadsheetStore) => {
        const sheet = state.sheets.find((s) => s.id === state.activeSheetId)
        if (!sheet) return
        sheet.data.columns--
        state.isDirty = true
      })
    )
  },

  setFrozenRows: (rows) => {
    set(
      produce((state: SpreadsheetStore) => {
        const sheet = state.sheets.find((s) => s.id === state.activeSheetId)
        if (!sheet) return
        sheet.data.frozenRows = rows
        state.isDirty = true
      })
    )
  },

  setFrozenColumns: (columns) => {
    set(
      produce((state: SpreadsheetStore) => {
        const sheet = state.sheets.find((s) => s.id === state.activeSheetId)
        if (!sheet) return
        sheet.data.frozenColumns = columns
        state.isDirty = true
      })
    )
  },

  undo: () => {
    const state = get()
    if (state.historyIndex <= 0) return

    const previousState = state.history[state.historyIndex - 1]
    set({
      sheets: JSON.parse(JSON.stringify(previousState.sheets)),
      activeSheetId: previousState.activeSheetId,
      historyIndex: state.historyIndex - 1,
      isDirty: true,
    })
  },

  redo: () => {
    const state = get()
    if (state.historyIndex >= state.history.length - 1) return

    const nextState = state.history[state.historyIndex + 1]
    set({
      sheets: JSON.parse(JSON.stringify(nextState.sheets)),
      activeSheetId: nextState.activeSheetId,
      historyIndex: state.historyIndex + 1,
      isDirty: true,
    })
  },

  canUndo: () => get().historyIndex > 0,
  canRedo: () => get().historyIndex < get().history.length - 1,

  markSaved: () => {
    set({ isDirty: false, lastSaved: new Date() })
  },

  setZoom: (zoom) => {
    set({ zoom: Math.max(25, Math.min(400, zoom)) })
  },

  sortColumn: (col, ascending, sortType?: 'text' | 'numeric' | 'date') => {
    set(
      produce((state: SpreadsheetStore) => {
        const sheet = state.sheets.find((s) => s.id === state.activeSheetId)
        if (!sheet) return

        // Helper: Detect if value is a date
        const isDateValue = (val: any): boolean => {
          if (!val) return false
          const datePatterns = [
            /^\d{4}-\d{2}-\d{2}/, // YYYY-MM-DD
            /^\d{1,2}\/\d{1,2}\/\d{2,4}/, // MM/DD/YYYY or DD/MM/YYYY
            /^\d{1,2}-\d{1,2}-\d{2,4}/, // MM-DD-YYYY
          ]
          const str = String(val)
          return datePatterns.some(p => p.test(str)) || !isNaN(Date.parse(str))
        }

        // Helper: Parse date value
        const parseDateValue = (val: any): number => {
          return new Date(val).getTime()
        }

        // Get all cell values in the column with their row indices
        const cellsWithRows: Array<{ row: number; value: any; originalCells: Record<string, CellData> }> = []
        
        for (let row = 0; row < sheet.data.rows; row++) {
          const cellRef = `${numberToColumn(col)}${row + 1}`
          const cellData = sheet.data.cells[cellRef]
          const value = cellData?.value ?? ''
          
          // Store all cells in this row
          const originalCells: Record<string, CellData> = {}
          for (let c = 0; c < sheet.data.columns; c++) {
            const ref = `${numberToColumn(c)}${row + 1}`
            if (sheet.data.cells[ref]) {
              originalCells[ref] = { ...sheet.data.cells[ref] }
            }
          }
          
          cellsWithRows.push({ row, value, originalCells })
        }

        // Auto-detect sort type if not provided
        if (!sortType) {
          const nonEmptyValues = cellsWithRows.filter(r => r.value !== '').map(r => r.value)
          const numericCount = nonEmptyValues.filter(v => !isNaN(Number(v))).length
          const dateCount = nonEmptyValues.filter(v => isDateValue(v)).length
          
          if (dateCount / nonEmptyValues.length > 0.5) {
            sortType = 'date'
          } else if (numericCount / nonEmptyValues.length > 0.5) {
            sortType = 'numeric'
          } else {
            sortType = 'text'
          }
        }
        
        // Sort the rows based on the column values and type
        cellsWithRows.sort((a, b) => {
          const aVal = a.value
          const bVal = b.value
          
          // Handle empty values
          if (aVal === '' && bVal === '') return 0
          if (aVal === '') return ascending ? 1 : -1
          if (bVal === '') return ascending ? -1 : 1
          
          if (sortType === 'numeric') {
            const aNum = typeof aVal === 'number' ? aVal : parseFloat(String(aVal))
            const bNum = typeof bVal === 'number' ? bVal : parseFloat(String(bVal))
            
            if (!isNaN(aNum) && !isNaN(bNum)) {
              return ascending ? aNum - bNum : bNum - aNum
            }
            // Fall back to string comparison for non-numeric values
          } else if (sortType === 'date') {
            const aDate = parseDateValue(aVal)
            const bDate = parseDateValue(bVal)
            
            if (!isNaN(aDate) && !isNaN(bDate)) {
              return ascending ? aDate - bDate : bDate - aDate
            }
          }
          
          // Default: String comparison
          const aStr = String(aVal).toLowerCase()
          const bStr = String(bVal).toLowerCase()
          return ascending ? aStr.localeCompare(bStr) : bStr.localeCompare(aStr)
        })
        
        // Clear existing cells and rowHeights
        const newCells: Record<string, CellData> = {}
        const newRowHeights: Record<number, number> = {}
        
        // Rewrite cells in sorted order, updating formulas
        cellsWithRows.forEach((item, newRow) => {
          // Copy row height
          if (sheet.data.rowHeights[item.row]) {
            newRowHeights[newRow] = sheet.data.rowHeights[item.row]
          }
          
          Object.entries(item.originalCells).forEach(([oldRef, cellData]) => {
            const parsed = parseA1Notation(oldRef)
            if (!parsed) return
            const { row: oldRow, col: cellCol } = parsed
            const newRef = `${numberToColumn(cellCol)}${newRow + 1}`
            
            // Update cell data with formula adjustments
            const updatedCell = { ...cellData }
            if (updatedCell.formula) {
              // Update relative references in formulas
              // This is a simplified version - full implementation would need proper formula parsing
              updatedCell.formula = updatedCell.formula.replace(/([A-Z]+)(\d+)/g, (match, colStr, rowStr) => {
                const oldFormulaRow = parseInt(rowStr) - 1
                // Find where this row moved to
                const movedToIndex = cellsWithRows.findIndex(r => r.row === oldFormulaRow)
                if (movedToIndex !== -1) {
                  return `${colStr}${movedToIndex + 1}`
                }
                return match
              })
            }
            
            newCells[newRef] = updatedCell
          })
        })
        
        sheet.data.cells = newCells
        sheet.data.rowHeights = newRowHeights
        state.isDirty = true
      })
    )
  },

  getSpreadsheetData: () => {
    const state = get()
    return {
      sheets: state.sheets,
      activeSheetId: state.activeSheetId,
    }
  },
}))
