# 🚀 Start Demo - Simple Instructions

## Everything is Ready!

The coding interview feature is now integrated into the normal startup process. Just follow these steps:

---

## Step 1: Start Backend

```bash
cd server
npm start
```

This will automatically:
- ✅ Run database migrations (including coding interview tables)
- ✅ Seed 5 coding problems
- ✅ Start the server on port 5000

You should see:
```
🔄 Running database migrations...
✅ Database migrations completed successfully
🌱 Seeding coding problems...
✅ Added: Two Sum (easy)
✅ Added: Valid Parentheses (easy)
✅ Added: Longest Substring Without Repeating Characters (medium)
✅ Added: Merge Intervals (medium)
✅ Added: LRU Cache (hard)
🎉 Coding problems seeded successfully!
🚀 Server running on port 5000
```

---

## Step 2: Start Frontend (New Terminal)

```bash
cd client
npm start
```

Frontend will start on port 3000 and open in your browser.

---

## Step 3: Test Coding Interview

1. **Navigate to:** `http://localhost:3000/interview`
2. **Click:** "Coding Interview" card
3. **Select:** 
   - Language: JavaScript (or any of 8 languages)
   - Duration: 60 minutes
4. **Click:** "Start Coding Interview"
5. **Try it:**
   - Ask: "Can the array be empty?"
   - Submit code: [paste your solution]
   - Type: "next" for next problem
6. **Complete:** Click "Complete Interview"
7. **View:** Results in dashboard

---

## That's It! 🎉

Everything is automated. Just:
1. `npm start` in server
2. `npm start` in client
3. Go to `/interview` and click "Coding Interview"

---

## Quick Demo Script (5 min)

### 1. Start Interview (1 min)
- Show interview type selection
- Select coding interview
- Choose JavaScript + 60 minutes
- Start interview

### 2. Show First Problem (1 min)
- Problem: Two Sum
- Show problem statement, examples, constraints
- Explain: "AI analyzes logic, no code execution"

### 3. Interact with AI (2 min)
- **Ask question:** "Can the array contain duplicates?"
- **AI answers:** Clear explanation
- **Submit code:** [Two Sum solution]
- **AI analyzes:** 
  - ✅ Logic correct
  - ⏱️ Time: O(n)
  - 💾 Space: O(n)
  - 🚀 Optimization feedback

### 4. Next Problem (30 sec)
- Type "next"
- Show medium difficulty problem
- Explain progressive difficulty

### 5. Complete & Results (30 sec)
- Click "Complete Interview"
- Show 5 scoring dimensions
- Show detailed feedback

---

## Features to Highlight

1. **NO Code Execution** - LLM analyzes logic only
2. **Conversational** - Ask questions anytime
3. **Hints Available** - Request hints without solutions
4. **Complexity Analysis** - Time and space complexity
5. **Optimization Focus** - Guides toward better solutions
6. **5 Dimensions** - Comprehensive evaluation

---

## Problem Bank (5 Problems)

| # | Title | Difficulty | Optimal |
|---|-------|------------|---------|
| 1 | Two Sum | Easy | O(n) |
| 2 | Valid Parentheses | Easy | O(n) |
| 3 | Longest Substring | Medium | O(n) |
| 4 | Merge Intervals | Medium | O(n log n) |
| 5 | LRU Cache | Hard | O(1) |

---

## Troubleshooting

### Backend won't start?
```bash
# Check PostgreSQL is running
sudo service postgresql status

# Check .env file has GROQ_API_KEY
cat server/.env | grep GROQ_API_KEY
```

### "Coding problems already exist" warning?
This is normal! It means problems were already seeded. The system won't duplicate them.

### Frontend can't connect?
Make sure backend is running on port 5000:
```bash
curl http://localhost:5000/health
```

---

## 🎊 You're Ready!

Everything is set up and automated. Just start the servers and demo away!

**Total Setup:** 0 commands (already integrated)
**Start Time:** 30 seconds
**Demo Time:** 5 minutes
**Status:** ✅ READY
