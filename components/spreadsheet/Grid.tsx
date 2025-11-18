'use client'

import React, { useRef } from 'react'
import { useSpreadsheetStore } from '@/lib/store/spreadsheetStore'
import Cell from '@/components/spreadsheet/Cell'
import { numberToColumn } from '@/lib/formulas/utils'
import { useHotkeys } from 'react-hotkeys-hook'

const DEFAULT_ROW_HEIGHT = 26
const DEFAULT_COLUMN_WIDTH = 100
const HEADER_HEIGHT = 30
const HEADER_WIDTH = 50

export default function Grid() {
  const containerRef = useRef<HTMLDivElement>(null)
  const [resizingColumn, setResizingColumn] = React.useState<number | null>(null)
  const [resizeStartX, setResizeStartX] = React.useState<number>(0)
  const [resizeStartWidth, setResizeStartWidth] = React.useState<number>(0)
  const [resizingRow, setResizingRow] = React.useState<number | null>(null)
  const [resizeStartY, setResizeStartY] = React.useState<number>(0)
  const [resizeStartHeight, setResizeStartHeight] = React.useState<number>(0)
  const [viewportHeight, setViewportHeight] = React.useState<number>(0)
  const [viewportWidth, setViewportWidth] = React.useState<number>(0)
  const [isFilling, setIsFilling] = React.useState(false)
  const [fillStartCell, setFillStartCell] = React.useState<{ row: number; col: number } | null>(null)
  const [fillEndCell, setFillEndCell] = React.useState<{ row: number; col: number } | null>(null)
  const [sortMenuColumn, setSortMenuColumn] = React.useState<number | null>(null)
  const [sortMenuPosition, setSortMenuPosition] = React.useState<{ x: number; y: number } | null>(null)
  const [sortedColumn, setSortedColumn] = React.useState<number | null>(null)
  const [sortDirection, setSortDirection] = React.useState<'asc' | 'desc'>('asc')
  
  // Drag selection state
  const [isSelecting, setIsSelecting] = React.useState(false)
  const [selectionStart, setSelectionStart] = React.useState<{ row: number; col: number } | null>(null)
  const [selectionEnd, setSelectionEnd] = React.useState<{ row: number; col: number } | null>(null)
  
  const {
    sheets,
    activeSheetId,
    selectedCell,
    selectedRange,
    editingCell,
    selectCell,
    selectRange,
    selectRow,
    selectColumn,
    startEditing,
    copy,
    cut,
    paste,
    undo,
    redo,
    setColumnWidth,
    setRowHeight,
    getCellData,
    setCellStyle,
    setCellValue,
    zoom,
    sortColumn,
    finishEditingAndMove,
  } = useSpreadsheetStore()

  // Track cell heights for each row to find the tallest cell
  const cellHeightsRef = useRef<Map<number, Map<number, number>>>(new Map())

  const handleCellHeightChange = (row: number, col: number, height: number) => {
    // Get or create row map
    let rowMap = cellHeightsRef.current.get(row)
    if (!rowMap) {
      rowMap = new Map()
      cellHeightsRef.current.set(row, rowMap)
    }
    
    // Update this cell's height
    rowMap.set(col, height)
    
    // Find the tallest cell in this row
    let maxHeight = DEFAULT_ROW_HEIGHT
    rowMap.forEach((h) => {
      maxHeight = Math.max(maxHeight, h)
    })
    
    // Update row height if it changed
    const currentRowHeight = getRowHeight(row)
    if (maxHeight !== currentRowHeight) {
      setRowHeight(row, maxHeight)
    }
  }

  const activeSheet = sheets.find((s) => s.id === activeSheetId)
  if (!activeSheet) return null

  const { rows, columns, rowHeights, columnWidths } = activeSheet.data
  const frozenRows = activeSheet.data.frozenRows || 0
  const frozenColumns = activeSheet.data.frozenColumns || 0

  // Helper functions for dimensions
  const getRowHeight = (row: number) => rowHeights[row] || DEFAULT_ROW_HEIGHT
  const getColumnWidth = (col: number) => columnWidths[col] || DEFAULT_COLUMN_WIDTH

  // Calculate total grid dimensions (memoized for performance)
  const totalGridHeight = React.useMemo(() => {
    let totalHeight = HEADER_HEIGHT
    for (let i = 0; i < rows; i++) {
      totalHeight += getRowHeight(i)
    }
    return totalHeight
  }, [rowHeights, rows, getRowHeight])

  const totalGridWidth = React.useMemo(() => {
    let totalWidth = HEADER_WIDTH
    for (let i = 0; i < columns; i++) {
      totalWidth += getColumnWidth(i)
    }
    return totalWidth
  }, [columnWidths, columns, getColumnWidth])

  // Track viewport dimensions for dynamic expansion threshold
  React.useEffect(() => {
    const updateViewportDimensions = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect()
        setViewportHeight(rect.height)
        setViewportWidth(rect.width)
      }
    }
    
    updateViewportDimensions()
    
    // Update on window resize
    window.addEventListener('resize', updateViewportDimensions)
    
    // Update when grid dimensions change (with slight delay for layout to settle)
    const timeoutId = setTimeout(updateViewportDimensions, 50)
    
    return () => {
      window.removeEventListener('resize', updateViewportDimensions)
      clearTimeout(timeoutId)
    }
  }, [totalGridHeight, totalGridWidth])

  // Clear cell height cache when column widths change to force recalculation
  React.useEffect(() => {
    // Column width changes affect text wrapping, so we need to remeasure
    cellHeightsRef.current.clear()
  }, [columnWidths])

  // Direct keyboard event listener for copy/paste (more reliable than useHotkeys)
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0
      const ctrlOrCmd = isMac ? e.metaKey : e.ctrlKey

      // Copy: Ctrl+C or Cmd+C
      if (ctrlOrCmd && e.key === 'c') {
        console.log('Copy triggered via keyboard event')
        e.preventDefault()
        copy()
      }
      
      // Cut: Ctrl+X or Cmd+X
      if (ctrlOrCmd && e.key === 'x') {
        console.log('Cut triggered via keyboard event')
        e.preventDefault()
        cut()
      }
      
      // Paste: Ctrl+V or Cmd+V
      if (ctrlOrCmd && e.key === 'v' && !e.shiftKey) {
        console.log('Paste triggered via keyboard event')
        e.preventDefault()
        paste().catch(err => console.error('Paste error:', err))
      }
      
      // Paste with Transpose: Shift+Ctrl+V or Shift+Cmd+V
      if (ctrlOrCmd && e.shiftKey && e.key === 'V') {
        console.log('Paste TRANSPOSE triggered via keyboard event')
        e.preventDefault()
        paste(true).catch(err => console.error('Paste transpose error:', err))
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [copy, cut, paste])

  useHotkeys('ctrl+z, cmd+z', (e) => {
    e.preventDefault()
    undo()
  })

  useHotkeys('ctrl+y, cmd+y, ctrl+shift+z, cmd+shift+z', (e) => {
    e.preventDefault()
    redo()
  })

  useHotkeys('enter', (e) => {
    const isEditing = useSpreadsheetStore.getState().editingCell
    // Only handle Enter when NOT editing - let Cell component handle it during edit
    if (!isEditing && selectedCell) {
      e.preventDefault()
      startEditing(selectedCell.row, selectedCell.col)
    }
  })

  useHotkeys('f2', (e) => {
    if (selectedCell && !useSpreadsheetStore.getState().editingCell) {
      e.preventDefault()
      startEditing(selectedCell.row, selectedCell.col)
    }
  })

  useHotkeys('escape', () => {
    if (useSpreadsheetStore.getState().editingCell) {
      useSpreadsheetStore.getState().cancelEditing()
    }
  })

  // Arrow key navigation
  useHotkeys('up', (e) => {
    if (!useSpreadsheetStore.getState().editingCell && selectedCell && selectedCell.row > 0) {
      e.preventDefault()
      selectCell(selectedCell.row - 1, selectedCell.col)
    }
  })

  useHotkeys('down', (e) => {
    if (!useSpreadsheetStore.getState().editingCell && selectedCell && selectedCell.row < rows - 1) {
      e.preventDefault()
      selectCell(selectedCell.row + 1, selectedCell.col)
    }
  })

  useHotkeys('left', (e) => {
    if (!useSpreadsheetStore.getState().editingCell && selectedCell && selectedCell.col > 0) {
      e.preventDefault()
      selectCell(selectedCell.row, selectedCell.col - 1)
    }
  })

  useHotkeys('right', (e) => {
    if (!useSpreadsheetStore.getState().editingCell && selectedCell && selectedCell.col < columns - 1) {
      e.preventDefault()
      selectCell(selectedCell.row, selectedCell.col + 1)
    }
  })

  // Tab navigation (move right, Shift+Tab move left) - with auto-edit
  useHotkeys('tab', (e) => {
    const isEditing = useSpreadsheetStore.getState().editingCell
    // Only handle Tab when NOT editing - let Cell component handle it during edit
    if (!isEditing && selectedCell) {
      e.preventDefault()
      if (e.shiftKey) {
        if (selectedCell.col > 0) {
          const newCol = selectedCell.col - 1
          selectCell(selectedCell.row, newCol)
          setTimeout(() => startEditing(selectedCell.row, newCol), 0)
        }
      } else {
        if (selectedCell.col < columns - 1) {
          const newCol = selectedCell.col + 1
          selectCell(selectedCell.row, newCol)
          setTimeout(() => startEditing(selectedCell.row, newCol), 0)
        }
      }
    }
  })

  // Formatting shortcuts
  useHotkeys('ctrl+b, cmd+b', (e) => {
    if (selectedCell) {
      e.preventDefault()
      const currentStyle = getCellData(selectedCell.row, selectedCell.col)?.style
      setCellStyle(selectedCell.row, selectedCell.col, { bold: !currentStyle?.bold })
    }
  })

  useHotkeys('ctrl+i, cmd+i', (e) => {
    if (selectedCell) {
      e.preventDefault()
      const currentStyle = getCellData(selectedCell.row, selectedCell.col)?.style
      setCellStyle(selectedCell.row, selectedCell.col, { italic: !currentStyle?.italic })
    }
  })

  useHotkeys('ctrl+u, cmd+u', (e) => {
    if (selectedCell) {
      e.preventDefault()
      const currentStyle = getCellData(selectedCell.row, selectedCell.col)?.style
      setCellStyle(selectedCell.row, selectedCell.col, { underline: !currentStyle?.underline })
    }
  })

  // Delete key to clear cell(s)
  useHotkeys('delete, backspace', (e) => {
    if (!useSpreadsheetStore.getState().editingCell) {
      e.preventDefault()
      
      // Clear all cells in the selected range
      if (selectedRange) {
        const minRow = Math.min(selectedRange.start.row, selectedRange.end.row)
        const maxRow = Math.max(selectedRange.start.row, selectedRange.end.row)
        const minCol = Math.min(selectedRange.start.col, selectedRange.end.col)
        const maxCol = Math.max(selectedRange.start.col, selectedRange.end.col)
        
        for (let row = minRow; row <= maxRow; row++) {
          for (let col = minCol; col <= maxCol; col++) {
            setCellValue(row, col, '')
          }
        }
      } else if (selectedCell) {
        setCellValue(selectedCell.row, selectedCell.col, '')
      }
    }
  })

  const getRowTop = (row: number) => {
    let top = HEADER_HEIGHT
    for (let i = 0; i < row; i++) {
      top += getRowHeight(i)
    }
    return top
  }

  const getColumnLeft = (col: number) => {
    let left = HEADER_WIDTH
    for (let i = 0; i < col; i++) {
      left += getColumnWidth(i)
    }
    return left
  }

  const handleColumnResizeStart = (col: number, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setResizingColumn(col)
    setResizeStartX(e.clientX)
    setResizeStartWidth(getColumnWidth(col))
  }

  const handleColumnResizeMove = (e: MouseEvent) => {
    if (resizingColumn === null) return
    const diff = e.clientX - resizeStartX
    const newWidth = Math.max(50, resizeStartWidth + diff)
    setColumnWidth(resizingColumn, newWidth)
  }

  const handleColumnResizeEnd = () => {
    setResizingColumn(null)
  }

  const handleRowResizeStart = (row: number, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setResizingRow(row)
    setResizeStartY(e.clientY)
    setResizeStartHeight(getRowHeight(row))
  }

  const handleRowResizeMove = (e: MouseEvent) => {
    if (resizingRow === null) return
    const diff = e.clientY - resizeStartY
    const newHeight = Math.max(20, resizeStartHeight + diff)
    setRowHeight(resizingRow, newHeight)
  }

  const handleRowResizeEnd = () => {
    setResizingRow(null)
  }

  const handleRowAutoFit = (row: number, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    // Measure content height for all cells in this row
    let maxHeight = DEFAULT_ROW_HEIGHT
    
    for (let col = 0; col < columns; col++) {
      const cellRef = `${numberToColumn(col)}${row + 1}`
      const cellData = activeSheet.data.cells[cellRef]
      if (!cellData || !cellData.value) continue
      
      // Create temporary measurement div
      const measureDiv = document.createElement('div')
      measureDiv.style.position = 'absolute'
      measureDiv.style.visibility = 'hidden'
      measureDiv.style.width = `${getColumnWidth(col) - 8}px`
      measureDiv.style.whiteSpace = 'normal'
      measureDiv.style.wordBreak = 'break-word'
      measureDiv.style.fontSize = cellData.style?.fontSize ? `${cellData.style.fontSize}px` : '11px'
      measureDiv.style.lineHeight = '1'
      measureDiv.textContent = String(cellData.value)
      
      document.body.appendChild(measureDiv)
      const measuredHeight = measureDiv.scrollHeight
      document.body.removeChild(measureDiv)
      
      maxHeight = Math.max(maxHeight, measuredHeight)
    }
    
    setRowHeight(row, maxHeight)
  }

  const handleColumnAutoFit = (col: number, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    // Measure content width for this column
    let maxWidth = 50 // minimum width
    const canvas = document.createElement('canvas')
    const context = canvas.getContext('2d')
    if (!context) return
    
    // Use the same font as cells
    context.font = '11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    
    // Check all rows in this column
    for (let row = 0; row < rows; row++) {
      const cellRef = `${numberToColumn(col)}${row + 1}`
      const cellData = activeSheet.data.cells[cellRef]
      if (!cellData) continue
      
      const displayValue = cellData.formula || cellData.value?.toString() || ''
      if (displayValue) {
        const metrics = context.measureText(displayValue)
        const cellWidth = Math.ceil(metrics.width) + 24 // padding + some extra space
        maxWidth = Math.max(maxWidth, cellWidth)
      }
    }
    
    // Cap at reasonable maximum
    maxWidth = Math.min(maxWidth, 400)
    setColumnWidth(col, maxWidth)
  }

  // Drag selection handlers
  const handleCellMouseDown = (row: number, col: number, e: React.MouseEvent) => {
    // Don't interfere with editing or fill handle
    if (editingCell) return
    
    setIsSelecting(true)
    setSelectionStart({ row, col })
    setSelectionEnd({ row, col })
    selectCell(row, col)
  }

  const handleCellMouseEnter = (row: number, col: number) => {
    if (!isSelecting) return
    
    setSelectionEnd({ row, col })
  }

  const handleMouseUp = () => {
    if (!isSelecting) return
    
    setIsSelecting(false)
    
    // If we dragged to create a range, apply it to the store
    if (selectionStart && selectionEnd) {
      const startRow = selectionStart.row
      const startCol = selectionStart.col
      const endRow = selectionEnd.row
      const endCol = selectionEnd.col
      
      // Only create a range if we selected more than one cell
      if (startRow !== endRow || startCol !== endCol) {
        selectRange(
          { row: startRow, col: startCol },
          { row: endRow, col: endCol }
        )
      }
    }
  }

  // Excel-style autofill handle functions
  const handleFillStart = (row: number, col: number, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsFilling(true)
    setFillStartCell({ row, col })
    setFillEndCell({ row, col })
    // Add class to body for crosshair cursor during drag
    document.body.classList.add('dragging-fill')
  }

  const handleFillMove = (e: MouseEvent) => {
    if (!isFilling || !fillStartCell || !containerRef.current) return
    
    const rect = containerRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left - HEADER_WIDTH
    const y = e.clientY - rect.top - HEADER_HEIGHT
    
    // Find which cell the mouse is over
    let currentCol = fillStartCell.col
    let currentRow = fillStartCell.row
    let accumulatedWidth = 0
    let accumulatedHeight = 0
    
    // Find column
    for (let col = 0; col < columns; col++) {
      const colWidth = getColumnWidth(col)
      if (x < accumulatedWidth + colWidth) {
        currentCol = col
        break
      }
      accumulatedWidth += colWidth
    }
    
    // Find row
    for (let row = 0; row < rows; row++) {
      const rowHeight = getRowHeight(row)
      if (y < accumulatedHeight + rowHeight) {
        currentRow = row
        break
      }
      accumulatedHeight += rowHeight
    }
    
    setFillEndCell({ row: currentRow, col: currentCol })
  }

  const handleFillEnd = () => {
    if (!isFilling || !fillStartCell || !fillEndCell) {
      setIsFilling(false)
      return
    }

    // Perform the fill operation
    const sourceCell = getCellData(fillStartCell.row, fillStartCell.col)
    if (!sourceCell) {
      setIsFilling(false)
      return
    }

    const minRow = Math.min(fillStartCell.row, fillEndCell.row)
    const maxRow = Math.max(fillStartCell.row, fillEndCell.row)
    const minCol = Math.min(fillStartCell.col, fillEndCell.col)
    const maxCol = Math.max(fillStartCell.col, fillEndCell.col)

    // Determine fill direction
    const isVertical = fillEndCell.row !== fillStartCell.row
    const isHorizontal = fillEndCell.col !== fillStartCell.col

    // Helper: Detect pattern type and fill accordingly
    const detectAndFill = (startValue: any, index: number, isVertical: boolean) => {
      const valueStr = String(startValue || '')
      
      // 1. Formula detection and adjustment
      if (valueStr.startsWith('=')) {
        // Parse formula and adjust relative references
        const adjustedFormula = valueStr.replace(/([A-Z]+)(\d+)/g, (match, colStr, rowStr) => {
          // Check if it's absolute reference ($A$1, $A1, A$1)
          const hasAbsoluteCol = valueStr.includes('$' + colStr)
          const hasAbsoluteRow = valueStr.includes(colStr + '$' + rowStr)
          
          if (hasAbsoluteCol && hasAbsoluteRow) {
            return match // Both absolute
          }
          
          let newCol = colStr
          let newRow = parseInt(rowStr)
          
          if (!hasAbsoluteCol && !isVertical) {
            // Adjust column for horizontal fill
            const colNum = colStr.charCodeAt(0) - 65
            const newColNum = colNum + index
            newCol = String.fromCharCode(65 + newColNum)
          }
          
          if (!hasAbsoluteRow && isVertical) {
            // Adjust row for vertical fill
            newRow += index
          }
          
          return newCol + newRow
        })
        return adjustedFormula
      }
      
      // 2. Date detection and increment
      const datePatterns = [
        /^\d{4}-\d{2}-\d{2}/, // YYYY-MM-DD
        /^\d{1,2}\/\d{1,2}\/\d{2,4}/, // MM/DD/YYYY
      ]
      
      const isDate = datePatterns.some(p => p.test(valueStr)) || !isNaN(Date.parse(valueStr))
      if (isDate && valueStr.trim() !== '') {
        const date = new Date(valueStr)
        if (!isNaN(date.getTime())) {
          date.setDate(date.getDate() + index)
          return date.toISOString().split('T')[0] // Return YYYY-MM-DD format
        }
      }
      
      // 3. Text + Number pattern (e.g., "Item 1", "Task 5")
      const textNumberMatch = valueStr.match(/^(.*\D)(\d+)$/)
      if (textNumberMatch) {
        const [, text, num] = textNumberMatch
        return text + (parseInt(num) + index)
      }
      
      // 4. Pure number with pattern detection
      if (!isNaN(Number(valueStr)) && valueStr.trim() !== '') {
        return Number(valueStr) + index
      }
      
      // 5. Default: copy value
      return valueStr
    }

    // Fill cells
    for (let row = minRow; row <= maxRow; row++) {
      for (let col = minCol; col <= maxCol; col++) {
        if (row === fillStartCell.row && col === fillStartCell.col) continue
        
        // Calculate index for pattern detection
        const indexVertical = row - fillStartCell.row
        const indexHorizontal = col - fillStartCell.col
        const index = isVertical ? indexVertical : indexHorizontal
        
        // Get the appropriate value based on pattern
        const newValue = detectAndFill(sourceCell.value, index, isVertical)
        setCellValue(row, col, String(newValue))
        
        // Copy style from source cell
        if (sourceCell.style) {
          setCellStyle(row, col, sourceCell.style)
        }
      }
    }

    // Recalculate formulas after fill
    // This will be handled automatically by the store's formula calculation

    // Select the entire filled range BEFORE cleanup
    // This ensures the range selection persists
    selectRange(
      { row: minRow, col: minCol },
      { row: maxRow, col: maxCol }
    )

    // Clean up fill state
    setIsFilling(false)
    setFillStartCell(null)
    setFillEndCell(null)
    // Remove crosshair cursor class
    document.body.classList.remove('dragging-fill')
  }

  React.useEffect(() => {
    if (resizingColumn !== null) {
      document.addEventListener('mousemove', handleColumnResizeMove)
      document.addEventListener('mouseup', handleColumnResizeEnd)
      return () => {
        document.removeEventListener('mousemove', handleColumnResizeMove)
        document.removeEventListener('mouseup', handleColumnResizeEnd)
      }
    }
  }, [resizingColumn, resizeStartX, resizeStartWidth])

  React.useEffect(() => {
    if (resizingRow !== null) {
      document.addEventListener('mousemove', handleRowResizeMove)
      document.addEventListener('mouseup', handleRowResizeEnd)
      return () => {
        document.removeEventListener('mousemove', handleRowResizeMove)
        document.removeEventListener('mouseup', handleRowResizeEnd)
      }
    }
  }, [resizingRow, resizeStartY, resizeStartHeight])

  React.useEffect(() => {
    if (isSelecting) {
      document.addEventListener('mouseup', handleMouseUp)
      return () => {
        document.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [isSelecting, selectionStart, selectionEnd])

  React.useEffect(() => {
    if (isFilling) {
      document.addEventListener('mousemove', handleFillMove)
      document.addEventListener('mouseup', handleFillEnd)
      return () => {
        document.removeEventListener('mousemove', handleFillMove)
        document.removeEventListener('mouseup', handleFillEnd)
        // Cleanup: remove crosshair cursor class if component unmounts during drag
        document.body.classList.remove('dragging-fill')
      }
    }
  }, [isFilling, fillStartCell, fillEndCell])

  // Excel-like behavior: Allow vertical expansion with threshold before showing scrollbar
  const VERTICAL_THRESHOLD = 300 // Extra space before scrollbar appears
  const HORIZONTAL_THRESHOLD = 200 // Extra space for horizontal before scrollbar
  const shouldShowVerticalScroll = totalGridHeight > (viewportHeight + VERTICAL_THRESHOLD)
  const shouldShowHorizontalScroll = totalGridWidth > (viewportWidth + HORIZONTAL_THRESHOLD)
  
  // Dynamic container style: grow naturally until threshold, then enable scroll
  const containerStyle: React.CSSProperties = {
    overflow: shouldShowVerticalScroll || shouldShowHorizontalScroll ? 'auto' : 'visible',
    maxHeight: shouldShowVerticalScroll ? '100%' : 'none',
  }

  return (
    <div 
      className="spreadsheet-grid flex-1 relative bg-white" 
      ref={containerRef}
      style={containerStyle}
    >
      <div style={{ 
        minHeight: totalGridHeight, 
        minWidth: totalGridWidth, 
        position: 'relative',
        transform: `scale(${zoom / 100})`,
        transformOrigin: 'top left',
        width: `${100 / (zoom / 100)}%`,
        height: `${100 / (zoom / 100)}%`,
      }}>
        {/* Column headers */}
        <div className="sticky top-0 left-0 z-30 flex" style={{ height: HEADER_HEIGHT }}>
        <div
          className="border border-gray-300 bg-gray-100 flex items-center justify-center font-semibold"
          style={{ width: HEADER_WIDTH, height: HEADER_HEIGHT }}
        />
        {Array.from({ length: columns }).map((_, col) => (
          <div
            key={col}
            className="border border-gray-300 bg-gray-100 flex items-center justify-center font-semibold text-sm relative cursor-pointer hover:bg-gray-200"
            style={{ width: getColumnWidth(col), height: HEADER_HEIGHT }}
            onClick={() => selectColumn(col)}
            onContextMenu={(e) => {
              e.preventDefault()
              setSortMenuColumn(col)
              setSortMenuPosition({ x: e.clientX, y: e.clientY })
            }}
          >
            {numberToColumn(col)}
            {sortedColumn === col && (
              <span className="ml-1 text-blue-600 font-bold">
                {sortDirection === 'asc' ? '▲' : '▼'}
              </span>
            )}
            <div
              className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-500 hover:w-1.5"
              onMouseDown={(e) => handleColumnResizeStart(col, e)}
              onDoubleClick={(e) => handleColumnAutoFit(col, e)}
              title="Double-click to auto-fit"
              style={{ zIndex: 40 }}
            />
          </div>
        ))}
      </div>

      {/* Rows */}
      {Array.from({ length: rows }).map((_, row) => (
        <div 
          key={row} 
          className="flex items-start" 
          style={{ 
            height: getRowHeight(row)
          }}
        >
          {/* Row header */}
          <div
            className="row-header"
            style={{ 
              width: HEADER_WIDTH, 
              height: getRowHeight(row),
              position: 'relative',
              cursor: 'pointer',
            }}
            onClick={() => selectRow(row)}
            onMouseEnter={(e) => {
              const target = e.currentTarget
              target.style.backgroundColor = '#e5e7eb'
            }}
            onMouseLeave={(e) => {
              const target = e.currentTarget
              target.style.backgroundColor = '#f3f4f6'
            }}
          >
            {row + 1}
            <div
              className="absolute left-0 right-0 bottom-0 h-1 cursor-row-resize hover:bg-blue-500"
              onMouseDown={(e) => handleRowResizeStart(row, e)}
              onDoubleClick={(e) => handleRowAutoFit(row, e)}
              title="Double-click to auto-fit"
              style={{ zIndex: 40 }}
            />
          </div>

          {/* Cells */}
          {Array.from({ length: columns }).map((_, col) => (
            <Cell
              key={`${row}-${col}`}
              row={row}
              col={col}
              width={getColumnWidth(col)}
              height={getRowHeight(row)}
              onHeightChange={(r, c, h) => handleCellHeightChange(r, c, h)}
              onFillStart={handleFillStart}
              onCellMouseDown={handleCellMouseDown}
              onCellMouseEnter={handleCellMouseEnter}
            />
          ))}
        </div>
      ))}

      {/* Permanent selection range overlay - shows the full selected range */}
      {selectedRange && !isSelecting && (
        <div
          className="absolute pointer-events-none"
          style={{
            left: HEADER_WIDTH + Array.from({ length: Math.min(selectedRange.start.col, selectedRange.end.col) }).reduce(
              (sum: number, _, i) => sum + getColumnWidth(i),
              0
            ),
            top: HEADER_HEIGHT + Array.from({ length: Math.min(selectedRange.start.row, selectedRange.end.row) }).reduce(
              (sum: number, _, i) => sum + getRowHeight(i),
              0
            ),
            width: Array.from({ 
              length: Math.abs(selectedRange.end.col - selectedRange.start.col) + 1 
            }).reduce((sum: number, _, i) => sum + getColumnWidth(Math.min(selectedRange.start.col, selectedRange.end.col) + i), 0),
            height: Array.from({ 
              length: Math.abs(selectedRange.end.row - selectedRange.start.row) + 1 
            }).reduce((sum: number, _, i) => sum + getRowHeight(Math.min(selectedRange.start.row, selectedRange.end.row) + i), 0),
            border: '2px solid #1a73e8',
            backgroundColor: 'rgba(26, 115, 232, 0.1)',
            zIndex: 15,
            boxShadow: '0 0 0 1px white inset',
          }}
        />
      )}

      {/* Drag selection preview overlay - shows while actively dragging */}
      {isSelecting && selectionStart && selectionEnd && (
        <div
          className="absolute pointer-events-none"
          style={{
            left: HEADER_WIDTH + Array.from({ length: Math.min(selectionStart.col, selectionEnd.col) }).reduce(
              (sum: number, _, i) => sum + getColumnWidth(i),
              0
            ),
            top: HEADER_HEIGHT + Array.from({ length: Math.min(selectionStart.row, selectionEnd.row) }).reduce(
              (sum: number, _, i) => sum + getRowHeight(i),
              0
            ),
            width: Array.from({ 
              length: Math.abs(selectionEnd.col - selectionStart.col) + 1 
            }).reduce((sum: number, _, i) => sum + getColumnWidth(Math.min(selectionStart.col, selectionEnd.col) + i), 0),
            height: Array.from({ 
              length: Math.abs(selectionEnd.row - selectionStart.row) + 1 
            }).reduce((sum: number, _, i) => sum + getRowHeight(Math.min(selectionStart.row, selectionEnd.row) + i), 0),
            border: '2px solid #1a73e8',
            backgroundColor: 'rgba(26, 115, 232, 0.08)',
            zIndex: 20,
            boxShadow: '0 0 0 1px white inset',
          }}
        />
      )}

      {/* Excel-style fill preview overlay */}
      {isFilling && fillStartCell && fillEndCell && (
        <div
          className="absolute pointer-events-none"
          style={{
            left: HEADER_WIDTH + Array.from({ length: Math.min(fillStartCell.col, fillEndCell.col) }).reduce(
              (sum: number, _, i) => sum + getColumnWidth(i),
              0
            ),
            top: HEADER_HEIGHT + Array.from({ length: Math.min(fillStartCell.row, fillEndCell.row) }).reduce(
              (sum: number, _, i) => sum + getRowHeight(i),
              0
            ),
            width: Array.from({ 
              length: Math.abs(fillEndCell.col - fillStartCell.col) + 1 
            }).reduce((sum: number, _, i) => sum + getColumnWidth(Math.min(fillStartCell.col, fillEndCell.col) + i), 0),
            height: Array.from({ 
              length: Math.abs(fillEndCell.row - fillStartCell.row) + 1 
            }).reduce((sum: number, _, i) => sum + getRowHeight(Math.min(fillStartCell.row, fillEndCell.row) + i), 0),
            border: '2px solid #1a73e8',
            backgroundColor: 'rgba(26, 115, 232, 0.08)',
            zIndex: 25,
            boxShadow: '0 0 0 1px white inset, 0 2px 6px rgba(0, 0, 0, 0.15)',
          }}
        />
      )}
      </div>

      {/* Sort context menu */}
      {sortMenuColumn !== null && sortMenuPosition && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => {
              setSortMenuColumn(null)
              setSortMenuPosition(null)
            }}
          />
          <div
            className="fixed z-50 bg-white border border-gray-300 rounded shadow-lg min-w-[200px]"
            style={{ left: sortMenuPosition.x, top: sortMenuPosition.y }}
          >
            <div className="px-3 py-1.5 bg-gray-50 text-xs font-semibold text-gray-600 border-b">
              Text Sort
            </div>
            <button
              onClick={() => {
                sortColumn(sortMenuColumn, true, 'text')
                setSortedColumn(sortMenuColumn)
                setSortDirection('asc')
                setSortMenuColumn(null)
                setSortMenuPosition(null)
              }}
              className="w-full text-left px-4 py-2 hover:bg-gray-100 text-sm flex items-center gap-2"
            >
              <span className="text-blue-600">↑</span> Sort A → Z
            </button>
            <button
              onClick={() => {
                sortColumn(sortMenuColumn, false, 'text')
                setSortedColumn(sortMenuColumn)
                setSortDirection('desc')
                setSortMenuColumn(null)
                setSortMenuPosition(null)
              }}
              className="w-full text-left px-4 py-2 hover:bg-gray-100 text-sm flex items-center gap-2"
            >
              <span className="text-blue-600">↓</span> Sort Z → A
            </button>
            <div className="border-t my-1"></div>
            <div className="px-3 py-1.5 bg-gray-50 text-xs font-semibold text-gray-600 border-b">
              Numeric Sort
            </div>
            <button
              onClick={() => {
                sortColumn(sortMenuColumn, true, 'numeric')
                setSortedColumn(sortMenuColumn)
                setSortDirection('asc')
                setSortMenuColumn(null)
                setSortMenuPosition(null)
              }}
              className="w-full text-left px-4 py-2 hover:bg-gray-100 text-sm flex items-center gap-2"
            >
              <span className="text-green-600">↑</span> Sort Smallest to Largest
            </button>
            <button
              onClick={() => {
                sortColumn(sortMenuColumn, false, 'numeric')
                setSortedColumn(sortMenuColumn)
                setSortDirection('desc')
                setSortMenuColumn(null)
                setSortMenuPosition(null)
              }}
              className="w-full text-left px-4 py-2 hover:bg-gray-100 text-sm flex items-center gap-2"
            >
              <span className="text-green-600">↓</span> Sort Largest to Smallest
            </button>
            <div className="border-t my-1"></div>
            <div className="px-3 py-1.5 bg-gray-50 text-xs font-semibold text-gray-600 border-b">
              Date Sort
            </div>
            <button
              onClick={() => {
                sortColumn(sortMenuColumn, true, 'date')
                setSortedColumn(sortMenuColumn)
                setSortDirection('asc')
                setSortMenuColumn(null)
                setSortMenuPosition(null)
              }}
              className="w-full text-left px-4 py-2 hover:bg-gray-100 text-sm flex items-center gap-2"
            >
              <span className="text-purple-600">↑</span> Sort Oldest to Newest
            </button>
            <button
              onClick={() => {
                sortColumn(sortMenuColumn, false, 'date')
                setSortedColumn(sortMenuColumn)
                setSortDirection('desc')
                setSortMenuColumn(null)
                setSortMenuPosition(null)
              }}
              className="w-full text-left px-4 py-2 hover:bg-gray-100 text-sm flex items-center gap-2"
            >
              <span className="text-purple-600">↓</span> Sort Newest to Oldest
            </button>
          </div>
        </>
      )}
    </div>
  )
}
