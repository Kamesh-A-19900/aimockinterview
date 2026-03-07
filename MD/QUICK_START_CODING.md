# 🚀 Coding Interview - Quick Start Guide

## Setup (One Command)

```bash
cd server
node scripts/setupCodingInterview.js
```

This automatically:
- ✅ Runs database migration
- ✅ Seeds 5 coding problems
- ✅ Verifies setup

---

## Start Servers

### Terminal 1 - Backend
```bash
cd server
npm start
```

### Terminal 2 - Frontend
```bash
cd client
npm start
```

---

## Test the Feature

1. **Open Browser:** `http://localhost:3000/interview`
2. **Click:** "Coding Interview" card
3. **Select:** JavaScript + 60 minutes
4. **Click:** "Start Coding Interview"
5. **Try:**
   - Ask: "Can the array be empty?"
   - Submit code: [paste solution]
   - Type: "next" for next problem
6. **Complete:** Click "Complete Interview"
7. **View:** Results in dashboard

---

## Demo Flow (5 minutes)

### 1. Introduction (30 sec)
"AI-powered coding interview with logic analysis, no code execution"

### 2. Start Interview (30 sec)
- Select JavaScript
- Select 60 minutes
- Start interview

### 3. Show Interaction (2 min)
- **Ask question:** "Can the array contain duplicates?"
- **Discuss approach:** "I'll use a hash map for O(1) lookup"
- **Submit code:** [Two Sum solution]
- **Show analysis:** Correctness, complexity, optimization

### 4. Next Problem (1 min)
- Type "next"
- Show medium difficulty problem
- Explain progressive difficulty

### 5. Complete & Results (1 min)
- Click "Complete Interview"
- Show 5 scoring dimensions
- Show detailed feedback

---

## Problem Bank

| # | Title | Difficulty | Optimal |
|---|-------|------------|---------|
| 1 | Two Sum | Easy | O(n) |
| 2 | Valid Parentheses | Easy | O(n) |
| 3 | Longest Substring | Medium | O(n) |
| 4 | Merge Intervals | Medium | O(n log n) |
| 5 | LRU Cache | Hard | O(1) |

---

## Key Features to Highlight

1. **NO Code Execution** - LLM analyzes logic only
2. **Conversational** - Ask questions, discuss approach
3. **Hints Available** - Request hints without solutions
4. **Complexity Analysis** - Time and space complexity
5. **Optimization Focus** - Guides toward better solutions
6. **5 Dimensions** - Comprehensive evaluation

---

## Troubleshooting

### Setup fails?
```bash
# Check PostgreSQL is running
sudo service postgresql status

# Check database exists
psql -U your_username -l | grep mockinterview
```

### Backend won't start?
```bash
# Check .env file exists
cat server/.env | grep GROQ_API_KEY

# Check port 5000 is free
lsof -i :5000
```

### Frontend won't connect?
```bash
# Ensure backend is running on port 5000
curl http://localhost:5000/health
```

---

## Files to Check

### Backend
- `server/agents/codingAgent.js` - Code analysis
- `server/agents/codingEvaluator.js` - Evaluation
- `server/controllers/codingController.js` - API logic
- `server/routes/coding.js` - Endpoints

### Frontend
- `client/src/pages/Interview.js` - UI integration

### Database
- `server/database/migrations/add_coding_interview_tables.sql` - Schema
- `server/database/seedCodingProblems.js` - Problems

---

## Status Check

```bash
# Check tables exist
psql -U your_username -d mockinterview -c "SELECT COUNT(*) FROM coding_problems;"

# Should return: 5

# Check problems by difficulty
psql -U your_username -d mockinterview -c "SELECT difficulty, COUNT(*) FROM coding_problems GROUP BY difficulty;"

# Should show: easy (2), medium (2), hard (1)
```

---

## 🎉 Ready to Demo!

Everything is set up and ready. Just run the setup script, start the servers, and you're good to go!

**Total Setup Time:** < 2 minutes
**Demo Time:** 5 minutes
**Status:** ✅ PRODUCTION READY
