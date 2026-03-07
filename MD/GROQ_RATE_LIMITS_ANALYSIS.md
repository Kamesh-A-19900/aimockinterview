# Groq Rate Limits Analysis & Strategy

## 📊 Available Models & Limits

### 1. Llama 3.1 8B Instant (BEST for Interviewer)
**Model:** `llama-3.1-8b-instant`

**Limits:**
- Requests: 30/min, 14,400/day ✅ EXCELLENT
- Tokens: 6K/min, 500K/day ✅ EXCELLENT

**Use Case:** Interviewer Agent (70% of calls)
- Fast conversational questions
- Cheap and abundant
- Perfect for high-volume usage

---

### 2. Llama 3.3 70B Versatile (GOOD but LIMITED)
**Model:** `llama-3.3-70b-versatile`

**Limits:**
- Requests: 30/min, 1,000/day ⚠️ LIMITED
- Tokens: 12K/min, 100K/day ⚠️ LIMITED

**Use Case:** Researcher & Evaluator Agents (30% of calls)
- Technical deep-dive questions
- Evaluation scoring
- Limited daily quota

**Problem:** Only 1,000 requests/day for BOTH Researcher + Evaluator

---

### 3. GPT OSS 20B (ALTERNATIVE)
**Model:** `openai/gpt-oss-20b`

**Limits:**
- Requests: 30/min, 1,000/day
- Tokens: 8K/min, 200K/day

**Not recommended:** Similar limits to 70B, less capable

---

### 4. Qwen 3 32B (BEST ALTERNATIVE)
**Model:** `qwen/qwen3-32b`

**Limits:**
- Requests: 60/min, 1,000/day ✅ GOOD
- Tokens: 6K/min, 500K/day ✅ EXCELLENT

**Use Case:** Could replace Researcher Agent
- More requests per minute (60 vs 30)
- Same daily limit (1,000)
- Better token allowance

---

### 5. Groq Compound (NOT SUITABLE)
**Model:** `groq/compound`

**Limits:**
- Requests: 30/min, 250/day ❌ TOO LIMITED
- Tokens: N/A

**Not recommended:** Too few daily requests

---

## 🎯 Optimal Strategy

### Current Setup (NEEDS ADJUSTMENT):
```
Interviewer: llama-3.1-8b-instant (14,400/day) ✅
Researcher: llama-3.3-70b-versatile (1,000/day) ⚠️
Evaluator: llama-3.3-70b-versatile (1,000/day) ⚠️
```

**Problem:** Researcher + Evaluator share 1,000 daily requests

---

### Recommended Setup:

#### Option 1: Split 70B Quota (CONSERVATIVE)
```
Interviewer: llama-3.1-8b-instant (14,400/day)
Researcher: llama-3.3-70b-versatile (700/day)
Evaluator: llama-3.3-70b-versatile (300/day)
```

**Daily Capacity:**
- 70% Interviewer (8B): 700 interviews × 7 questions = 4,900 calls ✅
- 20% Researcher (70B): 700 interviews × 2 questions = 1,400 calls ❌ EXCEEDS
- 10% Evaluator (70B): 700 interviews × 1 eval = 700 calls ❌ EXCEEDS

**Max interviews/day:** ~476 interviews (limited by 70B quota)

---

#### Option 2: Use Qwen for Researcher (RECOMMENDED)
```
Interviewer: llama-3.1-8b-instant (14,400/day)
Researcher: qwen/qwen3-32b (1,000/day)
Evaluator: llama-3.3-70b-versatile (1,000/day)
```

**Daily Capacity:**
- 70% Interviewer (8B): 1,000 interviews × 7 questions = 7,000 calls ✅
- 20% Researcher (32B): 1,000 interviews × 2 questions = 2,000 calls ❌ EXCEEDS
- 10% Evaluator (70B): 1,000 interviews × 1 eval = 1,000 calls ✅

**Max interviews/day:** ~500 interviews (limited by Researcher quota)

---

#### Option 3: Reduce Researcher Usage (BEST)
```
Interviewer: llama-3.1-8b-instant (14,400/day)
Researcher: llama-3.3-70b-versatile (500/day) - 10% of calls
Evaluator: llama-3.3-70b-versatile (500/day) - 10% of calls
```

