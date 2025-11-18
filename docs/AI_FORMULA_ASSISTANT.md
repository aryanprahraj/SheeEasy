# AI Formula Assistant Setup Guide

## Overview

The AI Formula Assistant allows users to generate Excel-style formulas from natural language descriptions. It uses OpenAI's GPT-4o-mini model to convert plain English requests into valid spreadsheet formulas.

## Features

- **Natural Language Input**: Describe what you want to calculate in plain English
- **Context-Aware**: Uses sheet headers, sample data, and selected cell position
- **Excel-Compatible**: Generates standard Excel formulas with A1 notation
- **Smart Insertion**: Automatically enters edit mode after generating formula
- **Error Handling**: Sanitizes responses and provides clear error messages
- **Undo/Redo Support**: Formula insertion is a single undo step

## Setup Instructions

### 1. Get an OpenAI API Key

1. Go to [https://platform.openai.com/api-keys](https://platform.openai.com/api-keys)
2. Sign in or create an account
3. Click "Create new secret key"
4. Copy the key (you won't be able to see it again)

### 2. Configure Environment Variables

1. Copy `.env.local.example` to `.env.local`:
   ```bash
   cp .env.local.example .env.local
   ```

2. Edit `.env.local` and add your OpenAI API key:
   ```env
   OPENAI_API_KEY=sk-...your-key-here
   ```

3. Restart the development server:
   ```bash
   npm run dev
   ```

## Usage

### Basic Usage

1. Select a cell in your spreadsheet
2. Click the **"AI Formula"** button (purple button with sparkle icon) next to the formula bar
3. Type what you want to calculate in plain English, for example:
   - "sum all values in column A"
   - "average of B2 to B10"
   - "multiply column C by column D"
   - "count non-empty cells in row 5"
   - "find the maximum value in the selected range"
4. Press Enter or click "Generate"
5. The formula will be inserted and you'll be in edit mode

### Example Queries

**Simple Math:**
- "add 5 and 10"
- "multiply A2 by B2"
- "divide total sales by number of items"

**Aggregations:**
- "sum all values in column A"
- "average of B2 through B10"
- "count numbers in C:C"
- "find max in D2:D20"

**Conditional:**
- "if A2 is greater than 100, show 'High', otherwise 'Low'"
- "count cells in column E that are above 50"

**Text:**
- "combine first name and last name with a space"
- "extract first 3 characters from A2"
- "convert to uppercase"

### Tips for Best Results

1. **Use Clear Column References**: 
   - ✅ "sum column A"
   - ✅ "average B2 to B10"
   - ❌ "sum the numbers" (ambiguous)

2. **Provide Context**: The AI can see:
   - Column headers (first row)
   - Your active cell position
   - Selected range (if any)
   - Sample data from first few rows

3. **Be Specific**: 
   - ✅ "multiply column C by 1.08"
   - ❌ "add tax" (unclear what tax rate)

4. **Use Excel Terminology**:
   - The AI understands Excel function names (SUM, AVERAGE, IF, VLOOKUP, etc.)

## Architecture

### Components

**AIFormulaButton.tsx**
- UI component with modal/popover
- Handles user input and loading states
- Displays errors and provides feedback

**FormulaBar.tsx**
- Integrates AI button next to formula bar
- Collects context (headers, sample data)
- Inserts generated formula into active cell

### Backend

**lib/aiFormula.ts**
- Core logic for generating formulas
- Builds context from sheet data
- Sanitizes AI responses
- Validates formula format

**app/api/ai-formula/route.ts**
- API endpoint for OpenAI integration
- Sends prompts to GPT-4o-mini
- Returns formula string

### Security

- **Input Sanitization**: All AI responses are sanitized
- **Formula-Only Output**: System prompt restricts to formulas only
- **Dangerous Pattern Detection**: Blocks eval, Function, script tags
- **No Arbitrary Code**: Only valid Excel formulas are inserted

### Error Handling

- Missing API key: Shows configuration error
- Invalid formula: Shows error tooltip
- Network errors: Displays user-friendly message
- Malformed responses: Validates and sanitizes

## Cost Considerations

- Uses GPT-4o-mini model (cost-effective)
- Typical cost: ~$0.0001-0.0003 per formula generation
- Context is kept minimal to reduce token usage
- Only sends first 3 rows as sample data

## Troubleshooting

### "OpenAI API key not configured"
- Make sure `OPENAI_API_KEY` is set in `.env.local`
- Restart the dev server after adding the key

### "Failed to generate formula"
- Check your OpenAI API key is valid
- Verify you have API credits available
- Check network connection

### Formula doesn't work as expected
- Try rephrasing your request more specifically
- Include exact cell references (e.g., "A2:A10")
- Check that column headers are descriptive

### Button doesn't appear
- Make sure lucide-react is installed: `npm install lucide-react`
- Check that FormulaBar component is properly imported

## Development

### Testing Locally

1. Set up `.env.local` with your API key
2. Run the dev server: `npm run dev`
3. Open spreadsheet and test the AI Formula button
4. Check browser console for any errors

### Customization

**Change AI Model:**
Edit `app/api/ai-formula/route.ts`:
```typescript
model: 'gpt-4o-mini', // Change to 'gpt-4' for better results
```

**Adjust Temperature:**
```typescript
temperature: 0.3, // Lower = more deterministic, Higher = more creative
```

**Modify System Prompt:**
Edit the system message in `route.ts` to change AI behavior

## Future Enhancements

- [ ] Formula explanation mode
- [ ] Multi-cell formula suggestions
- [ ] Formula optimization recommendations
- [ ] Learning from user corrections
- [ ] Support for custom functions
- [ ] Batch formula generation

## Support

If you encounter issues:
1. Check the browser console for errors
2. Verify your OpenAI API key is valid
3. Ensure all dependencies are installed
4. Check that `.env.local` is properly configured

## License

Part of SheeEasy spreadsheet application.
