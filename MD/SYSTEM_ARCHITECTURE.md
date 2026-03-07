# MockInterviewAI - System Architecture Documentation

## 🏗️ System Overview

MockInterviewAI is a multi-agent AI interview platform that uses specialized AI agents, vector databases, and PostgreSQL to conduct realistic technical interviews with intelligent evaluation.

---

## 📊 Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                         CLIENT (React.js)                            │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐           │
│  │Dashboard │  │Interview │  │Practice  │  │Results   │           │
│  │  Page    │  │   Page   │  │   Page   │  │  Page    │           │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘           │
│       │             │              │              │                  │
│       └─────────────┴──────────────┴──────────────┘                 │
│                          │                                           │
│                     HTTP/REST API                                    │
└──────────────────────────┼──────────────────────────────────────────┘
                           │
┌──────────────────────────┼──────────────────────────────────────────┐
│                    SERVER (Node.js/Express)                          │
│                          │                                           │
│  ┌───────────────────────┴────────────────────────────┐            │
│  │              CONTROLLERS LAYER                      │            │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐         │            │
│  │  │  Auth    │  │Interview │  │Dashboard │         │            │
│  │  │Controller│  │Controller│  │Controller│         │            │
│  │  └────┬─────┘  └────┬─────┘  └────┬─────┘         │            │
│  └───────┼─────────────┼─────────────┼────────────────┘            │
│          │             │             │                              │
│  ┌───────┴─────────────┴─────────────┴────────────────┐            │
│  │              MULTI-AGENT SYSTEM                     │            │
│  │                                                      │            │
│  │  ┌─────────────────────────────────────────────┐   │            │
│  │  │  INTERVIEWER AGENT (70% of interactions)    │   │            │
│  │  │  Model: Llama 3.1 8B Instant                │   │            │
│  │  │  Role: Generate interview questions          │   │            │
│  │  │  Cost: ~$0.0001 per request                 │   │            │
│  │  └──────────────┬──────────────────────────────┘   │            │
│  │                 │                                    │            │
│  │  ┌──────────────┴──────────────────────────────┐   │            │
│  │  │  RESEARCHER AGENT (20% of interactions)     │   │            │
│  │  │  Model: GPT-OSS 120B                        │   │            │
│  │  │  Role: Deep technical probing questions     │   │            │
│  │  │  Cost: ~$0.001 per request                  │   │            │
│  │  └──────────────┬──────────────────────────────┘   │            │
│  │                 │                                    │            │
│  │  ┌──────────────┴──────────────────────────────┐   │            │
│  │  │  EVALUATOR AGENT (10% of interactions)      │   │            │
│  │  │  Model: Llama 3.3 70B Versatile             │   │            │
│  │  │  Role: Score & evaluate performance         │   │            │
│  │  │  Cost: ~$0.001 per request                  │   │            │
│  │  └──────────────────────────────────────────────┘   │            │
│  └──────────────────────────────────────────────────────┘            │
│                          │                                           │
│  ┌───────────────────────┴────────────────────────────┐            │
│  │              SERVICES LAYER                         │            │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐         │            │
│  │  │  Groq    │  │ ChromaDB │  │Integrity │         │            │
│  │  │ Service  │  │ Service  │  │ Checker  │         │            │
│  │  └────┬─────┘  └────┬─────┘  └────┬─────┘         │            │
│  └───────┼─────────────┼─────────────┼────────────────┘            │
└──────────┼─────────────┼─────────────┼───────────────────────────┘
           │             │             │
