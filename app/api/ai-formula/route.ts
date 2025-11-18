import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { query, context, allColumnData, activeCell, selectionRange } = await request.json()

    console.log('[AI API] Received request:', { query, hasColumnData: !!allColumnData })

    if (!query || typeof query !== 'string') {
      console.error('[AI API] Invalid query')
      return NextResponse.json(
        { error: 'Missing or invalid query' },
        { status: 400 }
      )
    }

    const queryLower = query.toLowerCase()
    
    // Detect if this is a data manipulation request (not just calculation)
    const isDataManipulation = /\b(remove|delete|clear|sort|filter|modify|change|convert|uppercase|lowercase|trim)\b/i.test(queryLower)
    
    if (isDataManipulation) {
      // Handle data manipulation locally without calling AI
      const result = handleDataManipulation(query, allColumnData, activeCell, selectionRange)
      return NextResponse.json(result)
    }

    // Check for OpenAI API key
    const apiKey = process.env.OPENAI_API_KEY

    if (!apiKey) {
      console.error('[AI API] No API key found')
      return NextResponse.json(
        { error: 'OpenAI API key not configured. Please add OPENAI_API_KEY to your .env.local file.' },
        { status: 500 }
      )
    }

    console.log('[AI API] API key found, proceeding...')

    // Check if user explicitly wants a formula
    const wantsFormula = /\b(formula|function|equation|write|create|generate)\b/i.test(query)

    // Build the prompt
    const prompt = buildPrompt(query, context, allColumnData, activeCell, selectionRange, wantsFormula)

    // Call OpenAI API
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: wantsFormula 
              ? `You are an Excel formula generator. Convert the user's natural language request into a valid Excel-style formula ONLY. Use A1 notation. Do not explain. Do not include backticks or markdown. Respond ONLY with the formula, starting with '='.`
              : `You are a spreadsheet calculator. The user will ask you to perform calculations on data.

CRITICAL RULES:
1. Perform the EXACT calculation requested using the provided numeric data
2. Return the result in natural language format
3. DO NOT return formulas or code
4. Pay careful attention to the operation: sum, multiply, average, max, min, etc.

RESPONSE FORMAT (use the operation type the user requested):
- For sum/add/total: "sum = <calculated_value>" or "total = <calculated_value>"
- For multiply/product: "product = <calculated_value>"
- For average/mean: "average = <calculated_value>"
- For max/maximum: "max = <calculated_value>"
- For min/minimum: "min = <calculated_value>"
- For count: "count = <calculated_value>"

EXAMPLES:
- Data: [10, 20, 30] → Request: "sum" → Response: "sum = 60"
- Data: [2, 3, 4] → Request: "multiply" → Response: "product = 24"
- Data: [1, 10, 15, 12] → Request: "multiply all numbers" → Response: "product = 1800"
- Data: [10, 20, 30] → Request: "average" → Response: "average = 20"
- Data: [5, 10, 15] → Request: "max" → Response: "max = 15"

IMPORTANT: Verify your calculation is correct before responding.
Do not explain. Just return the formatted result.`,
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.3,
        max_tokens: 200,
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      console.error('[AI API] OpenAI API Error:', error)
      return NextResponse.json(
        { error: 'Failed to generate formula from AI' },
        { status: response.status }
      )
    }

    const data = await response.json()
    const formula = data.choices?.[0]?.message?.content?.trim() || ''

    console.log('[AI API] Generated result:', formula)

    return NextResponse.json({ formula })
  } catch (error) {
    console.error('[AI API] Internal Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

function buildPrompt(
  query: string, 
  context: string, 
  allColumnData: any, 
  activeCell: any, 
  selectionRange: any,
  wantsFormula: boolean
): string {
  let prompt = `${context}\n\nUser request: ${query}\n`

  if (!wantsFormula && allColumnData) {
    console.log('[AI API] All data received:', Object.keys(allColumnData))
    
    // Intelligently detect what the user is asking for
    const queryLower = query.toLowerCase()
    let targetData: any[] = []
    let dataSource = ''
    
    // Check if asking for specific row (e.g., "row 1", "row 2")
    const rowMatch = queryLower.match(/\b(?:row|r)\s*(\d+)\b/i)
    if (rowMatch) {
      const rowNum = parseInt(rowMatch[1])
      const rowKey = `Row ${rowNum}`
      targetData = allColumnData[rowKey] || []
      dataSource = rowKey
      console.log(`[AI API] Detected ${rowKey} query, data:`, targetData)
    }
    
    // Check if asking for specific column (e.g., "column a", "column B")
    const colMatch = queryLower.match(/\b(?:column|col)\s*([a-z])\b/i)
    if (colMatch && !rowMatch) { // Only if not already matched to row
      const colLetter = colMatch[1].toUpperCase()
      const colKey = `Column ${colLetter}`
      targetData = allColumnData[colKey] || []
      dataSource = colKey
      console.log(`[AI API] Detected ${colKey} query, data:`, targetData)
    }
    
    // If no specific row/column mentioned, use the column where the selected cell is
    if (targetData.length === 0 && activeCell) {
      const colLetter = String.fromCharCode(65 + activeCell.col)
      const colKey = `Column ${colLetter}`
      targetData = allColumnData[colKey] || []
      dataSource = `${colKey} (selected cell's column)`
      console.log(`[AI API] No specific target, using selected cell's column:`, dataSource)
    }
    
    // Detect the operation type from the query
    let operation = 'calculate'
    if (/\b(count|how many|number|total.*(?:of|no)|entries|items|people)\b/i.test(queryLower)) operation = 'count'
    else if (/\b(sum|add|plus)\b/i.test(queryLower)) operation = 'sum'
    else if (/\b(multiply|product|times)\b/i.test(queryLower)) operation = 'multiply'
    else if (/\b(average|mean|avg)\b/i.test(queryLower)) operation = 'average'
    else if (/\b(max|maximum|largest|highest)\b/i.test(queryLower)) operation = 'max'
    else if (/\b(min|minimum|smallest|lowest)\b/i.test(queryLower)) operation = 'min'
    
    console.log('[AI API] Detected operation:', operation)
    
    // For count operations, use all data (including text)
    // For numeric operations, filter to numbers only
    const numericValues = targetData.filter((val: any) => typeof val === 'number')
    const allValues = targetData // Includes both numbers and text
    
    console.log('[AI API] All values:', allValues)
    console.log('[AI API] Numeric values:', numericValues)
    
    // Use appropriate dataset based on operation
    const valuesToUse = operation === 'count' ? allValues : numericValues
    
    if (valuesToUse.length > 0) {
      prompt += `\n\n=== IMPORTANT: CALCULATION INSTRUCTIONS ===`
      prompt += `\nData source: ${dataSource}`
      
      if (operation === 'count') {
        // For count, show all items (including text)
        prompt += `\nAll items in ${dataSource}: [${allValues.map(v => typeof v === 'string' ? `"${v}"` : v).join(', ')}]`
        prompt += `\nTotal count: ${allValues.length} items`
        prompt += `\nOperation requested: COUNT`
        prompt += `\n\nYou MUST:`
        prompt += `\n1. COUNT all items (including text and numbers): ${allValues.length}`
        prompt += `\n2. Return: "count = ${allValues.length}"`
      } else {
        // For numeric operations, show only numbers
        prompt += `\nNumbers to use: [${numericValues.join(', ')}]`
        prompt += `\nCount: ${numericValues.length} values`
        prompt += `\nOperation requested: ${operation.toUpperCase()}`
        prompt += `\n\nYou MUST:`
        
        if (operation === 'multiply') {
          const expectedProduct = numericValues.reduce((acc: number, val: number) => acc * val, 1)
          prompt += `\n1. MULTIPLY all these numbers together: ${numericValues.join(' × ')}`
          prompt += `\n2. Calculate: ${numericValues.join(' × ')} = ${expectedProduct}`
          prompt += `\n3. Return: "product = ${expectedProduct}"`
        } else if (operation === 'sum') {
          const expectedSum = numericValues.reduce((acc: number, val: number) => acc + val, 0)
          prompt += `\n1. ADD all these numbers together: ${numericValues.join(' + ')}`
          prompt += `\n2. Calculate: ${numericValues.join(' + ')} = ${expectedSum}`
          prompt += `\n3. Return: "sum = ${expectedSum}"`
        } else if (operation === 'average') {
          const sum = numericValues.reduce((acc: number, val: number) => acc + val, 0)
          const avg = sum / numericValues.length
          prompt += `\n1. ADD all numbers: ${numericValues.join(' + ')} = ${sum}`
          prompt += `\n2. DIVIDE by count: ${sum} ÷ ${numericValues.length} = ${avg}`
          prompt += `\n3. Return: "average = ${avg}"`
        } else if (operation === 'max') {
          const maxVal = Math.max(...numericValues)
          prompt += `\n1. Find the LARGEST number from: ${numericValues.join(', ')}`
          prompt += `\n2. Return: "max = ${maxVal}"`
        } else if (operation === 'min') {
          const minVal = Math.min(...numericValues)
          prompt += `\n1. Find the SMALLEST number from: ${numericValues.join(', ')}`
          prompt += `\n2. Return: "min = ${minVal}"`
        } else {
          prompt += `\n1. Perform the calculation the user requested`
          prompt += `\n2. Use these exact numbers: [${numericValues.join(', ')}]`
          prompt += `\n3. Return the result in natural language format`
        }
      }
      
      prompt += `\n\nDo NOT explain. Just return the result in the format shown above.`
    } else {
      prompt += `\nNo numeric values found in the data.`
    }
  }

  if (wantsFormula) {
    prompt += `\nRespond ONLY with the formula, starting with '='.`
  } else {
    prompt += `\nReturn the answer in natural language format (e.g., "sum = 51" or "average = 12.5").`
  }

  return prompt
}

function handleDataManipulation(
  query: string,
  allColumnData: any,
  activeCell: any,
  selectionRange: any
): any {
  const queryLower = query.toLowerCase()
  
  console.log('[AI API] Handling data manipulation:', query)
  console.log('[AI API] All data keys:', Object.keys(allColumnData || {}))
  
  // Detect target (row or column)
  let targetData: any[] = []
  let targetType: 'row' | 'column' | null = null
  let targetIndex: number = -1
  
  const rowMatch = queryLower.match(/\b(?:row|r)\s*(\d+)\b/i)
  if (rowMatch) {
    const rowNum = parseInt(rowMatch[1])
    const rowKey = `Row ${rowNum}`
    targetData = allColumnData[rowKey] || []
    targetType = 'row'
    targetIndex = rowNum - 1
    console.log(`[AI API] Target: ${rowKey}, data:`, targetData)
  }
  
  const colMatch = queryLower.match(/\b(?:column|col)\s*([a-z])\b/i)
  if (colMatch && !rowMatch) {
    const colLetter = colMatch[1].toUpperCase()
    const colKey = `Column ${colLetter}`
    targetData = allColumnData[colKey] || []
    targetType = 'column'
    targetIndex = colLetter.charCodeAt(0) - 65
    console.log(`[AI API] Target: ${colKey}, data:`, targetData)
  }
  
  if (!targetType || targetData.length === 0) {
    return { error: 'Could not identify target row or column' }
  }
  
  // REMOVE DUPLICATES
  if (/\b(remove|delete)\b.*\b(duplicate|redundant)\b/i.test(queryLower)) {
    const uniqueValues = Array.from(new Set(targetData))
    const removedCount = targetData.length - uniqueValues.length
    
    console.log(`[AI API] Remove duplicates: ${removedCount} removed, ${uniqueValues.length} unique`)
    
    return {
      action: {
        type: 'remove_duplicates',
        target: { type: targetType, index: targetIndex },
        uniqueValues,
        removedCount
      }
    }
  }
  
  // SORT
  if (/\b(sort|order|arrange)\b/i.test(queryLower)) {
    const isDescending = /\b(desc|descending|reverse|high|largest|biggest)\b/i.test(queryLower)
    const isAscending = /\b(asc|ascending|low|smallest)\b/i.test(queryLower) || !isDescending
    
    const sortedValues = [...targetData].sort((a, b) => {
      // Handle numeric sorting
      if (typeof a === 'number' && typeof b === 'number') {
        return isAscending ? a - b : b - a
      }
      // Handle string sorting
      const aStr = String(a).toLowerCase()
      const bStr = String(b).toLowerCase()
      return isAscending ? aStr.localeCompare(bStr) : bStr.localeCompare(aStr)
    })
    
    console.log(`[AI API] Sort ${isAscending ? 'ascending' : 'descending'}:`, sortedValues)
    
    return {
      action: {
        type: 'sort',
        target: { type: targetType, index: targetIndex },
        sortedValues,
        order: isAscending ? 'asc' : 'desc'
      }
    }
  }
  
  // CONVERT TO UPPERCASE/LOWERCASE
  if (/\b(convert|change|transform|make)\b.*\b(uppercase|upper|capital)\b/i.test(queryLower)) {
    const modifications = targetData.map((val, idx) => ({
      row: targetType === 'row' ? targetIndex : idx,
      col: targetType === 'column' ? targetIndex : idx,
      value: typeof val === 'string' ? val.toUpperCase() : val
    }))
    
    return {
      action: {
        type: 'modify',
        modifications
      }
    }
  }
  
  if (/\b(convert|change|transform|make)\b.*\b(lowercase|lower|small)\b/i.test(queryLower)) {
    const modifications = targetData.map((val, idx) => ({
      row: targetType === 'row' ? targetIndex : idx,
      col: targetType === 'column' ? targetIndex : idx,
      value: typeof val === 'string' ? val.toLowerCase() : val
    }))
    
    return {
      action: {
        type: 'modify',
        modifications
      }
    }
  }
  
  // TRIM WHITESPACE
  if (/\b(trim|remove|clean)\b.*\b(space|whitespace)\b/i.test(queryLower)) {
    const modifications = targetData.map((val, idx) => ({
      row: targetType === 'row' ? targetIndex : idx,
      col: targetType === 'column' ? targetIndex : idx,
      value: typeof val === 'string' ? val.trim() : val
    }))
    
    return {
      action: {
        type: 'modify',
        modifications
      }
    }
  }
  
  // DELETE/CLEAR ALL
  if (/\b(delete|clear|remove)\b.*\b(all|everything|data)\b/i.test(queryLower)) {
    const cells = targetData.map((_, idx) => ({
      row: targetType === 'row' ? targetIndex : idx,
      col: targetType === 'column' ? targetIndex : idx
    }))
    
    return {
      action: {
        type: 'delete_cells',
        cells
      }
    }
  }
  
  return { error: 'Could not understand the data manipulation request' }
}
