# Agent Review Guide

## 🧪 How to Test & Review Agents

### Method 1: Run Test Script (Recommended)

```bash
# Navigate to server directory
cd server

# Run the test script
node scripts/testAgents.js
```

**What it tests:**
- ✅ Router Agent routing logic
- ✅ Interviewer Agent question generation
- ✅ Researcher Agent vagueness detection
- ✅ Evaluator Agent scoring
- ✅ Full interview simulation
- ✅ Cost analysis
- ✅ Routing statistics

**Expected output:**
```
╔════════════════════════════════════════════════════════════╗
║         MULTI-AGENT SYSTEM TEST SUITE                     ║
╚════════════════════════════════════════════════════════════╝

🔧 Initializing ChromaDB...
✅ ChromaDB initialized

============================================================
TEST 1: Router Agent
============================================================

Test 1.1: Simple conversational answer
✓ Routed to: Interviewer Agent (correct!)

Test 1.2: Technical answer with keywords
✓ Routed to: Researcher Agent (correct!)

Test 1.3: Evaluation task
✓ Routed to: Evaluator Agent (correct!)

✅ Router Agent: ALL TESTS PASSED

... (more tests)

============================================================
TEST SUMMARY
============================================================
✅ All tests passed successfully!

📊 System Status:
  ✓ Router Agent: Working
  ✓ Interviewer Agent: Working
  ✓ Researcher Agent: Working
  ✓ Evaluator Agent: Working
  ✓ ChromaDB Integration: Working

💰 Cost Efficiency: 63% savings vs baseline
🚀 Ready for production integration!
```

---

### Method 2: Manual Code Review

#### 1. Review Router Agent
**File:** `server/agents/routerAgent.js`

**Check:**
- [ ] Routes to Interviewer for simple answers
- [ ] Routes to Researcher for technical keywords
- [ ] Routes to Evaluator for evaluation task
- [ ] Has 60+ technical keywords
- [ ] Provides routing statistics
- [ ] Estimates cost correctly

**Key methods:**
- `route(task, context)` - Main routing logic
- `hasTechnicalConcept(text)` - Keyword detection
- `getStats(routingHistory)` - Statistics
- `estimateCost(routingHistory)` - Cost calculation

---

#### 2. Review Interviewer Agent
**File:** `server/agents/interviewerAgent.js`

**Check:**
- [ ] Uses Groq Llama 3.1 8B (cheap model)
- [ ] Generates conversational questions
- [ ] Has fallback questions
- [ ] Handles resume context
- [ ] Temperature = 0.7 (creative)
- [ ] Max tokens = 200

**Key methods:**
- `generateQuestion(context)` - Main question generation
- `generateOpeningQuestion(resumeData)` - Opening question
- `buildPrompt(context)` - Prompt construction
- `getFallbackQuestion(context)` - Fallback

---

#### 3. Review Researcher Agent
**File:** `server/agents/researcherAgent.js`

**Check:**
- [ ] Uses Groq Llama 3.1 70B (smart model)
- [ ] Detects vague answers
- [ ] Extracts technical concepts
- [ ] Queries ChromaDB knowledge base
- [ ] Temperature = 0.3 (focused)
- [ ] Max tokens = 300

**Key methods:**
- `generateQuestion(context)` - Technical question generation
- `detectVagueness(text)` - Vagueness detection
- `extractConcepts(text)` - Concept extraction
- `buildPrompt(context, kbContext, isVague, concepts)` - Prompt

**Vagueness detection logic:**
```javascript
// Vague if:
// 1. Has vague phrases ("improved efficiency", "made it better")
// 2. AND (no numbers OR short answer)
```

---

#### 4. Review Evaluator Agent
**File:** `server/agents/evaluatorAgent.js`

**Check:**
- [ ] Uses Groq Llama 3.1 70B (accurate model)
- [ ] Temperature = 0 (deterministic)
- [ ] Extracts quotes as evidence
- [ ] Self-correction loop
- [ ] Checks ChromaDB cache
- [ ] Caches evaluations
- [ ] Has fallback evaluation

**Key methods:**
- `evaluate(qaPairs)` - Main evaluation
- `reviewAndCorrect(evaluation, qaPairs)` - Self-correction
- `checkCache(qaPairs)` - Cache lookup
- `cacheEvaluation(qaPairs, evaluation)` - Cache save
- `buildPrompt(qaPairs)` - Prompt construction

**Rubric:**
- Communication (0-100)
- Correctness (0-100)
- Confidence (0-100)
- Stress Handling (0-100)
- Overall Score (average)

---

### Method 3: Interactive Testing

#### Test Router Agent:
```javascript
// In Node.js REPL or test file
const { RouterAgent } = require('./server/agents/routerAgent');
const { InterviewerAgent } = require('./server/agents/interviewerAgent');
const { ResearcherAgent } = require('./server/agents/researcherAgent');
const { EvaluatorAgent } = require('./server/agents/evaluatorAgent');

const interviewer = new InterviewerAgent();
const researcher = new ResearcherAgent();
const evaluator = new EvaluatorAgent();
const router = new RouterAgent(interviewer, researcher, evaluator);

// Test routing
const agent = router.route('generate_question', {
  lastAnswer: 'I built a RAG pipeline'
});

console.log(agent === researcher); // Should be true
```

