'use client'

import React, { useRef, useEffect, useState } from 'react'
import { useSpreadsheetStore } from '@/lib/store/spreadsheetStore'
import { toA1Notation } from '@/lib/formulas/utils'
import { AIFormulaButton } from './AIFormulaButton'
import { AIResultModal } from './AIResultModal'
import { generateFormulaFromNaturalLanguage } from '@/lib/aiFormula'
import ChartVisualization from './ChartVisualization'
import { BarChart3, X, Download } from 'lucide-react'
import { toPng } from 'html-to-image'

export default function FormulaBar() {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const chartRef = useRef<HTMLDivElement>(null)
  const [showChart, setShowChart] = useState(false)
  const [chartData, setChartData] = useState<any[]>([])
  const [chartType, setChartType] = useState<'bar' | 'line' | 'pie'>('bar')
  const [chartTitle, setChartTitle] = useState('')
  const [multiDatasets, setMultiDatasets] = useState<string[]>([])
  const [isDownloading, setIsDownloading] = useState(false)
  const [aiResult, setAiResult] = useState<{ result: string; cellLocation: string } | null>(null)
  const {
    selectedCell,
    selectedRange,
    editValue,
    editingCell,
    updateEditValue,
    finishEditingAndMove,
    startEditing,
    getCellData,
    sheets,
    activeSheetId,
  } = useSpreadsheetStore()

  const activeSheet = sheets.find(s => s.id === activeSheetId)

  const cellData = selectedCell ? getCellData(selectedCell.row, selectedCell.col) : null
  const cellRef = selectedCell ? toA1Notation(selectedCell.row, selectedCell.col) : ''
  
  const displayValue = editingCell 
    ? editValue 
    : (cellData?.formula || cellData?.value?.toString() || '')

  // Auto-expand textarea based on content
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      const scrollHeight = textareaRef.current.scrollHeight
      // Limit to max 5 lines (roughly 100px)
      const maxHeight = 100
      textareaRef.current.style.height = `${Math.min(scrollHeight, maxHeight)}px`
    }
  }, [displayValue])

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (!editingCell && selectedCell) {
      startEditing(selectedCell.row, selectedCell.col)
    }
    updateEditValue(e.target.value)
  }

  const handleFocus = () => {
    if (!editingCell && selectedCell) {
      startEditing(selectedCell.row, selectedCell.col)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      e.stopPropagation()
      finishEditingAndMove('down')
    } else if (e.key === 'Tab') {
      e.preventDefault()
      e.stopPropagation()
      if (e.shiftKey) {
        finishEditingAndMove('left')
      } else {
        finishEditingAndMove('right')
      }
    } else if (e.key === 'Escape') {
      e.preventDefault()
      e.stopPropagation()
      useSpreadsheetStore.getState().cancelEditing()
    }
    // Shift+Enter allows multi-line input
  }

  // Verify AI calculation by doing it ourselves
  const verifyCalculation = (query: string, aiResult: string, allData: any): string | null => {
    try {
      const queryLower = query.toLowerCase()
      
      // Extract column letters
      const colMatches = queryLower.match(/\b(?:column|col)s?\s*([a-z])\b/gi) || []
      const columns = colMatches.map(m => {
        const letter = m.match(/([a-z])$/i)
        return letter ? letter[1].toUpperCase() : null
      }).filter((l): l is string => l !== null)
      
      if (columns.length === 0) return null // No columns found
      
      // Check for NESTED operations (e.g., "sum of avg of A and avg of B")
      const isNested = /\b(sum|multiply|add|product|divide|subtract)\s+of\s+(avg|average|sum|max|min)/i.test(queryLower)
      
      if (isNested && columns.length > 1) {
        // Parse nested operation: "sum of [avg of A] and [avg of B]"
        const outerOp = queryLower.match(/\b(sum|multiply|add|product|divide|subtract)\s+of/i)?.[1] || 'sum'
        const innerOp = queryLower.match(/of\s+(avg|average|sum|max|min)/i)?.[1] || 'avg'
        
        // Calculate intermediate results for each column
        const intermediateResults: number[] = []
        for (const col of columns) {
          const colKey = `Column ${col}`
          const data = allData[colKey] || []
          const nums = data.filter((v: any) => typeof v === 'number')
          
          if (nums.length === 0) continue
          
          let intermediate: number
          switch (innerOp) {
            case 'avg':
            case 'average':
              intermediate = nums.reduce((a, b) => a + b, 0) / nums.length
              break
            case 'sum':
              intermediate = nums.reduce((a, b) => a + b, 0)
              break
            case 'max':
              intermediate = Math.max(...nums)
              break
            case 'min':
              intermediate = Math.min(...nums)
              break
            default:
              continue
          }
          intermediateResults.push(intermediate)
        }
        
        if (intermediateResults.length === 0) return null
        
        // Apply outer operation to intermediate results
        let finalResult: number
        switch (outerOp) {
          case 'sum':
          case 'add':
            finalResult = intermediateResults.reduce((a, b) => a + b, 0)
            return `sum = ${Math.round(finalResult * 100) / 100}`
          case 'multiply':
          case 'product':
            finalResult = intermediateResults.reduce((a, b) => a * b, 1)
            return `product = ${Math.round(finalResult * 100) / 100}`
          case 'divide':
            finalResult = intermediateResults[0] / intermediateResults[1]
            return `result = ${Math.round(finalResult * 100) / 100}`
          case 'subtract':
            finalResult = intermediateResults[0] - intermediateResults[1]
            return `result = ${Math.round(finalResult * 100) / 100}`
          default:
            return null
        }
      }
      
      // Handle SIMPLE operations
      let operation = ''
      if (/\b(sum|add|total)\b/i.test(queryLower)) operation = 'sum'
      else if (/\b(average|mean|avg)\b/i.test(queryLower)) operation = 'average'
      else if (/\b(multiply|product)\b/i.test(queryLower)) operation = 'multiply'
      else if (/\b(max|maximum)\b/i.test(queryLower)) operation = 'max'
      else if (/\b(min|minimum)\b/i.test(queryLower)) operation = 'min'
      else if (/\b(count)\b/i.test(queryLower)) operation = 'count'
      else return null
      
      // Collect all numeric data from mentioned columns
      const allNumbers: number[] = []
      for (const col of columns) {
        const colKey = `Column ${col}`
        const data = allData[colKey] || []
        const nums = data.filter((v: any) => typeof v === 'number')
        allNumbers.push(...nums)
      }
      
      if (allNumbers.length === 0) return null
      
      // Calculate the correct answer
      let correctAnswer: number
      switch (operation) {
        case 'sum':
          correctAnswer = allNumbers.reduce((a, b) => a + b, 0)
          return `sum = ${Math.round(correctAnswer * 100) / 100}`
        case 'average':
          correctAnswer = allNumbers.reduce((a, b) => a + b, 0) / allNumbers.length
          return `average = ${Math.round(correctAnswer * 100) / 100}`
        case 'multiply':
          correctAnswer = allNumbers.reduce((a, b) => a * b, 1)
          return `product = ${Math.round(correctAnswer * 100) / 100}`
        case 'max':
          correctAnswer = Math.max(...allNumbers)
          return `max = ${correctAnswer}`
        case 'min':
          correctAnswer = Math.min(...allNumbers)
          return `min = ${correctAnswer}`
        case 'count':
          return `count = ${allNumbers.length}`
        default:
          return null
      }
    } catch (error) {
      console.error('Verification error:', error)
      return null
    }
  }

  const handleAIFormula = async (query: string) => {
    console.log('FormulaBar: handleAIFormula called with query:', query)
    console.log('FormulaBar: selectedCell:', selectedCell, 'activeSheet:', activeSheet?.name)
    
    if (!selectedCell) {
      alert('Please select a cell first!\n\nClick on any cell in the spreadsheet, then try using Your AI Buddy again.')
      return
    }
    
    if (!activeSheet) {
      console.error('FormulaBar: No active sheet!')
      return
    }

    // Helper function to clean and convert values
    const cleanValue = (value: any) => {
      if (value === undefined || value === null || value === '') return null
      
      let cleanedValue = value
      if (typeof value === 'string') {
        const trimmed = value.trim()
        const noCommas = trimmed.replace(/,/g, '')
        const num = parseFloat(noCommas)
        
        if (!isNaN(num) && /^-?\d*\.?\d+$/.test(noCommas)) {
          cleanedValue = num
        } else {
          cleanedValue = trimmed
        }
      }
      return cleanedValue
    }

    // Collect ALL data from spreadsheet - both columns and rows
    const allData: { [key: string]: any[] } = {}
    
    // Collect column data (Column A, Column B, etc.)
    for (let col = 0; col < activeSheet.data.columns; col++) {
      const columnValues: any[] = []
      
      for (let row = 0; row < activeSheet.data.rows; row++) {
        const cellData = getCellData(row, col)
        const cleaned = cleanValue(cellData?.value)
        if (cleaned !== null) {
          columnValues.push(cleaned)
        }
      }
      
      if (columnValues.length > 0) {
        // Store as both "Column A" and "col_0" for flexible matching
        const colLetter = String.fromCharCode(65 + col) // A, B, C...
        allData[`Column ${colLetter}`] = columnValues
        allData[`col_${col}`] = columnValues
      }
    }
    
    // Collect row data (Row 1, Row 2, etc.)
    for (let row = 0; row < activeSheet.data.rows; row++) {
      const rowValues: any[] = []
      
      for (let col = 0; col < activeSheet.data.columns; col++) {
        const cellData = getCellData(row, col)
        const cleaned = cleanValue(cellData?.value)
        if (cleaned !== null) {
          rowValues.push(cleaned)
        }
      }
      
      if (rowValues.length > 0) {
        // Store as both "Row 1" (1-indexed for user) and "row_0" (0-indexed)
        allData[`Row ${row + 1}`] = rowValues
        allData[`row_${row}`] = rowValues
      }
    }
    
    console.log('Collected all data:', allData)

    // Generate formula or result
    console.log('Sending to AI:', { query, activeCell: selectedCell, allData })
    
    const response = await generateFormulaFromNaturalLanguage({
      query,
      columnHeaders: [],
      activeCell: selectedCell,
      selectionRange: selectedRange || undefined,
      sampleData: [],
      allColumnData: allData, // Reusing this field but now contains both rows and columns
    })

    console.log('AI Response:', response)

    // Safely extract values and ensure formula is always a string
    const { error, action } = response
    const formula = typeof response.formula === 'string' ? response.formula : String(response.formula || '')

    if (error) {
      alert(`AI Buddy Error: ${error}`)
      return
    }

    // Handle different action types
    if (action?.type === 'delete_cells') {
      // Delete specific cells
      const cellsToDelete = action.cells || []
      cellsToDelete.forEach((cell: { row: number; col: number }) => {
        useSpreadsheetStore.getState().setCellValue(cell.row, cell.col, '')
      })
      alert(`Deleted ${cellsToDelete.length} cell(s)`)
    } else if (action?.type === 'remove_duplicates') {
      // Remove duplicate values from a row/column
      const { target, uniqueValues, removedCount } = action
      if (target && uniqueValues) {
        // Clear the target row/column first
        if (target.type === 'row') {
          for (let col = 0; col < activeSheet.data.columns; col++) {
            useSpreadsheetStore.getState().setCellValue(target.index, col, '')
          }
          // Write back unique values
          uniqueValues.forEach((val: any, idx: number) => {
            useSpreadsheetStore.getState().setCellValue(target.index, idx, val)
          })
        } else if (target.type === 'column') {
          for (let row = 0; row < activeSheet.data.rows; row++) {
            useSpreadsheetStore.getState().setCellValue(row, target.index, '')
          }
          // Write back unique values
          uniqueValues.forEach((val: any, idx: number) => {
            useSpreadsheetStore.getState().setCellValue(idx, target.index, val)
          })
        }
        alert(`Removed ${removedCount} duplicate(s). ${uniqueValues.length} unique value(s) remain.`)
      }
    } else if (action?.type === 'sort') {
      // Sort a row/column
      const { target, sortedValues, order } = action
      if (target && sortedValues) {
        if (target.type === 'row') {
          sortedValues.forEach((val: any, idx: number) => {
            useSpreadsheetStore.getState().setCellValue(target.index, idx, val)
          })
        } else if (target.type === 'column') {
          sortedValues.forEach((val: any, idx: number) => {
            useSpreadsheetStore.getState().setCellValue(idx, target.index, val)
          })
        }
        alert(`Sorted ${target.type} ${order === 'asc' ? 'ascending' : 'descending'}`)
      }
    } else if (action?.type === 'modify') {
      // Modify cell values (e.g., convert to uppercase, lowercase, etc.)
      const modifications = action.modifications || []
      modifications.forEach((mod: { row: number; col: number; value: any }) => {
        useSpreadsheetStore.getState().setCellValue(mod.row, mod.col, mod.value)
      })
      alert(`Modified ${modifications.length} cell(s)`)
    } else if (formula && formula.trim() !== '') {
      console.log('Inserting result:', formula)
      
      const cellLocation = `${String.fromCharCode(65 + selectedCell.col)}${selectedCell.row + 1}`
      const isFormula = formula.startsWith('=')
      
      // Check if it's a formula (starts with =) or a calculated result
      if (isFormula) {
        // Start editing and insert the formula
        startEditing(selectedCell.row, selectedCell.col, formula)
      } else {
        // VERIFY THE CALCULATION - don't trust AI blindly!
        console.log('=== CALCULATION VERIFICATION ===')
        console.log('Query:', query)
        console.log('AI Result:', formula)
        console.log('Available data:', Object.keys(allData))
        
        const verifiedResult = verifyCalculation(query, formula, allData)
        
        console.log('Verified Result:', verifiedResult)
        console.log('Using:', verifiedResult || formula)
        console.log('================================')
        
        const finalResult = verifiedResult || formula
        
        // It's a calculated result - show in modal then insert
        setAiResult({ result: finalResult, cellLocation })
        useSpreadsheetStore.getState().setCellValue(selectedCell.row, selectedCell.col, finalResult)
        
        // Try to prepare chart data - support both single and multi-dataset queries
        // Check if query contains "vs" for aggregated comparison (e.g., "average of column A vs average of column B")
        const hasVsKeyword = query.toLowerCase().includes(' vs ')
        
        // First check for multi-dataset pattern (e.g., "compare column A and B", "column A and column B", "rows 1, 2, and 3")
        const multiColMatch = query.toLowerCase().match(/columns?\s+([a-z])(?:\s+(?:and|,|vs)\s+(?:column\s+)?([a-z]))+/i)
        const multiRowMatch = query.toLowerCase().match(/rows?\s+(\d+)(?:\s+(?:and|,|vs)\s+(?:row\s+)?(\d+))+/i)
        
        if (multiColMatch || multiRowMatch) {
          // Extract multiple columns or rows
          let identifiers: string[] = []
          let type = ''
          
          if (multiColMatch) {
            type = 'column'
            // Extract all single letters that represent columns (after "column" word)
            const columnPattern = /column\s+([a-z])/gi
            const matches: string[] = []
            let match
            while ((match = columnPattern.exec(query)) !== null) {
              matches.push(match[1].toUpperCase())
            }
            identifiers = matches.length > 1 ? matches : (query.match(/[a-z]/gi)?.map(m => m.toUpperCase()) || [])
          } else if (multiRowMatch) {
            type = 'row'
            // Extract all numbers that represent rows
            const rowPattern = /row\s+(\d+)/gi
            const matches: string[] = []
            let match
            while ((match = rowPattern.exec(query)) !== null) {
              matches.push(match[1])
            }
            identifiers = matches.length > 1 ? matches : (query.match(/\d+/g) || [])
          }
          
          if (identifiers.length > 1) {
            // Check if this is an aggregated comparison (with "vs") or raw data comparison
            if (hasVsKeyword) {
              // AGGREGATED MODE: Show calculated results (e.g., average of each column/row)
              const operation = query.toLowerCase().match(/(average|sum|max|min|count)/)?.[1] || 'average'
              const aggregatedData: any[] = []
              
              if (type === 'column') {
                identifiers.forEach(colLetter => {
                  const colIndex = colLetter.charCodeAt(0) - 65
                  const values: number[] = []
                  
                  for (let row = 0; row < activeSheet.data.rows; row++) {
                    const cellData = getCellData(row, colIndex)
                    const cleaned = cleanValue(cellData?.value)
                    if (cleaned !== null && typeof cleaned === 'number') {
                      values.push(cleaned)
                    }
                  }
                  
                  let result = 0
                  if (values.length > 0) {
                    switch (operation) {
                      case 'sum':
                        result = values.reduce((a, b) => a + b, 0)
                        break
                      case 'max':
                        result = Math.max(...values)
                        break
                      case 'min':
                        result = Math.min(...values)
                        break
                      case 'count':
                        result = values.length
                        break
                      case 'average':
                      default:
                        result = values.reduce((a, b) => a + b, 0) / values.length
                        break
                    }
                  }
                  
                  aggregatedData.push({ name: `Column ${colLetter}`, value: result })
                })
              } else if (type === 'row') {
                identifiers.forEach(rowNum => {
                  const rowIndex = parseInt(rowNum) - 1
                  const values: number[] = []
                  
                  for (let col = 0; col < activeSheet.data.columns; col++) {
                    const cellData = getCellData(rowIndex, col)
                    const cleaned = cleanValue(cellData?.value)
                    if (cleaned !== null && typeof cleaned === 'number') {
                      values.push(cleaned)
                    }
                  }
                  
                  let result = 0
                  if (values.length > 0) {
                    switch (operation) {
                      case 'sum':
                        result = values.reduce((a, b) => a + b, 0)
                        break
                      case 'max':
                        result = Math.max(...values)
                        break
                      case 'min':
                        result = Math.min(...values)
                        break
                      case 'count':
                        result = values.length
                        break
                      case 'average':
                      default:
                        result = values.reduce((a, b) => a + b, 0) / values.length
                        break
                    }
                  }
                  
                  aggregatedData.push({ name: `Row ${rowNum}`, value: result })
                })
              }
              
              if (aggregatedData.length > 0) {
                setChartData(aggregatedData)
                setChartTitle(`${operation.charAt(0).toUpperCase() + operation.slice(1)} Comparison`)
                setChartType('bar')
                setMultiDatasets([])
              }
            } else {
              // RAW DATA MODE: Show all data points side-by-side
              const chartDataPoints: any[] = []
              const datasetNames: string[] = []
              
              if (type === 'column') {
                // Get max rows to iterate
                const maxRows = activeSheet.data.rows
                for (let row = 0; row < maxRows; row++) {
                  const dataPoint: any = { name: `Row ${row + 1}` }
                  let hasData = false
                  
                  identifiers.forEach(colLetter => {
                    const colIndex = colLetter.charCodeAt(0) - 65
                    const cellData = getCellData(row, colIndex)
                    const cleaned = cleanValue(cellData?.value)
                    if (cleaned !== null && typeof cleaned === 'number') {
                      dataPoint[`Column ${colLetter}`] = cleaned
                      hasData = true
                    }
                  })
                  
                  if (hasData) chartDataPoints.push(dataPoint)
                }
                datasetNames.push(...identifiers.map(l => `Column ${l}`))
              } else if (type === 'row') {
                // Get max columns to iterate
                const maxCols = activeSheet.data.columns
                for (let col = 0; col < maxCols; col++) {
                  const dataPoint: any = { name: String.fromCharCode(65 + col) }
                  let hasData = false
                  
                  identifiers.forEach(rowNum => {
                    const rowIndex = parseInt(rowNum) - 1
                    const cellData = getCellData(rowIndex, col)
                    const cleaned = cleanValue(cellData?.value)
                    if (cleaned !== null && typeof cleaned === 'number') {
                      dataPoint[`Row ${rowNum}`] = cleaned
                      hasData = true
                    }
                  })
                  
                  if (hasData) chartDataPoints.push(dataPoint)
                }
                datasetNames.push(...identifiers.map(r => `Row ${r}`))
              }
              
              if (chartDataPoints.length > 0) {
                setChartData(chartDataPoints)
                setChartTitle(`Comparison: ${datasetNames.join(' vs ')}`)
                setChartType('bar')
                setMultiDatasets(datasetNames)
              }
            }
          }
        } else {
          // Original single column/row logic (unchanged for backward compatibility)
          const dataMatch = query.toLowerCase().match(/(column|row)\s+([a-z]|\d+)/i)
          if (dataMatch) {
            const type = dataMatch[1].toLowerCase() // 'column' or 'row'
            const identifier = dataMatch[2].toUpperCase() // 'A' or '3'
            
            let values: any[] = []
            if (type === 'column') {
              const colIndex = identifier.charCodeAt(0) - 65 // A=0, B=1, etc.
              for (let row = 0; row < activeSheet.data.rows; row++) {
                const cellData = getCellData(row, colIndex)
                const cleaned = cleanValue(cellData?.value)
                if (cleaned !== null && typeof cleaned === 'number') {
                  values.push({ name: `Row ${row + 1}`, value: cleaned })
                }
              }
            } else if (type === 'row') {
              const rowIndex = parseInt(identifier) - 1 // 1-indexed to 0-indexed
              for (let col = 0; col < activeSheet.data.columns; col++) {
                const cellData = getCellData(rowIndex, col)
                const cleaned = cleanValue(cellData?.value)
                if (cleaned !== null && typeof cleaned === 'number') {
                  values.push({ name: String.fromCharCode(65 + col), value: cleaned })
                }
              }
            }
            
            if (values.length > 0) {
              setChartData(values)
              setChartTitle(`${type.charAt(0).toUpperCase() + type.slice(1)} ${identifier} - ${formula}`)
              setChartType('bar')
              setMultiDatasets([])
            }
          }
        }
      }
    } else {
      console.error('No formula or action returned from AI')
      alert('AI Buddy did not return a result. Please try again.')
    }
  }

  const handleDownloadChart = async () => {
    if (!chartRef.current) return
    
    setIsDownloading(true)
    try {
      const dataUrl = await toPng(chartRef.current, {
        quality: 1,
        pixelRatio: 2,
        backgroundColor: '#ffffff'
      })
      
      const link = document.createElement('a')
      link.download = `SheeEasy-${chartType}-chart-${Date.now()}.png`
      link.href = dataUrl
      link.click()
    } catch (error) {
      console.error('Failed to download chart:', error)
      alert('Failed to download chart. Please try again.')
    } finally {
      setIsDownloading(false)
    }
  }

  return (
    <>
      <div className="formula-bar">
        <div className="flex items-start gap-2 w-full">
          <div className="font-semibold text-sm min-w-[60px] text-gray-700 pt-2">
            {cellRef || 'A1'}
          </div>
          <div className="text-gray-400 pt-2">|</div>
          <AIFormulaButton onFormulaGenerated={handleAIFormula} />
          
          {chartData.length > 0 && (
            <button
              onClick={() => setShowChart(true)}
              className="flex items-center gap-1 px-3 py-1 bg-gradient-to-r from-emerald-500 to-green-600 text-white rounded-lg hover:from-emerald-600 hover:to-green-700 transition-all duration-200 text-sm font-medium shadow-sm"
              title="View as chart"
            >
              <BarChart3 size={16} />
              <span>Show Chart</span>
            </button>
          )}
          
          <textarea
            ref={textareaRef}
            className="flex-1 px-2 py-1 border border-gray-300 rounded focus:outline-none focus:border-blue-500 resize-none overflow-y-auto"
            value={displayValue}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onFocus={handleFocus}
            placeholder="Enter value or formula (start with =)"
            rows={1}
            style={{ minHeight: '32px' }}
          />
        </div>
      </div>

      {/* Chart Visualization Modal */}
      {showChart && (
        <>
          <div 
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            onClick={() => setShowChart(false)}
          />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-2xl shadow-2xl z-50 p-6 w-[800px] max-w-[90vw]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold bg-gradient-to-r from-emerald-600 to-green-700 bg-clip-text text-transparent">
                📊 Data Visualization
              </h3>
              <button
                onClick={() => setShowChart(false)}
                className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex flex-wrap gap-2 mb-4 items-center justify-between">
              <div className="flex gap-2">
                <button
                  onClick={() => setChartType('bar')}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    chartType === 'bar'
                      ? 'bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-md'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Bar Chart
                </button>
                <button
                  onClick={() => setChartType('line')}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    chartType === 'line'
                      ? 'bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-md'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Line Chart
                </button>
                <button
                  onClick={() => setChartType('pie')}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    chartType === 'pie'
                      ? 'bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-md'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Pie Chart
                </button>
              </div>
              
              <button
                onClick={handleDownloadChart}
                disabled={isDownloading}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-green-600 text-white rounded-lg hover:from-emerald-600 hover:to-green-700 transition-all duration-200 font-medium shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                title="Download chart as PNG"
              >
                <Download size={18} />
                <span>{isDownloading ? 'Downloading...' : 'Download'}</span>
              </button>
            </div>

            <div ref={chartRef} className="bg-white">
              <ChartVisualization
                data={chartData}
                chartType={chartType}
                title={chartTitle}
                multiDatasets={multiDatasets.length > 0 ? multiDatasets : undefined}
              />
            </div>
          </div>
        </>
      )}

      {/* AI Result Modal */}
      {aiResult && (
        <AIResultModal
          result={aiResult.result}
          cellLocation={aiResult.cellLocation}
          onClose={() => setAiResult(null)}
        />
      )}
    </>
  )
}
