/**
 * AI Formula Generator
 * Converts natural language to Excel-style formulas using OpenAI
 */

interface GenerateFormulaOptions {
  query: string
  columnHeaders: string[]
  activeCell: { row: number; col: number }
  selectionRange?: { start: { row: number; col: number }; end: { row: number; col: number } }
  sampleData?: string[][]
  allColumnData?: { [colIndex: number]: any[] } // All data from columns
}

export async function generateFormulaFromNaturalLanguage(
  options: GenerateFormulaOptions
): Promise<{ formula: string; error?: string; action?: any }> {
  const { query, columnHeaders, activeCell, selectionRange, sampleData, allColumnData } = options

  try {
    // Build context for the AI
    const context = buildContext(columnHeaders, activeCell, selectionRange, sampleData)

    // Call the API endpoint
    const response = await fetch('/api/ai-formula', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        context,
        allColumnData,
        activeCell,
        selectionRange,
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      return { formula: '', error: error.message || 'Failed to generate formula' }
    }

    const data = await response.json()
    
    // If there's an action (data manipulation), return it
    if (data.action) {
      return { formula: '', action: data.action }
    }
    
    // If there's an error, return it
    if (data.error) {
      return { formula: '', error: data.error }
    }
    
    const formula = sanitizeFormula(data.formula)

    if (!formula) {
      return { formula: '', error: 'No valid formula returned' }
    }

    return { formula }
  } catch (error) {
    console.error('AI Formula Error:', error)
    return {
      formula: '',
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    }
  }
}

function buildContext(
  columnHeaders: string[],
  activeCell: { row: number; col: number },
  selectionRange?: { start: { row: number; col: number }; end: { row: number; col: number } },
  sampleData?: string[][]
): string {
  const colNames = columnHeaders.map((header, idx) => {
    const colLetter = String.fromCharCode(65 + idx)
    return `${colLetter}: ${header || 'Column ' + colLetter}`
  }).join('\n')

  const activeCellRef = `${String.fromCharCode(65 + activeCell.col)}${activeCell.row + 1}`

  let contextText = `Sheet headers:\n${colNames}\n\nActive cell: ${activeCellRef}`

  if (selectionRange) {
    const startRef = `${String.fromCharCode(65 + selectionRange.start.col)}${selectionRange.start.row + 1}`
    const endRef = `${String.fromCharCode(65 + selectionRange.end.col)}${selectionRange.end.row + 1}`
    contextText += `\nSelected range: ${startRef}:${endRef}`
  }

  if (sampleData && sampleData.length > 0) {
    contextText += `\n\nSample data (first 3 rows):\n`
    sampleData.slice(0, 3).forEach((row, idx) => {
      contextText += `Row ${idx + 1}: ${row.join(', ')}\n`
    })
  }

  return contextText
}

function sanitizeFormula(rawFormula: string): string {
  if (!rawFormula) return ''

  // Remove markdown code blocks if present
  let cleaned = rawFormula.replace(/```[^\n]*\n?/g, '').trim()

  // Check if it's a formula (starts with =)
  if (cleaned.startsWith('=')) {
    // Remove any explanatory text before the formula
    const formulaMatch = cleaned.match(/=[\s\S]+/)
    if (formulaMatch) {
      cleaned = formulaMatch[0]
    }

    // Remove any trailing explanation or text after the formula
    // Stop at first newline or period followed by space
    const endMatch = cleaned.match(/^(=[^\n.]+)/)
    if (endMatch) {
      cleaned = endMatch[1]
    }

    // Basic validation - check for dangerous patterns
    const dangerous = ['eval', 'Function', 'constructor', '<script', 'javascript:']
    if (dangerous.some(pattern => cleaned.toLowerCase().includes(pattern.toLowerCase()))) {
      return ''
    }

    return cleaned.trim()
  } else {
    // It's a calculated result (plain text/number)
    // Keep natural language format like "sum = 51" or "average = 20"
    
    // Get first line only (remove any extra explanations)
    const firstLine = cleaned.split('\n')[0].trim()
    
    // If it matches the pattern "operation = value", keep it as is
    if (/^(sum|average|total|max|min|count|mean)\s*=\s*[\d,.]+$/i.test(firstLine)) {
      return firstLine
    }
    
    // Otherwise try to extract just the result format
    const formatMatch = cleaned.match(/(sum|average|total|max|min|count|mean)\s*=\s*[\d,.]+/i)
    if (formatMatch) {
      return formatMatch[0]
    }
    
    // Fallback: return the first line
    return firstLine
  }
}