┌──────────┴─────┐  ┌────┴─────┐  ┌───┴──────┐
│  GROQ API      │  │ ChromaDB │  │PostgreSQL│
│  (LLM Models)  │  │ (Vector) │  │(Database)│
└────────────────┘  └──────────┘  └──────────┘
```

---

## 🤖 Multi-Agent System

### 1. **Interviewer Agent** (70% of interactions)
- **Model**: Llama 3.1 8B Instant (Fast & Conversational)
- **Temperature**: 0.7 (Creative)
- **Cost**: ~$0.0001 per request
- **Responsibilities**:
  - Generate opening questions
  - Create follow-up questions
  - Maintain conversational flow
  - Track interview topics
  - Ensure natural transitions

**When Used**: 
- First question of interview
- Standard follow-up questions
- Topic transitions
- Closing questions

---

### 2. **Researcher Agent** (20% of interactions)
- **Model**: GPT-OSS 120B (Most Intelligent)
- **Temperature**: 0.3 (Focused)
- **Cost**: ~$0.001 per request
- **Responsibilities**:
  - Detect vague answers (no metrics)
  - Generate technical probing questions
  - Query knowledge base for context
  - Challenge assumptions
  - Deep technical exploration

**When Used**:
- After vague answers detected
- For technical deep-dives
- When probing for specifics
- To test depth of knowledge

**Vagueness Detection**:
```javascript
// Triggers Researcher Agent
- "improved efficiency" (no numbers)
- "made it better" (no specifics)
- "worked on" (no details)
- Short answers (<100 chars)
- No metrics or quantification
```

---

### 3. **Evaluator Agent** (10% of interactions)
- **Model**: Llama 3.3 70B Versatile (Accurate & Deterministic)
- **Temperature**: 0 (Deterministic)
- **Cost**: ~$0.001 per request
- **Responsibilities**:
  - Score across 4 dimensions (0-100)
  - Provide evidence-based grading
  - Self-correction loop for bias
  - Generate detailed feedback
  - Integrity checking

**When Used**:
- End of interview (Complete Interview button)
- Generates final assessment

**Scoring Dimensions**:
1. **Communication** (0-100): Clarity, articulation, structure
2. **Correctness** (0-100): Technical accuracy, depth
3. **Confidence** (0-100): Assertiveness, conviction
4. **Stress Handling** (0-100): Composure, adaptability

**Self-Correction Loop**:
```
1. Generate initial evaluation
2. Review for bias/hallucinations
3. Verify quotes are exact
4. Check score calculations
5. Apply corrections if needed
```

---

## 🗄️ Database Architecture

### **PostgreSQL** (Primary Database)

Stores all persistent data:

```sql
┌─────────────────────────────────────────────────────────┐
│                    USERS TABLE                          │
│  - id, email, password_hash, name                       │
│  - profile_picture (base64)                             │
│  - created_at, updated_at                               │
└────────────┬────────────────────────────────────────────┘
             │
             │ 1:N
             │
┌────────────┴────────────────────────────────────────────┐
│                  RESUMES TABLE                          │
│  - id, user_id, file_path                               │
│  - extracted_data (JSONB)                               │
│  - created_at                                           │
└────────────┬────────────────────────────────────────────┘
             │
             │ 1:N
             │
┌────────────┴────────────────────────────────────────────┐
│            INTERVIEW_SESSIONS TABLE                     │
│  - id, user_id, resume_id                               │
│  - session_type (resume/practice)                       │
│  - status (in_progress/completed/abandoned)             │
│  - started_at, completed_at                             │
└────────────┬────────────────────────────────────────────┘
             │
             │ 1:N                    1:1
             ├────────────────┬───────────────┐
             │                │               │
┌────────────┴──────┐  ┌──────┴─────────┐   │
│   QA_PAIRS TABLE  │  │ASSESSMENTS TABLE│   │
│  - id, session_id │  │ - id, session_id│   │
│  - question       │  │ - scores (0-100)│   │
│  - answer         │  │ - feedback_text │   │
│  - question_order │  │ - strengths []  │   │
│  - created_at     │  │ - weaknesses [] │   │
└───────────────────┘  │ - recommendations│   │
                       │ - evidence {}   │   │
                       │ - integrity_analysis│
                       └─────────────────┘   │