**Routing Strategy:**
- 80% Interviewer (8B) - 8 questions
- 10% Researcher (70B) - 1 question
- 10% Evaluator (70B) - 1 evaluation

**Daily Capacity:**
- 80% Interviewer: 5,000 interviews × 8 questions = 40,000 calls ✅ (limit: 14,400)
- 10% Researcher: 5,000 interviews × 1 question = 5,000 calls ❌ (limit: 500)
- 10% Evaluator: 5,000 interviews × 1 eval = 5,000 calls ❌ (limit: 500)

**Max interviews/day:** ~500 interviews (limited by 70B quota)

---

## 💰 Cost Analysis (500 interviews/day)

### Option 3 (Recommended):
```
Per Interview (10 questions):
- 8 questions: Interviewer (8B) = $0.0001 × 8 = $0.0008
- 1 question: Researcher (70B) = $0.001 × 1 = $0.001
- 1 evaluation: Evaluator (70B) = $0.001 × 1 = $0.001
Total: $0.0028 per interview

Daily (500 interviews):
- Total cost: $1.40/day
- Monthly cost: $42/month

With Groq free tier:
- Actual cost: $0 (within free limits)
```

---

## 🚀 Implementation Strategy

### 1. Update Router Logic
Adjust routing percentages:
- 80% → Interviewer (was 70%)
- 10% → Researcher (was 20%)
- 10% → Evaluator (was 10%)

### 2. Add Rate Limit Tracking
```javascript
class RateLimitTracker {
  constructor() {
    this.limits = {
      'llama-3.1-8b-instant': { daily: 14400, used: 0 },
      'llama-3.3-70b-versatile': { daily: 1000, used: 0 },
      'qwen/qwen3-32b': { daily: 1000, used: 0 }
    };
  }
  
  canMakeRequest(model) {
    return this.limits[model].used < this.limits[model].daily;
  }
  
  trackRequest(model) {
    this.limits[model].used++;
  }
  
  resetDaily() {
    Object.keys(this.limits).forEach(model => {
      this.limits[model].used = 0;
    });
  }
}
```

### 3. Fallback Strategy
If 70B quota exhausted:
- Researcher → Use Interviewer (8B) with technical prompt
- Evaluator → Use simple heuristic scoring

---

## 📈 Scalability

### Current Limits:
- **500 interviews/day** (limited by 70B quota)
- **15,000 interviews/month**

### To Scale Beyond:
1. **Use multiple Groq accounts** (not recommended)
2. **Reduce 70B usage** (use 8B more)
3. **Add paid tier** (if Groq offers)
4. **Use alternative providers** (OpenRouter, Together AI)

---

## ✅ Recommended Configuration

### Final Setup:
```javascript
// Interviewer Agent
model: 'llama-3.1-8b-instant'
usage: 80% of calls
limit: 14,400/day

// Researcher Agent  
model: 'llama-3.3-70b-versatile'
usage: 10% of calls
limit: 500/day (half of 1,000)

// Evaluator Agent
model: 'llama-3.3-70b-versatile'
usage: 10% of calls
limit: 500/day (half of 1,000)
```

### Routing Logic:
```javascript
// Use Researcher only for VERY technical answers
if (hasTechnicalConcept(answer) && isComplex(answer)) {
  return researcher; // 10% of calls
}

// Default to Interviewer for everything else
return interviewer; // 80% of calls
```

---

## 🎯 Action Items

1. ✅ Keep current models (8B + 70B)
2. ✅ Adjust routing: 80% Interviewer, 10% Researcher, 10% Evaluator
3. ✅ Add rate limit tracking
4. ✅ Add fallback to 8B if 70B quota exhausted
5. ✅ Monitor daily usage

---

## Summary

**Current Capacity:** 500 interviews/day (free tier)
**Cost:** $0/month (within free limits)
**Bottleneck:** 70B model (1,000 requests/day shared)
**Solution:** Reduce 70B usage to 20% of calls (10% Researcher + 10% Evaluator)

**Status:** OPTIMIZED FOR FREE TIER ✅
