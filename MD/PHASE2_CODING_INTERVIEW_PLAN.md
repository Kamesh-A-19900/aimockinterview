# Phase 2: Coding Interview System - IMPLEMENTATION PLAN

## 🎯 Overview

Add specialized **Coding Interview** type with language selection, algorithm problems, code evaluation, and optimization assessment.

**Status:** 🚧 IN PROGRESS

---

## 📋 Interview Types Status

### ✅ Existing (Complete)
1. **Practice Interview** - 5 static questions, in-memory, lightweight
2. **Resume-Based Interview** - Multi-agent system, resume parsing, behavioral questions

### 🚧 Phase 2 (Current)
3. **Coding Interview** - Algorithm problems, code evaluation, optimization

### 🔮 Future Phases
4. **Stress Interview** - Pressure testing, ethical dilemmas, composure evaluation
5. **Aptitude Interview** - Logical reasoning, quantitative aptitude, verbal reasoning

---

## 🎯 Coding Interview - Detailed Specification

### **Purpose**
Technical coding assessment with progressive difficulty, optimization focus, and language-specific evaluation.

### **Key Features**
- ✅ Language selection (JavaScript, Python, Java, C++, Go, Rust, TypeScript, C#)
- ✅ Progressive difficulty (Easy → Medium → Hard)
- ✅ Code submission and evaluation
- ✅ Time/space complexity analysis
- ✅ Optimization suggestions
- ✅ Edge case testing
- ✅ Code explanation requirement

### **Flow**
```
1. User selects "Coding Interview"
2. Choose programming language
3. Select duration (30/60/90 minutes)
4. Guidelines shown (explain code, discuss complexity)
5. Interview starts with Easy problem
6. User submits code + explanation
7. Agent evaluates and asks follow-ups:
   - Time complexity?
   - Space complexity?
   - Can you optimize?
   - What about edge cases?
8. Progressive difficulty based on performance
9. Final evaluation with detailed feedback
```

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                 CODING INTERVIEW FLOW                        │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                    CODING AGENT                              │
│  - Generate problems (easy → hard)                          │
│  - Evaluate code quality                                    │
│  - Check complexity                                         │
│  - Suggest optimizations                                    │
│  Model: openai/gpt-oss-120b (technical depth)              │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│              CHROMADB KNOWLEDGE BASE                         │
│  - coding_problems_easy (50+ problems)                      │
│  - coding_problems_medium (50+ problems)                    │
│  - coding_problems_hard (30+ problems)                      │
│  - algorithm_patterns (sliding window, two pointers, etc.)  │
│  - optimization_techniques (time/space optimization)        │
│  - language_best_practices (per language)                   │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                 CODING EVALUATOR                             │
│  - Code Quality (0-100): Clean, readable, best practices   │
│  - Correctness (0-100): Solves problem accurately          │
│  - Optimization (0-100): Efficient complexity               │
│  - Problem Solving (0-100): Approach, reasoning             │
│  - Communication (0-100): Explains clearly                  │
│  Model: llama-3.3-70b-versatile (accurate scoring)         │
└─────────────────────────────────────────────────────────────┘
```

---

## 📊 Database Schema Updates

### New Tables

```sql
-- Interview types table
CREATE TABLE interview_types (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE,
  description TEXT,
  requires_resume BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

INSERT INTO interview_types (name, description, requires_resume, is_active) VALUES
('practice', 'Quick practice with static questions', false, true),
('resume', 'Resume-based behavioral interview', true, true),
('coding', 'Technical coding assessment', false, true),
('stress', 'High-pressure stress interview', false, false),
('aptitude', 'Logical and quantitative reasoning', false, false);

-- Update interview_sessions table
ALTER TABLE interview_sessions 
ADD COLUMN interview_type VARCHAR(50) DEFAULT 'resume',
ADD COLUMN programming_language VARCHAR(50), -- For coding interviews
ADD COLUMN difficulty_progression VARCHAR(100); -- Track: easy,easy,medium,hard

-- Coding submissions table
CREATE TABLE coding_submissions (
  id SERIAL PRIMARY KEY,
  session_id INTEGER REFERENCES interview_sessions(id) ON DELETE CASCADE,
  question_order INTEGER NOT NULL,
  problem_statement TEXT NOT NULL,
  code_submitted TEXT,
  explanation TEXT,
  time_complexity VARCHAR(50),
  space_complexity VARCHAR(50),
  difficulty VARCHAR(20), -- easy, medium, hard
  is_correct BOOLEAN,
  optimization_score INTEGER,
  feedback TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Update assessments table for coding-specific scores
ALTER TABLE assessments
ADD COLUMN code_quality_score INTEGER,
ADD COLUMN optimization_score INTEGER,
ADD COLUMN problem_solving_score INTEGER;
```

---

## 🤖 Agents to Create

### 1. Coding Agent
**File:** `server/agents/codingAgent.js`
**Status:** [ ] Not Started

**Responsibilities:**
- Generate coding problems based on difficulty
- Query ChromaDB for problems
- Evaluate code submissions
- Check time/space complexity
- Suggest optimizations
- Generate follow-up questions

**Model:** `openai/gpt-oss-120b` (technical depth needed)

**Key Methods:**
```javascript
class CodingAgent {
  async generateProblem(language, difficulty, previousProblems)
  async evaluateCode(code, problem, language)
  async checkComplexity(code, language)
  async suggestOptimization(code, problem, language)
  async generateFollowUp(code, problem, evaluation)
}
```

---

### 2. Coding Evaluator
**File:** `server/agents/codingEvaluator.js`
**Status:** [ ] Not Started

**Responsibilities:**
- Score code quality (0-100)
- Score correctness (0-100)
- Score optimization (0-100)
- Score problem solving (0-100)
- Score communication (0-100)
- Generate detailed feedback

**Model:** `llama-3.3-70b-versatile` (accurate scoring)

**Evaluation Rubric:**
1. **Code Quality (0-100)**
   - Clean, readable code
   - Follows language best practices
   - Proper naming conventions
   - Good structure

2. **Correctness (0-100)**
   - Solves the problem accurately
   - Handles edge cases
   - No logical errors
   - Produces correct output

3. **Optimization (0-100)**
   - Efficient time complexity
   - Efficient space complexity
   - Uses appropriate data structures
   - Considers trade-offs

4. **Problem Solving (0-100)**
   - Clear approach
   - Good reasoning
   - Considers alternatives
   - Explains trade-offs

5. **Communication (0-100)**
   - Explains code clearly
   - Discusses complexity
   - Articulates approach
   - Responds to questions

---

## 📚 ChromaDB Collections

### Collections to Create

1. **coding_problems_easy** (50+ problems)
   - Array manipulation
   - String operations
   - Basic loops
   - Simple recursion

2. **coding_problems_medium** (50+ problems)
   - Data structures (stacks, queues, trees)
   - Sorting algorithms
   - Binary search
   - Dynamic programming basics

3. **coding_problems_hard** (30+ problems)
   - Advanced DP
   - Graph algorithms
   - Complex optimization
   - System design

4. **algorithm_patterns** (20+ patterns)
   - Sliding window
   - Two pointers
   - Fast & slow pointers
   - Merge intervals
   - Cyclic sort
   - Top K elements
   - Binary search variations
   - DFS/BFS

5. **optimization_techniques** (30+ techniques)
   - Time complexity reduction
   - Space complexity reduction
   - Memoization
   - Tabulation
   - Greedy approaches

6. **language_best_practices** (per language)
   - JavaScript: const/let, arrow functions, array methods
   - Python: list comprehensions, generators, pythonic idioms
   - Java: streams, optionals, generics
   - C++: STL, smart pointers, RAII
   - Go: goroutines, channels, defer
   - Rust: ownership, borrowing, lifetimes

---

## 🎨 Frontend Components

### 1. Interview Type Selection
**File:** `client/src/pages/InterviewTypeSelection.js`
**Status:** [ ] Not Started

**Features:**
- Card-based selection UI
- Show interview type details
- Disable inactive types (stress, aptitude)
- Route to appropriate flow

---

### 2. Coding Interview Setup
**File:** `client/src/pages/CodingInterviewSetup.js`
**Status:** [ ] Not Started

**Features:**
- Language selection (8 languages)
- Duration selection (30/60/90 min)
- Guidelines display
- Start interview button

---

### 3. Coding Interview Page
**File:** `client/src/pages/CodingInterview.js`
**Status:** [ ] Not Started

**Features:**
- Problem statement display
- Code editor (textarea with syntax highlighting)
- Explanation textarea
- Submit code button
- Timer display
- Question counter
- Difficulty indicator

---

### 4. Coding Results Page
**File:** `client/src/pages/CodingResults.js`
**Status:** [ ] Not Started

**Features:**
- Overall score
- 5 category scores (quality, correctness, optimization, problem solving, communication)
- Problem-by-problem breakdown
- Code submissions with feedback
- Optimization suggestions
- Next steps

---

## 📋 Implementation Checklist

### Week 1: Database & Backend Setup
- [ ] Create database migration script
- [ ] Add interview_types table
- [ ] Update interview_sessions table
- [ ] Create coding_submissions table
- [ ] Update assessments table
- [ ] Test database schema

### Week 2: Agents & ChromaDB
- [ ] Create Coding Agent
- [ ] Create Coding Evaluator
- [ ] Seed coding_problems_easy collection (50 problems)
- [ ] Seed coding_problems_medium collection (50 problems)
- [ ] Seed coding_problems_hard collection (30 problems)
- [ ] Seed algorithm_patterns collection
- [ ] Seed optimization_techniques collection
- [ ] Seed language_best_practices collection
- [ ] Test agent functionality

### Week 3: Backend API
- [ ] Create `/api/coding/start` endpoint
- [ ] Create `/api/coding/:id/submit` endpoint
- [ ] Create `/api/coding/:id/complete` endpoint
- [ ] Create `/api/coding/:id/results` endpoint
- [ ] Integrate Coding Agent
- [ ] Integrate Coding Evaluator
- [ ] Test API endpoints

### Week 4: Frontend
- [ ] Create InterviewTypeSelection component
- [ ] Create CodingInterviewSetup component
- [ ] Create CodingInterview component
- [ ] Create CodingResults component
- [ ] Add routing
- [ ] Style components
- [ ] Test user flow

### Week 5: Integration & Testing
- [ ] End-to-end testing
- [ ] Test all 8 languages
- [ ] Test difficulty progression
- [ ] Test evaluation accuracy
- [ ] Performance optimization
- [ ] Bug fixes
- [ ] Documentation

---

## 🎯 Success Metrics

### Functionality
- [ ] User can select coding interview type
- [ ] User can choose from 8 programming languages
- [ ] Problems progress from easy to hard
- [ ] Code evaluation is accurate
- [ ] Complexity analysis works
- [ ] Optimization suggestions are helpful
- [ ] Results page shows detailed feedback

### Quality
- [ ] Evaluation is consistent (deterministic)
- [ ] Problems are relevant and challenging
- [ ] Feedback is actionable
- [ ] Language-specific best practices applied

### Performance
- [ ] Problem generation: <2 seconds
- [ ] Code evaluation: <5 seconds
- [ ] Total interview time: 30-90 minutes
- [ ] ChromaDB queries: <100ms

---

## 🚀 Future Enhancements (Post-Demo)

### Stress Interview
- [ ] Stress Agent
- [ ] Stress Evaluator
- [ ] Stress questions bank
- [ ] Ethical dilemmas
- [ ] Pressure scenarios

### Aptitude Interview
- [ ] Aptitude Agent
- [ ] Aptitude Evaluator
- [ ] Logical reasoning questions
- [ ] Quantitative aptitude questions
- [ ] Verbal reasoning questions

### Advanced Features
- [ ] Code execution (sandbox)
- [ ] Real-time syntax checking
- [ ] Code formatting
- [ ] Test case validation
- [ ] Collaborative coding (pair programming)
- [ ] Video recording
- [ ] Screen sharing

---

## 📝 Notes

- Focus on coding interview for demo
- Stress and aptitude marked as future
- Keep practice and resume-based as-is
- Maintain backward compatibility
- Use existing multi-agent infrastructure
- Leverage ChromaDB for problem bank

---

**Current Phase:** Week 1 - Database & Backend Setup
**Next Milestone:** Database schema complete
**Target Demo Date:** TBD

---

**Status:** 🚧 IN PROGRESS
**Last Updated:** March 7, 2026
