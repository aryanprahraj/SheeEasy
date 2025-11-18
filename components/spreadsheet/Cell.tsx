'use client'

import React, { useRef, useEffect, useState } from 'react'
import { useSpreadsheetStore } from '@/lib/store/spreadsheetStore'
import { toA1Notation } from '@/lib/formulas/utils'

interface CellProps {
  row: number
  col: number
  width: number
  height: number
  onHeightChange?: (row: number, col: number, height: number) => void
  onFillStart?: (row: number, col: number, e: React.MouseEvent) => void
  onCellMouseDown?: (row: number, col: number, e: React.MouseEvent) => void
  onCellMouseEnter?: (row: number, col: number) => void
}

export default function Cell({ row, col, width, height, onHeightChange, onFillStart, onCellMouseDown, onCellMouseEnter }: CellProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const displayRef = useRef<HTMLDivElement>(null)
  const measureRef = useRef<HTMLDivElement>(null)
  const [localValue, setLocalValue] = useState('')
  const mouseDownPosRef = useRef<{ x: number; y: number } | null>(null)
  const didMouseMoveRef = useRef(false)

  const {
    selectedCell,
    selectedRange,
    editingCell,
    editValue,
    isEditMode,
    selectCell,
    startEditing,
    updateEditValue,
    finishEditingAndMove,
    cancelEditing,
    getCellData,
    sheets,
    activeSheetId,
  } = useSpreadsheetStore()

  const cellData = getCellData(row, col)
  const isSelected = selectedCell?.row === row && selectedCell?.col === col
  
  // Check if cell is in selected range
  const isInRange = selectedRange 
    ? row >= Math.min(selectedRange.start.row, selectedRange.end.row) &&
      row <= Math.max(selectedRange.start.row, selectedRange.end.row) &&
      col >= Math.min(selectedRange.start.col, selectedRange.end.col) &&
      col <= Math.max(selectedRange.start.col, selectedRange.end.col)
    : false
  
  const isEditing = editingCell?.row === row && editingCell?.col === col
  // Always wrap text by default
  const isWrapped = true

  useEffect(() => {
    setLocalValue(cellData?.formula || cellData?.value?.toString() || '')
  }, [cellData])

  // Measure and report cell height when content changes (ONLY when not in edit mode)
  useEffect(() => {
    if (!onHeightChange || !measureRef.current || isEditing) return
    
    const displayValue = cellData?.formula 
      ? (cellData.value !== null ? cellData.value : '') 
      : (cellData?.value ?? '')
    
    if (!displayValue) {
      // Empty cell - use default row height
      onHeightChange(row, col, 26)
      return
    }

    // Use hidden measurement div to get actual rendered height
    measureRef.current.textContent = String(displayValue)
    
    // Force reflow to get accurate measurement
    measureRef.current.offsetHeight
    
    // Get the computed height including all content
    const measuredHeight = measureRef.current.scrollHeight
    const minHeight = 26 // Default row height
    const finalHeight = Math.max(minHeight, measuredHeight)
    
    onHeightChange(row, col, finalHeight)
  }, [cellData, width, row, col, onHeightChange, isEditing])

  useEffect(() => {
    if (isEditing) {
      const element = isWrapped ? textareaRef.current : inputRef.current
      if (element) {
        element.focus()
        // Place cursor at end
        const len = element.value.length
        element.setSelectionRange(len, len)
        
        // Auto-grow textarea for wrapped cells
        if (isWrapped && textareaRef.current) {
          textareaRef.current.style.height = 'auto'
          textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px'
        }
      }
    }
  }, [isEditing, isWrapped])

  useEffect(() => {
    if (isEditing) {
      setLocalValue(editValue)
    }
  }, [editValue, isEditing])

  const handleMouseDown = (e: React.MouseEvent) => {
    // Don't trigger cell selection if clicking on fill handle
    if ((e.target as HTMLElement).classList.contains('fill-handle')) {
      return
    }
    
    mouseDownPosRef.current = { x: e.clientX, y: e.clientY }
    didMouseMoveRef.current = false
    
    // Trigger drag selection
    if (onCellMouseDown) {
      onCellMouseDown(row, col, e)
    }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (mouseDownPosRef.current) {
      const moved = Math.abs(e.clientX - mouseDownPosRef.current.x) > 3 || 
                    Math.abs(e.clientY - mouseDownPosRef.current.y) > 3
      if (moved) {
        didMouseMoveRef.current = true
      }
    }
  }

  const handleMouseEnter = () => {
    // Trigger drag selection range update
    if (onCellMouseEnter) {
      onCellMouseEnter(row, col)
    }
  }

  const handleClick = () => {
    // Don't change selection if this was actually a drag operation
    if (!isEditing && !didMouseMoveRef.current) {
      selectCell(row, col)
    }
    mouseDownPosRef.current = null
    didMouseMoveRef.current = false
  }

  const handleDoubleClick = () => {
    startEditing(row, col)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (isEditing) {
      if (e.key === 'Enter') {
        e.preventDefault()
        e.stopPropagation()
        // Shift+Enter goes up, Enter goes down - auto-edit next cell
        if (e.shiftKey) {
          finishEditingAndMove('up')
        } else {
          finishEditingAndMove('down')
        }
      } else if (e.key === 'Escape') {
        e.preventDefault()
        e.stopPropagation()
        cancelEditing()
      } else if (e.key === 'Tab') {
        e.preventDefault()
        e.stopPropagation()
        // Shift+Tab goes left, Tab goes right - auto-edit next cell
        if (e.shiftKey) {
          finishEditingAndMove('left')
        } else {
          finishEditingAndMove('right')
        }
      }
    } else if (isSelected && !isEditing) {
      // Start editing when typing in a selected cell
      if (e.key.length === 1 || e.key === 'Backspace' || e.key === 'Delete') {
        e.preventDefault()
        const newValue = e.key.length === 1 ? e.key : ''
        startEditing(row, col, newValue)
      } else if (e.key === 'Enter' || e.key === 'F2') {
        e.preventDefault()
        startEditing(row, col)
      }
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setLocalValue(value)
    updateEditValue(value)
  }

  const handleBlur = () => {
    // Use the old finishEditing from store (without auto-move)
    useSpreadsheetStore.getState().finishEditing()
  }

  const displayValue = cellData?.formula 
    ? (cellData.value !== null ? cellData.value : '') 
    : (cellData?.value ?? '')

  // Calculate alignment styles
  const horizontalAlign = cellData?.style?.horizontalAlign || cellData?.style?.textAlign || 'left'
  const verticalAlign = cellData?.style?.verticalAlign || 'top'
  const indent = cellData?.style?.indent || 0
  const rotation = cellData?.style?.rotation || 0

  // Map vertical alignment to CSS
  const alignItemsMap = {
    top: 'flex-start',
    middle: 'center',
    bottom: 'flex-end',
  }

  // Check if next cell to the right has content (for overflow logic)
  const activeSheet = sheets.find((s) => s.id === activeSheetId)
  const nextCellRef = toA1Notation(row, col + 1)
  const nextCellHasContent = activeSheet?.data.cells[nextCellRef]?.value ? true : false
  
  // Determine overflow behavior (Excel rules)
  const shouldWrap = cellData?.style?.wrapText || isWrapped
  const canOverflow = !shouldWrap && !nextCellHasContent && !isEditing

  const cellStyle: React.CSSProperties = {
    width,
    height,
    // Edit mode: single line, no wrap. Display mode: wrap if enabled, overflow if allowed
    whiteSpace: isEditing ? 'nowrap' : (shouldWrap ? 'normal' : 'nowrap'),
    wordBreak: isEditing ? 'normal' : (shouldWrap ? 'break-word' : 'normal'),
    overflow: canOverflow ? 'visible' : 'hidden',
    textOverflow: !canOverflow && !shouldWrap ? 'ellipsis' : 'clip',
    alignItems: alignItemsMap[verticalAlign],
    justifyContent: horizontalAlign === 'left' ? 'flex-start' : horizontalAlign === 'center' ? 'center' : 'flex-end',
    paddingLeft: `${2 + (indent * 8)}px`,
    // Thick border in edit mode (Excel style)
    ...(isEditing && { border: '2px solid #4285f4', zIndex: 100 }),
    ...(cellData?.style?.bold && { fontWeight: 'bold' }),
    ...(cellData?.style?.italic && { fontStyle: 'italic' }),
    ...(cellData?.style?.underline && { textDecoration: 'underline' }),
    ...(cellData?.style?.backgroundColor && { backgroundColor: cellData.style.backgroundColor }),
    ...(cellData?.style?.color && { color: cellData.style.color }),
    ...(cellData?.style?.fontSize && { fontSize: `${cellData.style.fontSize}px` }),
    ...(cellData?.style?.fontFamily && { fontFamily: cellData.style.fontFamily }),
    ...(cellData?.style?.textAlign && { textAlign: cellData.style.textAlign }),
    ...(cellData?.style?.horizontalAlign && { textAlign: cellData.style.horizontalAlign }),
  }

  const contentStyle: React.CSSProperties = {
    ...(rotation && { transform: `rotate(${rotation}deg)` }),
    ...(rotation && { transformOrigin: 'center center' }),
    ...(rotation && Math.abs(rotation) === 90 && { writingMode: 'vertical-rl' }),
  }

  return (
    <div
      className={`cell ${isSelected ? 'selected' : ''} ${isInRange ? 'in-range' : ''} ${isEditing ? 'editing' : ''} ${isWrapped ? 'wrapped' : ''}`}
      style={cellStyle}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      onKeyDown={handleKeyDown}
      tabIndex={isSelected ? 0 : -1}
      data-wrapped={isWrapped ? 'true' : 'false'}
    >
      {isEditing ? (
        isWrapped ? (
          <textarea
            ref={textareaRef}
            className="cell-textarea"
            value={localValue}
            onChange={(e) => {
              setLocalValue(e.target.value)
              updateEditValue(e.target.value)
              // Auto-grow textarea as user types
              if (textareaRef.current) {
                textareaRef.current.style.height = 'auto'
                textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px'
              }
            }}
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
            spellCheck={false}
            style={{
              color: cellData?.style?.color || '#000000',
              fontWeight: cellData?.style?.bold ? 'bold' : 'normal',
              fontStyle: cellData?.style?.italic ? 'italic' : 'normal',
              textDecoration: cellData?.style?.underline ? 'underline' : 'none',
              fontSize: cellData?.style?.fontSize ? `${cellData.style.fontSize}px` : undefined,
              fontFamily: cellData?.style?.fontFamily || 'Arial',
            }}
          />
        ) : (
          <input
            ref={inputRef}
            type="text"
            className="cell-input"
            value={localValue}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
            spellCheck={false}
            style={{
              color: cellData?.style?.color || '#000000',
              fontWeight: cellData?.style?.bold ? 'bold' : 'normal',
              fontStyle: cellData?.style?.italic ? 'italic' : 'normal',
              textDecoration: cellData?.style?.underline ? 'underline' : 'none',
              fontSize: cellData?.style?.fontSize ? `${cellData.style.fontSize}px` : undefined,
              fontFamily: cellData?.style?.fontFamily || 'Arial',
            }}
          />
        )
      ) : (
        <div ref={displayRef} className="cell-display" style={contentStyle} title={String(displayValue)}>
          {displayValue}
        </div>
      )}
      {/* Excel-style fill handle (bottom-right corner) */}
      {isSelected && !isEditing && onFillStart && (
        <div
          className="fill-handle"
          onMouseDown={(e) => {
            e.preventDefault()
            e.stopPropagation()
            onFillStart(row, col, e)
          }}
          title="Fill Handle: Drag to auto-fill cells"
        />
      )}
      {/* Hidden div for measuring text height with exact same CSS */}
      <div
        ref={measureRef}
        style={{
          position: 'absolute',
          visibility: 'hidden',
          pointerEvents: 'none',
          width: width - 8, // Account for padding (2px left + 6px right)
          whiteSpace: 'normal',
          wordBreak: 'break-word',
          fontSize: cellData?.style?.fontSize ? `${cellData.style.fontSize}px` : '11px',
          fontWeight: cellData?.style?.bold ? 'bold' : 'normal',
          fontStyle: cellData?.style?.italic ? 'italic' : 'normal',
          lineHeight: 1,
          padding: 0,
          margin: 0,
        }}
      />
    </div>
  )
}
