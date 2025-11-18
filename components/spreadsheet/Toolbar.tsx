'use client'

import React, { useState, useRef, useEffect } from 'react'
import { useSpreadsheetStore } from '@/lib/store/spreadsheetStore'

const FONT_FAMILIES = [
  'Arial',
  'Calibri',
  'Times New Roman',
  'Roboto',
  'Helvetica',
  'Georgia',
  'Courier New',
  'Verdana',
  'Tahoma',
  'Trebuchet MS',
  'Comic Sans MS',
  'Impact',
  'Lucida Console',
  'Palatino',
  'Garamond',
]

export default function Toolbar() {
  const [showColorPicker, setShowColorPicker] = useState(false)
  const [showBgColorPicker, setShowBgColorPicker] = useState(false)
  const [showAlignmentMenu, setShowAlignmentMenu] = useState(false)
  const [showFreezeMenu, setShowFreezeMenu] = useState(false)
  const [showFontMenu, setShowFontMenu] = useState(false)
  const [fontSearch, setFontSearch] = useState('')
  const alignmentMenuRef = useRef<HTMLDivElement>(null)
  const freezeMenuRef = useRef<HTMLDivElement>(null)
  const fontMenuRef = useRef<HTMLDivElement>(null)

  const {
    selectedCell,
    selectedRange,
    setCellStyle,
    getCellData,
    undo,
    redo,
    canUndo,
    canRedo,
    setFrozenRows,
    setFrozenColumns,
    sheets,
    activeSheetId,
    zoom,
    setZoom,
  } = useSpreadsheetStore()
  
  const activeSheet = sheets.find((s) => s.id === activeSheetId)
  const frozenRows = activeSheet?.data.frozenRows || 0
  const frozenColumns = activeSheet?.data.frozenColumns || 0

  // Get the anchor cell for displaying current formatting
  const anchorCell = selectedCell || (selectedRange ? selectedRange.start : null)
  const cellData = anchorCell ? getCellData(anchorCell.row, anchorCell.col) : null
  const style = cellData?.style || {}

  // Helper to get all cells in the selection
  const getSelectedCells = () => {
    if (selectedRange) {
      const cells: Array<{ row: number; col: number }> = []
      const minRow = Math.min(selectedRange.start.row, selectedRange.end.row)
      const maxRow = Math.max(selectedRange.start.row, selectedRange.end.row)
      const minCol = Math.min(selectedRange.start.col, selectedRange.end.col)
      const maxCol = Math.max(selectedRange.start.col, selectedRange.end.col)
      
      for (let row = minRow; row <= maxRow; row++) {
        for (let col = minCol; col <= maxCol; col++) {
          cells.push({ row, col })
        }
      }
      return cells
    } else if (selectedCell) {
      return [{ row: selectedCell.row, col: selectedCell.col }]
    }
    return []
  }

  const handleStyleChange = (styleKey: string, value: any) => {
    const cells = getSelectedCells()
    if (cells.length === 0) return
    
    // Apply style to all cells in the selection
    cells.forEach(({ row, col }) => {
      setCellStyle(row, col, { [styleKey]: value })
    })
  }

  const toggleBold = () => handleStyleChange('bold', !style.bold)
  const toggleItalic = () => handleStyleChange('italic', !style.italic)
  const toggleUnderline = () => handleStyleChange('underline', !style.underline)

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (alignmentMenuRef.current && !alignmentMenuRef.current.contains(event.target as Node)) {
        setShowAlignmentMenu(false)
      }
      if (freezeMenuRef.current && !freezeMenuRef.current.contains(event.target as Node)) {
        setShowFreezeMenu(false)
      }
      if (fontMenuRef.current && !fontMenuRef.current.contains(event.target as Node)) {
        setShowFontMenu(false)
        setFontSearch('')
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleHorizontalAlign = (align: 'left' | 'center' | 'right') => {
    handleStyleChange('horizontalAlign', align)
    handleStyleChange('textAlign', align)
  }

  const handleVerticalAlign = (align: 'top' | 'middle' | 'bottom') => {
    handleStyleChange('verticalAlign', align)
  }

  const handleIndentIncrease = () => {
    const currentIndent = style.indent || 0
    handleStyleChange('indent', currentIndent + 1)
  }

  const handleIndentDecrease = () => {
    const currentIndent = style.indent || 0
    handleStyleChange('indent', Math.max(0, currentIndent - 1))
  }

  const handleRotation = (rotation: 0 | 45 | -45 | 90 | -90) => {
    handleStyleChange('rotation', rotation)
  }

  const handleColorChange = (color: string) => {
    handleStyleChange('color', color)
    setShowColorPicker(false)
  }

  const handleBgColorChange = (color: string) => {
    handleStyleChange('backgroundColor', color)
    setShowBgColorPicker(false)
  }

  const colors = [
    '#000000', '#FFFFFF', '#FF0000', '#00FF00', '#0000FF',
    '#FFFF00', '#FF00FF', '#00FFFF', '#FFA500', '#800080',
  ]

  return (
    <div className="toolbar">
      <div className="flex items-center gap-2">
        {/* Undo/Redo */}
        <button
          onClick={undo}
          disabled={!canUndo()}
          className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
          title="Undo (Ctrl+Z)"
        >
          ↶
        </button>
        <button
          onClick={redo}
          disabled={!canRedo()}
          className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
          title="Redo (Ctrl+Y)"
        >
          ↷
        </button>

        <div className="w-px h-6 bg-gray-300 mx-2"></div>

        {/* Text formatting */}
        <button
          onClick={toggleBold}
          className={`px-3 py-1 border border-gray-300 rounded hover:bg-gray-100 font-bold ${
            style.bold ? 'bg-blue-100' : ''
          }`}
          title="Bold (Ctrl+B)"
        >
          B
        </button>
        <button
          onClick={toggleItalic}
          className={`px-3 py-1 border border-gray-300 rounded hover:bg-gray-100 italic ${
            style.italic ? 'bg-blue-100' : ''
          }`}
          title="Italic (Ctrl+I)"
        >
          I
        </button>
        <button
          onClick={toggleUnderline}
          className={`px-3 py-1 border border-gray-300 rounded hover:bg-gray-100 underline ${
            style.underline ? 'bg-blue-100' : ''
          }`}
          title="Underline (Ctrl+U)"
        >
          U
        </button>

        <div className="w-px h-6 bg-gray-300 mx-2"></div>

        {/* Font Family Picker */}
        <div className="relative" ref={fontMenuRef}>
          <button
            onClick={() => setShowFontMenu(!showFontMenu)}
            className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-100 flex items-center gap-2 min-w-[140px] justify-between"
            title="Font Family"
            disabled={!selectedCell}
            style={{ fontFamily: style.fontFamily || 'Arial' }}
          >
            <span className="truncate">{style.fontFamily || 'Arial'}</span>
            <span className="text-xs">▾</span>
          </button>
          {showFontMenu && (
            <div className="absolute top-full mt-1 bg-white border border-gray-300 rounded shadow-lg z-50 w-[200px] max-h-[400px] overflow-hidden flex flex-col">
              <input
                type="text"
                value={fontSearch}
                onChange={(e) => setFontSearch(e.target.value)}
                placeholder="Search fonts..."
                className="px-3 py-2 border-b border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
              <div className="overflow-y-auto">
                {FONT_FAMILIES.filter(font => 
                  font.toLowerCase().includes(fontSearch.toLowerCase())
                ).map(font => (
                  <button
                    key={font}
                    onClick={() => {
                      handleStyleChange('fontFamily', font)
                      setShowFontMenu(false)
                      setFontSearch('')
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-blue-50 text-sm"
                    style={{ fontFamily: font }}
                  >
                    {font}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Font size */}
        <select
          value={style.fontSize || 11}
          onChange={(e) => handleStyleChange('fontSize', Number(e.target.value))}
          className="px-2 py-1 border border-gray-300 rounded hover:bg-gray-100"
          title="Font Size"
          disabled={!selectedCell}
        >
          <option value={8}>8</option>
          <option value={9}>9</option>
          <option value={10}>10</option>
          <option value={11}>11</option>
          <option value={12}>12</option>
          <option value={14}>14</option>
          <option value={16}>16</option>
          <option value={18}>18</option>
          <option value={20}>20</option>
          <option value={24}>24</option>
          <option value={28}>28</option>
          <option value={32}>32</option>
        </select>

        <div className="w-px h-6 bg-gray-300 mx-2"></div>

        {/* Alignment Menu */}
        <div className="relative" ref={alignmentMenuRef}>
          <button
            onClick={() => setShowAlignmentMenu(!showAlignmentMenu)}
            className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-100 flex items-center gap-1"
            title="Alignment Options"
            disabled={!selectedCell}
          >
            <span>≡</span>
            <span className="text-xs">▾</span>
          </button>
          {showAlignmentMenu && (
            <div className="absolute top-full mt-1 bg-white border border-gray-300 rounded shadow-lg z-50 p-3 min-w-[240px]">
              {/* Horizontal Alignment */}
              <div className="mb-3">
                <div className="text-xs font-semibold text-gray-600 mb-2">Horizontal</div>
                <div className="flex gap-1">
                  <button
                    onClick={() => handleHorizontalAlign('left')}
                    className={`px-3 py-2 border border-gray-300 rounded hover:bg-gray-100 flex-1 ${
                      (style.horizontalAlign === 'left' || !style.horizontalAlign) ? 'bg-blue-100' : ''
                    }`}
                    title="Align Left"
                  >
                    ⫷ Left
                  </button>
                  <button
                    onClick={() => handleHorizontalAlign('center')}
                    className={`px-3 py-2 border border-gray-300 rounded hover:bg-gray-100 flex-1 ${
                      style.horizontalAlign === 'center' ? 'bg-blue-100' : ''
                    }`}
                    title="Align Center"
                  >
                    ≡ Center
                  </button>
                  <button
                    onClick={() => handleHorizontalAlign('right')}
                    className={`px-3 py-2 border border-gray-300 rounded hover:bg-gray-100 flex-1 ${
                      style.horizontalAlign === 'right' ? 'bg-blue-100' : ''
                    }`}
                    title="Align Right"
                  >
                    ⫸ Right
                  </button>
                </div>
              </div>

              {/* Vertical Alignment */}
              <div className="mb-3">
                <div className="text-xs font-semibold text-gray-600 mb-2">Vertical</div>
                <div className="flex gap-1">
                  <button
                    onClick={() => handleVerticalAlign('top')}
                    className={`px-3 py-2 border border-gray-300 rounded hover:bg-gray-100 flex-1 ${
                      (style.verticalAlign === 'top' || !style.verticalAlign) ? 'bg-blue-100' : ''
                    }`}
                    title="Align Top"
                  >
                    ⬆ Top
                  </button>
                  <button
                    onClick={() => handleVerticalAlign('middle')}
                    className={`px-3 py-2 border border-gray-300 rounded hover:bg-gray-100 flex-1 ${
                      style.verticalAlign === 'middle' ? 'bg-blue-100' : ''
                    }`}
                    title="Align Middle"
                  >
                    ↕ Middle
                  </button>
                  <button
                    onClick={() => handleVerticalAlign('bottom')}
                    className={`px-3 py-2 border border-gray-300 rounded hover:bg-gray-100 flex-1 ${
                      style.verticalAlign === 'bottom' ? 'bg-blue-100' : ''
                    }`}
                    title="Align Bottom"
                  >
                    ⬇ Bottom
                  </button>
                </div>
              </div>

              {/* Indentation */}
              <div className="mb-3">
                <div className="text-xs font-semibold text-gray-600 mb-2">Indentation</div>
                <div className="flex gap-1">
                  <button
                    onClick={handleIndentIncrease}
                    className="px-3 py-2 border border-gray-300 rounded hover:bg-gray-100 flex-1"
                    title="Increase Indent"
                  >
                    ⇥ Increase
                  </button>
                  <button
                    onClick={handleIndentDecrease}
                    className="px-3 py-2 border border-gray-300 rounded hover:bg-gray-100 flex-1"
                    title="Decrease Indent"
                  >
                    ⇤ Decrease
                  </button>
                </div>
                {style.indent !== undefined && style.indent > 0 && (
                  <div className="text-xs text-gray-500 mt-1">Current: {style.indent}</div>
                )}
              </div>

              {/* Text Orientation */}
              <div>
                <div className="text-xs font-semibold text-gray-600 mb-2">Text Orientation</div>
                <div className="grid grid-cols-2 gap-1">
                  <button
                    onClick={() => handleRotation(0)}
                    className={`px-3 py-2 border border-gray-300 rounded hover:bg-gray-100 text-sm ${
                      !style.rotation ? 'bg-blue-100' : ''
                    }`}
                    title="No Rotation"
                  >
                    → Normal
                  </button>
                  <button
                    onClick={() => handleRotation(90)}
                    className={`px-3 py-2 border border-gray-300 rounded hover:bg-gray-100 text-sm ${
                      style.rotation === 90 ? 'bg-blue-100' : ''
                    }`}
                    title="Rotate Up 90°"
                  >
                    ↑ 90°
                  </button>
                  <button
                    onClick={() => handleRotation(-90)}
                    className={`px-3 py-2 border border-gray-300 rounded hover:bg-gray-100 text-sm ${
                      style.rotation === -90 ? 'bg-blue-100' : ''
                    }`}
                    title="Rotate Down 90°"
                  >
                    ↓ -90°
                  </button>
                  <button
                    onClick={() => handleRotation(45)}
                    className={`px-3 py-2 border border-gray-300 rounded hover:bg-gray-100 text-sm ${
                      style.rotation === 45 ? 'bg-blue-100' : ''
                    }`}
                    title="Diagonal Up 45°"
                  >
                    ↗ 45°
                  </button>
                  <button
                    onClick={() => handleRotation(-45)}
                    className={`px-3 py-2 border border-gray-300 rounded hover:bg-gray-100 text-sm ${
                      style.rotation === -45 ? 'bg-blue-100' : ''
                    }`}
                    title="Diagonal Down 45°"
                  >
                    ↘ -45°
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="w-px h-6 bg-gray-300 mx-2"></div>

        {/* Wrap text */}
        <button
          onClick={() => {
            console.log('Wrap button clicked, current wrapText:', style.wrapText)
            handleStyleChange('wrapText', !style.wrapText)
          }}
          className={`px-3 py-1 border border-gray-300 rounded hover:bg-gray-100 ${
            style.wrapText ? 'bg-blue-100' : ''
          }`}
          title={`Wrap Text ${style.wrapText ? '(ON)' : '(OFF)'}`}
          disabled={!selectedCell}
        >
          {style.wrapText ? '⤾ ON' : '⤾'}
        </button>

        <div className="w-px h-6 bg-gray-300 mx-2"></div>

        {/* Text color */}
        <div className="relative">
          <button
            onClick={() => setShowColorPicker(!showColorPicker)}
            className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-100"
            title="Text Color"
            disabled={!selectedCell}
          >
            <span style={{ color: style.color || '#000000' }}>A</span>
          </button>
          {showColorPicker && (
            <div className="absolute top-full mt-1 p-2 bg-white border border-gray-300 rounded shadow-lg z-50">
              <div className="grid grid-cols-5 gap-1">
                {colors.map((color) => (
                  <button
                    key={color}
                    onClick={() => handleColorChange(color)}
                    className="w-6 h-6 border border-gray-300 rounded hover:scale-110"
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Background color */}
        <div className="relative">
          <button
            onClick={() => setShowBgColorPicker(!showBgColorPicker)}
            className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-100"
            title="Background Color"
            disabled={!selectedCell}
          >
            <span
              className="inline-block w-4 h-4 border border-gray-400"
              style={{ backgroundColor: style.backgroundColor || '#FFFFFF' }}
            />
          </button>
          {showBgColorPicker && (
            <div className="absolute top-full mt-1 p-2 bg-white border border-gray-300 rounded shadow-lg z-50">
              <div className="grid grid-cols-5 gap-1">
                {colors.map((color) => (
                  <button
                    key={color}
                    onClick={() => handleBgColorChange(color)}
                    className="w-6 h-6 border border-gray-300 rounded hover:scale-110"
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="w-px h-6 bg-gray-300 mx-2"></div>

        {/* Freeze Panes */}
        <div className="relative" ref={freezeMenuRef}>
          <button
            onClick={() => setShowFreezeMenu(!showFreezeMenu)}
            className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-100 text-sm"
            title="Freeze Panes"
          >
            ❄️ Freeze
          </button>
          {showFreezeMenu && (
            <div className="absolute top-full mt-1 p-2 bg-white border border-gray-300 rounded shadow-lg z-50 min-w-[180px]">
              <button
                onClick={() => {
                  setFrozenRows(1)
                  setShowFreezeMenu(false)
                }}
                className="w-full text-left px-3 py-2 hover:bg-gray-100 rounded text-sm"
              >
                Freeze Top Row {frozenRows === 1 && '✓'}
              </button>
              <button
                onClick={() => {
                  setFrozenColumns(1)
                  setShowFreezeMenu(false)
                }}
                className="w-full text-left px-3 py-2 hover:bg-gray-100 rounded text-sm"
              >
                Freeze First Column {frozenColumns === 1 && '✓'}
              </button>
              <button
                onClick={() => {
                  if (selectedCell) {
                    setFrozenRows(selectedCell.row)
                    setFrozenColumns(selectedCell.col)
                  }
                  setShowFreezeMenu(false)
                }}
                className="w-full text-left px-3 py-2 hover:bg-gray-100 rounded text-sm"
                disabled={!selectedCell}
              >
                Freeze Panes (at selection)
              </button>
              <div className="border-t my-1"></div>
              <button
                onClick={() => {
                  setFrozenRows(0)
                  setFrozenColumns(0)
                  setShowFreezeMenu(false)
                }}
                className="w-full text-left px-3 py-2 hover:bg-gray-100 rounded text-sm"
              >
                Unfreeze All
              </button>
            </div>
          )}
        </div>

        <div className="w-px h-6 bg-gray-300 mx-2"></div>

        {/* Zoom Control */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setZoom(zoom - 10)}
            className="px-2 py-1 border border-gray-300 rounded hover:bg-gray-100 text-sm"
            title="Zoom Out"
          >
            −
          </button>
          <select
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="px-2 py-1 border border-gray-300 rounded hover:bg-gray-100 text-sm"
            title="Zoom Level"
          >
            <option value={50}>50%</option>
            <option value={75}>75%</option>
            <option value={100}>100%</option>
            <option value={125}>125%</option>
            <option value={150}>150%</option>
            <option value={200}>200%</option>
          </select>
          <button
            onClick={() => setZoom(zoom + 10)}
            className="px-2 py-1 border border-gray-300 rounded hover:bg-gray-100 text-sm"
            title="Zoom In"
          >
            +
          </button>
        </div>
      </div>
    </div>
  )
}
