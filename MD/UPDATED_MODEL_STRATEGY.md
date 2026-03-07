# Updated Model Strategy with GPT OSS 120B

## 🎯 Available Models (Updated)

### 1. Llama 3.1 8B Instant (Interviewer)
**Model:** `llama-3.1-8b-instant`
- Requests: 30/min, 14,400/day ✅
- Tokens: 6K/min, 500K/day ✅

### 2. Llama 3.3 70B Versatile
**Model:** `llama-3.3-70b-versatile`
- Requests: 30/min, 1,000/day ⚠️
- Tokens: 12K/min, 100K/day

### 3. GPT OSS 120B (NEW - BEST!)
**Model:** `openai/gpt-oss-120b`
- Requests: 30/min, 1,000/day ⚠️
- Tokens: 8K/min, 200K/day ✅
- **120B parameters** = More intelligent!

### 4. Qwen 3 32B
**Model:** `qwen/qwen3-32b`
- Requests: 60/min, 1,000/day
- Tokens: 6K/min, 500K/day

---

## 🚀 Optimal Strategy with 120B Model

### Recommended Setup:

```javascript
// Interviewer Agent (Conversational)
model: 'llama-3.1-8b-instant'
usage: 80% of calls
limit: 14,400/day
purpose: Fast conversational questions

// Researcher Agent (Technical Deep-Dive)
model: 'openai/gpt-oss-120b' // 120B - MOST INTELLIGENT
usage: 10% of calls
limit: 500/day (half of 1,000)
purpose: Complex technical probing

// Evaluator Agent (Scoring)
model: 'llama-3.3-70b-versatile' // 70B - Good enough for scoring
usage: 10% of calls
limit: 500/day (half of 1,000)
purpose: Evidence-based evaluation
```

### Why This Setup?

1. **Researcher gets 120B** (most complex task)
   - Needs to understand deep technical concepts
   - Needs to detect vagueness
   - Needs to generate smart probing questions
   - Benefits most from larger model

2. **Evaluator gets 70B** (structured task)
   - Scoring is more structured/deterministic
   - 70B is sufficient for rubric-based evaluation
   - Saves the 120B quota for harder tasks

3. **Interviewer gets 8B** (simple task)
   - Conversational questions are straightforward
   - 8B is fast and cheap
   - Handles 80% of calls

---

## 💰 Cost & Capacity Analysis

### Daily Capacity:
```
Interviewer (8B): 14,400 requests/day
Researcher (120B): 1,000 requests/day
Evaluator (70B): 1,000 requests/day

Per Interview (10 questions):
- 8 questions: Interviewer (8B)
- 1 question: Researcher (120B)
- 1 evaluation: Evaluator (70B)

Max interviews/day: 1,000 (limited by 120B + 70B quota)
```

### Cost (FREE TIER):
```
All within Groq free tier limits
Actual cost: $0/month
```

---

## 🔧 Implementation

### Update Researcher Agent:
```javascript
// server/agents/researcherAgent.js
constructor() {
  this.groq = getGroqService();
  this.model = 'openai/gpt-oss-120b'; // 120B - Most intelligent
}
```

### Keep Evaluator Agent:
```javascript
// server/agents/evaluatorAgent.js
constructor() {
  this.groq = getGroqService();
  this.model = 'llama-3.3-70b-versatile'; // 70B - Good for scoring
}
```

### Keep Interviewer Agent:
```javascript
// server/agents/interviewerAgent.js
constructor() {
  this.groq = getGroqService();
  this.model = 'llama-3.1-8b-instant'; // 8B - Fast & cheap
}
```

---

## 📊 Model Comparison

| Model | Size | Intelligence | Speed | Daily Limit | Best For |
|-------|------|--------------|-------|-------------|----------|
| llama-3.1-8b-instant | 8B | ⭐⭐ | ⚡⚡⚡ | 14,400 | Conversational |
| llama-3.3-70b-versatile | 70B | ⭐⭐⭐⭐ | ⚡⚡ | 1,000 | Evaluation |
| openai/gpt-oss-120b | 120B | ⭐⭐⭐⭐⭐ | ⚡⚡ | 1,000 | Technical Deep-Dive |

---

## ✅ Benefits of Using 120B for Researcher

1. **Better Technical Understanding**
   - Understands complex architectures
   - Better at detecting vagueness
   - More accurate concept extraction

2. **Smarter Probing Questions**
   - Asks more insightful follow-ups
   - Better at challenging assumptions
   - More context-aware

3. **Better Knowledge Integration**
   - Better use of ChromaDB context
   - More relevant technical questions
   - Deeper technical probing

---

## 🎯 Final Configuration

```javascript
// Multi-Agent System Configuration

Interviewer Agent:
  model: llama-3.1-8b-instant (8B)
  usage: 80% of calls
  purpose: Conversational questions
  
Researcher Agent:
  model: openai/gpt-oss-120b (120B) ⭐ NEW
  usage: 10% of calls
  purpose: Technical deep-dive
  
Evaluator Agent:
  model: llama-3.3-70b-versatile (70B)
  usage: 10% of calls
  purpose: Evidence-based scoring
```

---

## 🚀 Action Items

1. ✅ Update Researcher Agent to use `openai/gpt-oss-120b`
2. ✅ Keep Evaluator Agent on `llama-3.3-70b-versatile`
3. ✅ Keep Interviewer Agent on `llama-3.1-8b-instant`
4. ✅ Test with new 120B model
5. ✅ Monitor quality improvement

---

## Summary

**Upgrade:** Researcher Agent now uses 120B model (most intelligent)
**Capacity:** 1,000 interviews/day (free tier)
**Cost:** $0/month
**Quality:** ⭐⭐⭐⭐⭐ (Best possible with free tier)

**Status:** READY TO IMPLEMENT ✅
