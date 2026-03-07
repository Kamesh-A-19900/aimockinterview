# Week 2: Multi-Agent System Implementation

## 🎯 Goal
Implement the 4-agent system for intelligent interview routing and cost optimization.

---

## 📋 Agents to Build

### 1. Router Agent (Traffic Controller)
**Purpose:** Decides which agent to use based on task complexity

**File:** `server/agents/routerAgent.js`

**Logic:**
- Simple conversation → Interviewer Agent (Groq 8B - cheap)
- Technical concepts → Researcher Agent (Groq 70B - smart)
- Evaluation time → Evaluator Agent (Groq 70B - accurate)

**Cost Savings:** 60-80% by routing to cheap model when possible

---

### 2. Interviewer Agent (Conversationalist)
**Purpose:** Handle conversational flow and simple questions

**File:** `server/agents/interviewerAgent.js`

**Model:** Groq Llama 3.1 8B (Fast & Cheap)

**Responsibilities:**
- Generate follow-up questions
- Maintain conversation flow
- Show empathy and engagement
- Handle 70% of interactions

**Cost:** ~$0.0001 per request

---

### 3. Researcher Agent (Deep Diver)
**Purpose:** Technical deep-dive and vagueness detection

**File:** `server/agents/researcherAgent.js`

**Model:** Groq Llama 3.1 70B (Smart & Deep)

**Responsibilities:**
- Detect vague answers (no metrics)
- Generate technical probing questions
- Query knowledge base for context
- Handle 20% of interactions

**Cost:** ~$0.001 per request

---

### 4. Evaluator Agent (Scorer)
**Purpose:** Objective scoring with evidence

**File:** `server/agents/evaluatorAgent.js`

**Model:** Groq Llama 3.1 70B (Accurate)

**Responsibilities:**
- Score across rubric dimensions
- Extract quotes as evidence
- Self-correction loop for bias
- Handle 10% of interactions

**Cost:** ~$0.001 per request

---

## 🛠️ Implementation Steps

### Step 1: Create Router Agent
**File:** `server/agents/routerAgent.js`

**Features:**
- Route based on task type
- Detect technical keywords
- Smart agent selection

**Test:**
```javascript
const router = new RouterAgent(interviewer, researcher, evaluator);
const agent = router.route('generate_question', context);
```

---

### Step 2: Create Interviewer Agent
**File:** `server/agents/interviewerAgent.js`

**Features:**
- Conversational prompts
- Empathetic responses
- Fast generation (8B model)

**Test:**
```javascript
const interviewer = new InterviewerAgent();
const question = await interviewer.generateQuestion(context);
```

---

### Step 3: Create Researcher Agent
**File:** `server/agents/researcherAgent.js`

**Features:**
- Vagueness detection
- Technical concept extraction
- Knowledge base integration
- Deep probing questions

**Test:**
```javascript
const researcher = new ResearcherAgent();
const result = await researcher.generateQuestion(context);
// Returns: { is_vague, next_question, probing_areas }
```

---

### Step 4: Create Evaluator Agent
**File:** `server/agents/evaluatorAgent.js`

**Features:**
- Rubric-based scoring
- Evidence extraction (quotes)
- Self-correction loop
- Deterministic (temperature=0)

**Test:**
```javascript
const evaluator = new EvaluatorAgent();
const scores = await evaluator.evaluate(qaPairs);
// Returns: { technical_depth, communication, problem_solving, confidence, overall_score, feedback_text }
```

---

## 📊 Expected Results

### Cost Breakdown (10-question interview):
- **7 questions:** Interviewer (8B) = $0.0001 × 7 = $0.0007
- **2 questions:** Researcher (70B) = $0.001 × 2 = $0.002
- **1 evaluation:** Evaluator (70B) = $0.001 × 1 = $0.001
- **Total:** $0.0037 per interview

### Savings:
- **Before:** $0.01 per interview (all 70B)
- **After:** $0.0037 per interview (smart routing)
- **Savings:** 63%

---

## ✅ Success Criteria

### Functionality:
- [ ] Router correctly selects agent based on context
- [ ] Interviewer generates conversational questions
- [ ] Researcher detects vague answers
- [ ] Researcher queries knowledge base
- [ ] Evaluator provides evidence-based scores
- [ ] Self-correction loop works

### Performance:
- [ ] Interviewer: <1s response time
- [ ] Researcher: <2s response time
- [ ] Evaluator: <3s response time
- [ ] 70% of calls use Interviewer (cheap)
- [ ] 20% of calls use Researcher (smart)
- [ ] 10% of calls use Evaluator (accurate)

### Quality:
- [ ] Questions are relevant and engaging
- [ ] Vague answers are detected
- [ ] Scores are justified with quotes
- [ ] No hallucinations in evaluation

---

## 🧪 Testing Plan

### Unit Tests:
```bash
# Test each agent individually
npm test agents/routerAgent.test.js
npm test agents/interviewerAgent.test.js
npm test agents/researcherAgent.test.js
npm test agents/evaluatorAgent.test.js
```

### Integration Tests:
```bash
# Test full interview flow
npm test integration/multiAgent.test.js
```

### Manual Testing:
1. Start interview with resume
2. Answer 10 questions
3. Verify agent routing (check logs)
4. Verify evaluation quality
5. Check cost metrics

---

## 📝 Implementation Order

### Day 1-2: Router + Interviewer
- Create RouterAgent
- Create InterviewerAgent
- Test basic routing
- Test question generation

### Day 3-4: Researcher
- Create ResearcherAgent
- Implement vagueness detection
- Integrate knowledge base
- Test technical probing

### Day 5-6: Evaluator
- Create EvaluatorAgent
- Implement rubric scoring
- Add self-correction loop
- Test evaluation quality

### Day 7: Integration & Testing
- Integrate all agents
- Test full interview flow
- Measure cost savings
- Optimize prompts

---

## 🚀 Ready to Start?

Let's begin with **Step 1: Router Agent**!

**Command to proceed:**
"Start with Router Agent implementation"