```

**Key Features**:
- JSONB for flexible data (resume, evidence, integrity)
- Foreign keys with CASCADE delete
- Indexes on user_id, session_id for fast queries
- Timestamps for audit trail

---

### **ChromaDB** (Vector Database)

In-memory vector store for semantic search and caching:

```
┌─────────────────────────────────────────────────────────┐
│                  CHROMADB COLLECTIONS                    │
│                                                          │
│  ┌────────────────────────────────────────────────┐    │
│  │  1. QA_CACHE (Private per user)                │    │
│  │     - Stores: Q&A pairs + evaluations          │    │
│  │     - Purpose: Cache similar evaluations       │    │
│  │     - Privacy: userId filtering (GDPR)         │    │
│  │     - Similarity: >95% = cache hit             │    │
│  └────────────────────────────────────────────────┘    │
│                                                          │
│  ┌────────────────────────────────────────────────┐    │
│  │  2. TECHNICAL_KNOWLEDGE (Shared)                │    │
│  │     - Stores: Industry best practices          │    │
│  │     - Purpose: Context for Researcher Agent    │    │
│  │     - Topics: RAG, LLM, Architecture, DB       │    │
│  │     - Seeded: 15+ knowledge documents          │    │
│  └────────────────────────────────────────────────┘    │
│                                                          │
│  ┌────────────────────────────────────────────────┐    │
│  │  3. EVALUATION_PATTERNS (Shared)                │    │
│  │     - Stores: Good/bad answer patterns         │    │
│  │     - Purpose: Improve evaluation quality      │    │
│  │     - Status: Reserved for future use          │    │
│  └────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
```

**Privacy Model**:
- **QA_CACHE**: Private per user (userId filtering)
- **KNOWLEDGE**: Shared across all users
- **PATTERNS**: Shared across all users

**How Caching Works**:
```javascript
1. User completes interview
2. Evaluator checks cache (same userId only)
3. If similar answer found (>95%) → Use cached evaluation
4. If not found → Generate new evaluation → Cache it
5. Next time same user gives similar answer → Cache hit!
```

**Cost Savings**:
- Cache hit = $0 (no LLM call)
- Cache miss = $0.001 (Evaluator Agent call)
- Typical cache hit rate: 10-20%

---

## 🧠 LLM Models Used

### **Groq API** (All models via Groq)

| Agent | Model | Size | Speed | Cost/1M tokens | Use Case |
|-------|-------|------|-------|----------------|----------|
| Interviewer | Llama 3.1 8B Instant | 8B | ⚡ Fast | $0.05 | Conversational questions |
| Researcher | GPT-OSS 120B | 120B | 🐢 Slow | $0.50 | Technical deep-dive |
| Evaluator | Llama 3.3 70B | 70B | ⚙️ Medium | $0.59 | Accurate scoring |

**Why Groq?**
- Fast inference (10x faster than OpenAI)
- Cost-effective ($0.05-$0.59 per 1M tokens)
- Multiple model options
- No rate limits for our usage

**Model Selection Strategy**:
```
Interview Question → Interviewer (8B) → Fast & Cheap
Vague Answer → Researcher (120B) → Smart & Deep
Complete Interview → Evaluator (70B) → Accurate & Fair
```

---

## 🔄 Interview Flow

```
┌─────────────────────────────────────────────────────────┐
│                  INTERVIEW LIFECYCLE                     │
└─────────────────────────────────────────────────────────┘

1. START INTERVIEW
   ├─ User uploads resume OR selects practice role
   ├─ Resume parsed by Groq LLM (extract JSON)
   ├─ Session created in PostgreSQL
   └─ Topic tracker initialized

2. QUESTION GENERATION (Loop)
   ├─ Check question count
   ├─ Determine agent: Interviewer (70%) or Researcher (20%)
   │
   ├─ INTERVIEWER AGENT:
   │  ├─ Generate conversational question
   │  ├─ Consider resume context
   │  ├─ Track topics covered
   │  └─ Ensure natural flow
   │
   └─ RESEARCHER AGENT:
      ├─ Detect vague answer
      ├─ Query ChromaDB knowledge base
      ├─ Generate technical probe
      └─ Challenge assumptions

3. ANSWER SUBMISSION
   ├─ User types answer
   ├─ Answer saved to PostgreSQL (qa_pairs)
   ├─ Topic tracker updated
   └─ Loop back to step 2

4. COMPLETE INTERVIEW
   ├─ User clicks "Complete Interview"
   ├─ EVALUATOR AGENT triggered:
   │  ├─ Integrity check (detect dishonesty)
   │  ├─ Check ChromaDB cache (same user only)
   │  ├─ Generate evaluation (if not cached)
   │  ├─ Self-correction loop
   │  ├─ Cache evaluation (private)
   │  └─ Save to PostgreSQL (assessments)
   │
   └─ Session status → 'completed'

5. VIEW RESULTS
   ├─ Fetch assessment from PostgreSQL
   ├─ Display scores, feedback, transcript
   └─ Show recommendations
```

---

## 🔒 Security & Privacy

### **Authentication**
- JWT tokens (7-day expiry)
- bcrypt password hashing (10 rounds)
- Token stored in localStorage
- Middleware validates on every request

### **Data Privacy**
- **ChromaDB QA Cache**: Private per user (userId filtering)
- **PostgreSQL**: User data isolated by user_id
- **Profile Pictures**: Base64 encoded (no file storage)
- **GDPR Compliant**: User can delete account (CASCADE delete)

### **Integrity Checking**
Detects dishonest responses:
```javascript
Critical Issues (FAIL):
- "fake resume" / "didn't do"
- "just for fun" / "not serious"
- "reject me" / "don't hire"
- "can't say" / "won't answer"
- "help me by accepting"

