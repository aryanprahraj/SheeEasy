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
              : `You are an expert spreadsheet calculator. You perform ACCURATE calculations on numerical data.

CRITICAL RULES:
1. Perform EXACT calculations - verify your math
2. Handle simple operations: sum, average, multiply, max, min, count
3. Handle complex operations: "sum of avg of A and avg of B", "multiply max of A and min of B"
4. Handle division: "divide sum of A by count of B"
5. Handle subtraction: "subtract avg of B from avg of A"
6. For multi-step calculations: compute each intermediate value, then combine
7. Return ONLY the final result in the specified format
8. DO NOT explain your work

RESPONSE FORMATS:
- Sum/Add/Total: "sum = <number>" or "total = <number>"
- Multiply/Product: "product = <number>"
- Divide/Division: "result = <number>" or "division = <number>"
- Subtract/Difference: "result = <number>" or "difference = <number>"
- Average/Mean: "average = <number>"
- Maximum: "max = <number>"
- Minimum: "min = <number>"
- Count: "count = <number>"
- Complex: "result = <number>"

EXAMPLES:
Simple:
- [10, 20, 30] → "sum" → "sum = 60"
- [10, 20, 30] → "average" → "average = 20"
- [2, 3, 4] → "multiply" → "product = 24"
- [5, 10, 15, 20] → "max" → "max = 20"

Complex:
- Col A [10, 20], Col B [30, 40] → "sum of avg A and avg B" → Steps: avg(A)=15, avg(B)=35, sum=50 → "sum = 50"
- Col A [5, 15], Col B [10, 20] → "multiply avg A and avg B" → Steps: avg(A)=10, avg(B)=15, product=150 → "product = 150"
- Col A [100, 200], Col B [2, 4] → "divide sum of A by avg of B" → Steps: sum(A)=300, avg(B)=3, result=100 → "result = 100"
- Col A [50, 100], Col B [10, 20] → "subtract avg B from avg A" → Steps: avg(A)=75, avg(B)=15, result=60 → "result = 60"

For complex queries:
1. Parse the operation structure (e.g., "sum of [avg of A] and [avg of B]")
2. Calculate each intermediate result with the provided data
3. Apply final operation to combine
4. Double-check your math
5. Return formatted answer

Be precise. Verify calculations. Return only the result.`,
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
    
    // Check for multiple rows first (e.g., "row 1 and 2", "rows 1, 2, 3")
    const rowMatches = (queryLower.match(/\b(?:row|r)\s*(\d+)/gi) || []).map(m => {
      const num = m.match(/\d+/)
      return num ? parseInt(num[0]) : null
    }).filter((n): n is number => n !== null)
    const rowNumbers = Array.from(new Set(rowMatches))
    
    if (rowNumbers.length > 0) {
      // Combine data from all mentioned rows
      targetData = []
      const sources: string[] = []
      for (const rowNum of rowNumbers) {
        const rowKey = `Row ${rowNum}`
        const rowData = allColumnData[rowKey] || []
        targetData.push(...rowData)
        sources.push(rowKey)
      }
      dataSource = sources.length > 1 ? sources.join(' + ') : sources[0]
      console.log(`[AI API] Detected rows ${rowNumbers.join(', ')}, data:`, targetData)
    }
    // Check for multiple columns (e.g., "column D and E", "columns A, B, C")
    else {
      const colMatches = (queryLower.match(/\b(?:column|col)s?\s*([a-z])\b/gi) || []).map(m => {
        const letter = m.match(/([a-z])$/i)
        return letter ? letter[1].toUpperCase() : null
      }).filter((l): l is string => l !== null)
      const columnLetters = Array.from(new Set(colMatches))
      
      if (columnLetters.length > 0) {
        // Check if query has nested operations (e.g., "sum of avg of A and avg of B")
        const hasNestedOps = /\b(sum|multiply|add|product)\s+of\s+(avg|average|sum|max|min)/i.test(queryLower)
        
        if (hasNestedOps && columnLetters.length > 1) {
          // For complex queries, provide data per column so AI can do multi-step calc
          const columnDataMap: Record<string, number[]> = {}
          for (const colLetter of columnLetters) {
            const colKey = `Column ${colLetter}`
            const colData = (allColumnData[colKey] || []).filter((v: any) => typeof v === 'number')
            columnDataMap[colKey] = colData
          }
          
          // Build detailed prompt for complex calculation
          prompt += `\n\n=== COMPLEX CALCULATION ===`
          prompt += `\nUser query: "${query}"`
          prompt += `\n\nDATA BY COLUMN:`
          for (const [colKey, values] of Object.entries(columnDataMap)) {
            prompt += `\n${colKey}: [${values.join(', ')}]`
          }
          prompt += `\n\nINSTRUCTIONS:`
          prompt += `\n1. Identify each intermediate calculation needed (e.g., average of each column)`
          prompt += `\n2. Compute each intermediate result`
          prompt += `\n3. Apply final operation to combine results`
          prompt += `\n4. Return answer in format: "<operation> = <final_result>"`
          
          return prompt
        } else {
          // Simple multi-column: combine all data
          targetData = []
          const sources: string[] = []
          for (const colLetter of columnLetters) {
            const colKey = `Column ${colLetter}`
            const colData = allColumnData[colKey] || []
            targetData.push(...colData)
            sources.push(colKey)
          }
          dataSource = sources.length > 1 ? sources.join(' + ') : sources[0]
          console.log(`[AI API] Detected columns ${columnLetters.join(', ')}, data:`, targetData)
        }
      }
    }
    
    // If no specific row/column mentioned, use the column where the selected cell is
    if (targetData.length === 0 && activeCell) {
      const colLetter = String.fromCharCode(65 + activeCell.col)
      const colKey = `Column ${colLetter}`
      targetData = allColumnData[colKey] || []
      dataSource = `${colKey} (selected cell's column)`
      console.log(`[AI API] No specific target, using selected cell's column:`, dataSource)
    }
    
    // Detect the operation type - check most specific first
    let operation = 'calculate'
    if (/\b(divide|division|ratio)\b/i.test(queryLower)) operation = 'divide'
    else if (/\b(subtract|minus|difference|less)\b/i.test(queryLower)) operation = 'subtract'
    else if (/\b(sum|add(?!ress)|total|sum up)\b/i.test(queryLower)) operation = 'sum'
    else if (/\b(multiply|product|times|multiplication)\b/i.test(queryLower)) operation = 'multiply'
    else if (/\b(average|mean|avg)\b/i.test(queryLower)) operation = 'average'
    else if (/\b(max(?:imum)?|largest|highest|biggest)\b/i.test(queryLower)) operation = 'max'
    else if (/\b(min(?:imum)?|smallest|lowest|least)\b/i.test(queryLower)) operation = 'min'
    else if (/\b(percent(?:age)?|%)\b/i.test(queryLower)) operation = 'percent'
    else if (/\b(count|how many entries|number of (?:entries|items|values))\b/i.test(queryLower)) operation = 'count'
    
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
      prompt += `\n\n=== DATA FOR CALCULATION ===`
      prompt += `\nData source: ${dataSource}`
      
      if (operation === 'count') {
        prompt += `\nAll items: [${allValues.map(v => typeof v === 'string' ? `"${v}"` : v).join(', ')}]`
        prompt += `\nOperation: COUNT all items (including text and numbers)`
        prompt += `\n\nPerform the count and return: "count = <result>"`
      } else {
        prompt += `\nNumeric values: [${numericValues.join(', ')}]`
        prompt += `\nOperation: ${operation.toUpperCase()}`
        
        if (operation === 'sum') {
          prompt += `\n\nADD all numbers together: ${numericValues.join(' + ')}`
          prompt += `\nReturn: "sum = <result>"`
        } else if (operation === 'multiply') {
          prompt += `\n\nMULTIPLY all numbers together: ${numericValues.join(' × ')}`
          prompt += `\nReturn: "product = <result>"`
        } else if (operation === 'divide') {
          if (numericValues.length >= 2) {
            prompt += `\n\nDIVIDE: ${numericValues[0]} ÷ ${numericValues.slice(1).join(' ÷ ')}`
            prompt += `\nReturn: "result = <result>"`
          } else {
            prompt += `\n\nNeed at least 2 values for division. Return: "error = insufficient data"`
          }
        } else if (operation === 'subtract') {
          if (numericValues.length >= 2) {
            prompt += `\n\nSUBTRACT: ${numericValues[0]} - ${numericValues.slice(1).join(' - ')}`
            prompt += `\nReturn: "result = <result>"`
          } else {
            prompt += `\n\nNeed at least 2 values for subtraction. Return: "error = insufficient data"`
          }
        } else if (operation === 'average') {
          prompt += `\n\nCalculate AVERAGE: (${numericValues.join(' + ')}) ÷ ${numericValues.length}`
          prompt += `\nReturn: "average = <result>"`
        } else if (operation === 'max') {
          prompt += `\n\nFind MAXIMUM value from: ${numericValues.join(', ')}`
          prompt += `\nReturn: "max = <result>"`
        } else if (operation === 'min') {
          prompt += `\n\nFind MINIMUM value from: ${numericValues.join(', ')}`
          prompt += `\nReturn: "min = <result>"`
        } else if (operation === 'percent') {
          if (numericValues.length >= 2) {
            prompt += `\n\nCalculate PERCENTAGE: (${numericValues[0]} / ${numericValues[1]}) × 100`
            prompt += `\nReturn: "result = <result>%"`
          } else {
            prompt += `\n\nNeed 2 values for percentage. Return: "error = insufficient data"`
          }
        } else {
          prompt += `\n\nPerform the calculation using: [${numericValues.join(', ')}]`
          prompt += `\nReturn in format: "<operation> = <result>"`
        }
      }
      
      prompt += `\n\nIMPORTANT: Calculate accurately. Do NOT explain. Just return the result.`
    } else {
      prompt += `\n\nNo numeric values found in the data.`
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