#### Test Interviewer Agent:
```javascript
const { InterviewerAgent } = require('./server/agents/interviewerAgent');

const interviewer = new InterviewerAgent();

interviewer.generateQuestion({
  lastAnswer: 'I led a team of 5 developers',
  summary: 'Candidate has 5 years experience',
  resumeData: { name: 'John', skills: ['React'] }
}).then(question => {
  console.log('Generated:', question);
});
```

#### Test Researcher Agent:
```javascript
const { ResearcherAgent } = require('./server/agents/researcherAgent');

const researcher = new ResearcherAgent();

// Test vagueness detection
console.log(researcher.detectVagueness('I improved performance')); // true
console.log(researcher.detectVagueness('I reduced latency from 500ms to 50ms')); // false

// Test concept extraction
console.log(researcher.extractConcepts('I built a RAG pipeline with ChromaDB'));
// ['RAG', 'pipeline', 'ChromaDB']

// Test question generation
researcher.generateQuestion({
  lastAnswer: 'I optimized the database'
}).then(result => {
  console.log('Question:', result.question);
  console.log('Is vague:', result.isVague);
});
```

#### Test Evaluator Agent:
```javascript
const { EvaluatorAgent } = require('./server/agents/evaluatorAgent');

const evaluator = new EvaluatorAgent();

evaluator.evaluate([
  { question: 'Tell me about yourself', answer: 'I am a software engineer...' },
  { question: 'Describe a project', answer: 'I built a chat app...' }
]).then(scores => {
  console.log('Overall Score:', scores.overall_score);
  console.log('Communication:', scores.communication_score);
  console.log('Feedback:', scores.feedback_text);
});
```

---

## 📊 What to Look For

### Router Agent:
- ✅ Correctly identifies technical keywords
- ✅ Routes 70% to Interviewer (cheap)
- ✅ Routes 20% to Researcher (smart)
- ✅ Routes 10% to Evaluator (accurate)
- ✅ Cost savings: 60-80%

### Interviewer Agent:
- ✅ Questions are conversational and engaging
- ✅ Questions relate to previous answer
- ✅ Questions are under 30 words
- ✅ Uses cheap model (8B)
- ✅ Fast response (<1s)

### Researcher Agent:
- ✅ Detects vague answers correctly
- ✅ Extracts technical concepts
- ✅ Queries knowledge base
- ✅ Asks for quantification when vague
- ✅ Probes technical depth
- ✅ Uses smart model (70B)

### Evaluator Agent:
- ✅ Scores are consistent (temperature=0)
- ✅ Provides evidence (quotes)
- ✅ Self-correction works
- ✅ Cache hit rate: 30-40%
- ✅ Scores are justified
- ✅ Uses accurate model (70B)

---

## 🐛 Common Issues & Fixes

### Issue 1: "groq.chat is not a function"
**Fix:** Use `groq.client.chat.completions.create()` instead

### Issue 2: ChromaDB not initialized
**Fix:** Run `await chromaService.initialize()` first

### Issue 3: Router always routes to Interviewer
**Fix:** Check if technical keywords are being detected correctly

### Issue 4: Evaluator returns low scores
**Fix:** Check if answers are substantial (>50 characters)

### Issue 5: Researcher doesn't detect vagueness
**Fix:** Check vague patterns and number detection logic

---

## ✅ Review Checklist

### Code Quality:
- [ ] All agents have error handling
- [ ] All agents have fallback mechanisms
- [ ] All agents log their actions
- [ ] Code is well-documented
- [ ] No hardcoded values

### Functionality:
- [ ] Router routes correctly
- [ ] Interviewer generates good questions
- [ ] Researcher detects vagueness
- [ ] Evaluator provides evidence
- [ ] ChromaDB integration works

### Performance:
- [ ] Interviewer: <1s response
- [ ] Researcher: <2s response
- [ ] Evaluator: <3s response
- [ ] Cache hit rate: 30-40%

### Cost Efficiency:
- [ ] 70% calls use Interviewer (cheap)
- [ ] 20% calls use Researcher (smart)
- [ ] 10% calls use Evaluator (accurate)
- [ ] Total cost: ~$0.0037 per interview
- [ ] Savings: 63% vs baseline

---

## 🚀 Next Steps After Review

If all tests pass:
1. ✅ Proceed to Day 3-4: Integration
2. ✅ Update interview controller
3. ✅ Test full interview flow
4. ✅ Deploy to production

If tests fail:
1. ❌ Fix issues
2. ❌ Re-run tests
3. ❌ Review code again
4. ❌ Repeat until all pass

---

## 📝 Summary

**To review agents:**
```bash
# Quick test
node server/scripts/testAgents.js

# Manual review
# Open each agent file and check code quality

# Interactive testing
# Use Node.js REPL to test individual methods
```

**Expected result:**
- ✅ All tests pass
- ✅ Cost savings: 63%
- ✅ Routing works correctly
- ✅ Questions are high quality
- ✅ Evaluation is evidence-based

**Ready for integration!** 🎉