Warning Issues (CONCERN):
- Very short answers (<30 chars)
- "I don't know" repeatedly
- Minimal engagement
```

**Actions**:
- FAIL (2+ critical) → Score = 15/100
- CONCERN (1 critical) → Scores capped at 60/100
- PASS → Normal evaluation

---

## 💰 Cost Analysis

### **Per Interview Cost**

| Component | Calls | Cost/Call | Total |
|-----------|-------|-----------|-------|
| Resume Parsing | 1 | $0.0001 | $0.0001 |
| Interviewer Agent | 7 | $0.0001 | $0.0007 |
| Researcher Agent | 2 | $0.001 | $0.002 |
| Evaluator Agent | 1 | $0.001 | $0.001 |
| **Total per Interview** | | | **$0.0038** |

**With Caching** (20% cache hit rate):
- Cached evaluations: $0 (no LLM call)
- Average cost: **$0.0030 per interview**

**Monthly Cost** (1000 interviews):
- Without caching: $3.80/month
- With caching: $3.00/month

---

## 📈 Performance Optimizations

### **1. Topic Tracking** (Cost: $0)
- Algorithmic topic detection (no LLM)
- Keyword-based vagueness detection
- Dynamic question transitions
- Coverage tracking

### **2. ChromaDB Caching**
- Cache similar evaluations (>95% similarity)
- Private per user (GDPR compliant)
- 10-20% cache hit rate
- Saves $0.001 per cache hit

### **3. Agent Selection**
- 70% Interviewer (cheap, fast)
- 20% Researcher (expensive, smart)
- 10% Evaluator (expensive, accurate)
- Optimized for cost/quality balance

### **4. Database Indexing**
- Indexes on user_id, session_id, email
- JSONB for flexible data
- Connection pooling
- Efficient queries

---

## 🚀 Scalability

### **Current Architecture**
- Single server (Node.js)
- PostgreSQL (single instance)
- ChromaDB (in-memory)
- Groq API (serverless)

### **Scaling Strategy**

**Horizontal Scaling**:
```
Load Balancer
    ├─ Server 1 (Node.js)
    ├─ Server 2 (Node.js)
    └─ Server 3 (Node.js)
         │
         ├─ PostgreSQL (Primary + Replicas)
         ├─ ChromaDB (Persistent storage)
         └─ Redis (Session cache)
```

**Bottlenecks**:
1. **Groq API**: Rate limits (handled by Groq)
2. **PostgreSQL**: Connection pool (max 20)
3. **ChromaDB**: In-memory (migrate to persistent)

**Solutions**:
- Add Redis for session caching
- PostgreSQL read replicas
- ChromaDB persistent storage
- CDN for static assets

---

## 📝 Summary

**What Each Component Does**:

| Component | Purpose | Technology |
|-----------|---------|------------|
| **PostgreSQL** | Store users, interviews, assessments | Relational DB |
| **ChromaDB** | Cache evaluations, knowledge base | Vector DB |
| **Interviewer Agent** | Generate conversational questions | Llama 3.1 8B |
| **Researcher Agent** | Deep technical probing | GPT-OSS 120B |
| **Evaluator Agent** | Score & evaluate performance | Llama 3.3 70B |
| **Groq Service** | LLM API calls | Groq API |
| **Integrity Checker** | Detect dishonest responses | Algorithmic |
| **Topic Tracker** | Track interview topics | Algorithmic |

**Key Benefits**:
- ✅ Cost-effective ($0.003 per interview)
- ✅ Fast (8B model for most questions)
- ✅ Intelligent (120B for technical depth)
- ✅ Accurate (70B for fair evaluation)
- ✅ Private (user data isolated)
- ✅ Scalable (multi-agent architecture)

---

## 🔗 Related Documentation

- [PHASE1_AI_ARCHITECTURE_PLAN.md](PHASE1_AI_ARCHITECTURE_PLAN.md) - Original AI architecture plan
- [AGENT_REVIEW_GUIDE.md](AGENT_REVIEW_GUIDE.md) - Agent implementation guide
- [REALISTIC_INTERVIEW_FLOW.md](REALISTIC_INTERVIEW_FLOW.md) - Interview flow details
- [PRIVACY_IMPLEMENTATION.md](PRIVACY_IMPLEMENTATION.md) - Privacy & GDPR compliance

---

**Last Updated**: December 2024
**Version**: 1.0
