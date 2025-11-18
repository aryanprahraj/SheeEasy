# 🧪 AI Calculation Test Suite

## Test All These Scenarios to Ensure Everything Works

### ✅ Basic Single Column Operations

**Test Data Setup:**
- Column A: 10, 20, 30, 40
- Column B: 5, 10, 15, 20
- Column C: 100, 200, 300

#### Test Cases:
1. ✅ "sum of column A" → **Expected: sum = 100**
2. ✅ "average of column B" → **Expected: average = 12.5**
3. ✅ "multiply column B" → **Expected: product = 15000**
4. ✅ "max of column A" → **Expected: max = 40**
5. ✅ "min of column B" → **Expected: min = 5**
6. ✅ "count entries in column C" → **Expected: count = 3**

---

### ✅ Multi-Column Simple Operations

#### Test Cases:
7. ✅ "add column A and column B" → **Expected: sum = 150** (100 + 50)
8. ✅ "multiply column A and column B" → **Expected: product = 6000000000** (10×20×30×40×5×10×15×20)
9. ✅ "average of column A and column B" → **Expected: average = 18.75** ((10+20+30+40+5+10+15+20)/8)
10. ✅ "sum of all entries in column C" → **Expected: sum = 600**

---

### ✅ Complex Nested Operations

**This is the critical section - these MUST work perfectly!**

#### Test Cases:
11. ✅ **"sum of avg of column A and avg of column B"**
   - avg(A) = (10+20+30+40)/4 = 25
   - avg(B) = (5+10+15+20)/4 = 12.5
   - sum = 25 + 12.5 = **37.5**
   - **Expected: sum = 37.5**

12. ✅ **"multiply avg of column A and avg of column B"**
   - avg(A) = 25
   - avg(B) = 12.5
   - product = 25 × 12.5 = **312.5**
   - **Expected: product = 312.5**

13. ✅ **"sum of max of column A and min of column B"**
   - max(A) = 40
   - min(B) = 5
   - sum = 40 + 5 = **45**
   - **Expected: sum = 45**

14. ✅ **"multiply sum of column A and sum of column B"**
   - sum(A) = 100
   - sum(B) = 50
   - product = 100 × 50 = **5000**
   - **Expected: product = 5000**

---

### ✅ Division Operations

#### Test Cases:
15. ✅ **"divide sum of column A by avg of column B"**
   - sum(A) = 100
   - avg(B) = 12.5
   - result = 100 ÷ 12.5 = **8**
   - **Expected: result = 8**

16. ✅ **"divide max of column C by min of column B"**
   - max(C) = 300
   - min(B) = 5
   - result = 300 ÷ 5 = **60**
   - **Expected: result = 60**

---

### ✅ Subtraction Operations

#### Test Cases:
17. ✅ **"subtract avg of column B from avg of column A"**
   - avg(A) = 25
   - avg(B) = 12.5
   - result = 25 - 12.5 = **12.5**
   - **Expected: result = 12.5**

18. ✅ **"difference between max of column A and min of column A"**
   - max(A) = 40
   - min(A) = 10
   - result = 40 - 10 = **30**
   - **Expected: result = 30**

---

### ✅ Percentage Operations

#### Test Cases:
19. ✅ **"what percentage is sum of B compared to sum of A"**
   - sum(B) = 50
   - sum(A) = 100
   - result = (50/100) × 100 = **50%**
   - **Expected: result = 50%**

---

### ✅ Mixed Complex Operations

#### Test Cases:
20. ✅ **"add sum of A and multiply of B"**
   - sum(A) = 100
   - multiply(B) = 5×10×15×20 = 15000
   - sum = 100 + 15000 = **15100**
   - **Expected: sum = 15100**

21. ✅ **"average of max A, min A, and avg B"**
   - max(A) = 40
   - min(A) = 10
   - avg(B) = 12.5
   - average = (40+10+12.5)/3 = **20.83**
   - **Expected: average = 20.83**

---

## 🎯 Critical Success Criteria

### Must Work Perfectly:
1. ✅ Single column operations (sum, avg, multiply, max, min, count)
2. ✅ Multi-column operations (combine data from multiple columns)
3. ✅ **Nested operations** (sum of avg, multiply of max, etc.)
4. ✅ Division and subtraction
5. ✅ Complex mixed operations

### Edge Cases to Handle:
- Empty columns
- Text in numeric columns (should filter out)
- Single value columns
- Columns with zeros
- Very large numbers
- Decimal precision

---

## 📊 Test Execution

### How to Test:
1. Create a spreadsheet with the test data above
2. Try each query one by one
3. Verify the result matches the expected value
4. If ANY test fails, debug immediately

### Expected Behavior:
- ✅ All calculations should be mathematically accurate
- ✅ Results should appear within 2-3 seconds
- ✅ Format should be clean: "sum = 100" not "The sum is 100"
- ✅ No explanations - just the result
- ✅ Decimal precision should be reasonable (2-4 decimal places)

---

## 🚨 If Tests Fail

### Debugging Steps:
1. Check browser console for API errors
2. Verify column data is being sent correctly
3. Check OpenAI API response
4. Review prompt being sent to AI
5. Verify operation detection logic

### Common Issues:
- ❌ Multi-column data not combining correctly
- ❌ Operation detection picking wrong operation
- ❌ AI not understanding nested operations
- ❌ Numeric filtering removing valid numbers
- ❌ Format parsing errors

---

## ✨ Success Metrics

**Before Sharing with Others:**
- [ ] All 21 test cases pass
- [ ] Complex nested operations work perfectly
- [ ] Response time < 3 seconds
- [ ] No calculation errors
- [ ] Clean, professional output
- [ ] Works consistently (test each query 3 times)

**This is your main feature - it MUST be perfect!**
