# 🚀 AI Formula Assistant - Quick Start

## ⚡ 3-Step Setup

### 1️⃣ Get OpenAI API Key
- Visit: https://platform.openai.com/api-keys
- Create account or sign in
- Click "Create new secret key"
- Copy the key (starts with `sk-`)

### 2️⃣ Add to Environment
```bash
# Create .env.local file
cp .env.local.example .env.local

# Edit .env.local and add:
OPENAI_API_KEY=sk-your-actual-key-here
```

### 3️⃣ Restart Server
```bash
npm run dev
```

## 🎯 How to Use

1. **Select a cell** in your spreadsheet
2. **Click the purple "AI Formula" button** (with sparkle icon) next to the formula bar
3. **Type your request** in plain English:
   - "sum all values in column A"
   - "average of B2 to B10"
   - "total this column"
   - "count these numbers"
4. **Press Enter** or click "Generate"
5. **The calculated result appears** in the cell (e.g., "45" not "=SUM(A:A)")!

**💡 Important:** By default, the AI **calculates and returns the actual result**, not a formula.
- Want the result? Say "sum column A" → Get: **123**
- Want a formula? Say "create a formula to sum column A" → Get: **=SUM(A:A)**

## 💡 Example Requests

### Math Operations
```
add A2 and B2
multiply column C by 1.08
divide D2 by E2
```

### Calculations (Returns Actual Results)
```
sum all values in column A          → Result: 450
average of B2 through B50           → Result: 23.7
count non-empty cells in column C   → Result: 15
find the maximum in D2:D20          → Result: 99
total this column                   → Result: 1250
```

### Formulas (Explicitly Request)
```
create a formula to sum column A              → Result: =SUM(A:A)
write a formula for average of B2 to B50      → Result: =AVERAGE(B2:B50)
generate a formula: if A2 > 100 show "High"   → Result: =IF(A2>100,"High","Low")
```

### Text Results
```
combine first name in A2 and last name in B2  → Result: John Smith
what is the value in A2                       → Result: (shows the value)
```

## ✨ Features

- ✅ **Calculates actual results** by default (not formulas)
- ✅ Reads all column data automatically
- ✅ Performs real calculations (sum, average, count, etc.)
- ✅ Returns plain numeric results
- ✅ Can generate formulas if explicitly requested
- ✅ Context-aware (knows selected cell and range)
- ✅ Works with undo/redo
- ✅ Safe and sanitized output

## 🔐 Security

- API key stays private (server-side only)
- Responses are sanitized
- Only formulas are inserted (no code execution)

## 💰 Cost

- Uses GPT-4o-mini (very cheap)
- ~$0.0001-0.0003 per formula
- Most usage stays under $0.01/month

## 🐛 Troubleshooting

**Button doesn't work?**
- Make sure you added `OPENAI_API_KEY` to `.env.local`
- Restart the server after adding the key

**Formula doesn't make sense?**
- Try being more specific with cell references
- Use Excel terminology (SUM, AVERAGE, IF, etc.)

**Error message?**
- Check your API key is valid
- Verify you have OpenAI credits
- Check internet connection

## 📖 Full Documentation

See `docs/AI_FORMULA_ASSISTANT.md` for complete documentation.

---

**Ready to try it? Click the purple "AI Formula" button and start generating formulas! ✨**
