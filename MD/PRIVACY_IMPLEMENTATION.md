# Privacy Implementation - ChromaDB User Isolation

## Overview
This document explains how we ensure user privacy in the ChromaDB caching system.

---

## Privacy Architecture

### Three-Tier Data Model

```
┌─────────────────────────────────────────────────────────┐
│                  CHROMADB COLLECTIONS                    │
└─────────────────────────────────────────────────────────┘

1. ✅ SHARED (All Users) - Public Knowledge
   ├── technical_knowledge
   │   └── Industry standards, best practices
   │   └── RAG, microservices, STAR method, etc.
   │   └── NO user data, completely public
   │
   └── evaluation_patterns
       └── Good/bad answer characteristics
       └── Generic patterns, no personal info

2. 🔒 PRIVATE (Per User) - Isolated Data
   └── qa_cache
       └── User's interview Q&A pairs
       └── User's evaluations
       └── Filtered by userId - NO cross-user access

3. 📊 ANONYMOUS (Aggregated) - Future Enhancement
   └── aggregated_insights
       └── Statistical patterns (no PII)
       └── "90% of candidates struggle with X"
```

---

## Implementation Details

### 1. Q&A Cache - Private Per User

**Before (Privacy Issue):**
```javascript
// User A's data could be used for User B
await chromaService.cacheQA(question, answer, evaluation);
const cached = await chromaService.queryCachedEvaluation(answer);
// ❌ Returns ANY user's cached evaluation
```

**After (Privacy Protected):**
```javascript
// Each user's data is isolated
await chromaService.cacheQA(question, answer, evaluation, userId);
const cached = await chromaService.queryCachedEvaluation(answer, userId);
// ✅ Returns ONLY this user's cached evaluation
```

### 2. Cache Storage with User ID

```javascript
async cacheQA(question, answer, evaluation, userId) {
  await this.collections.qaCache.add({
    documents: [answer],
    metadatas: [{
      question,
      evaluation: JSON.stringify(evaluation),
      timestamp: Date.now(),
      userId: userId,        // 🔒 Privacy: User identifier
      isPrivate: true        // 🔒 Privacy: Mark as private
    }],
    ids: [`qa_${userId}_${Date.now()}_${Math.random()}`]
  });
}
```

### 3. Cache Query with User Filtering

```javascript
async queryCachedEvaluation(answer, userId) {
  const results = await this.collections.qaCache.query({
    queryTexts: [answer],
    nResults: 10
  });

  // Filter to only include THIS user's data
  for (let i = 0; i < results.distances[0].length; i++) {
    const metadata = results.metadatas[0][i];
    const distance = results.distances[0][i];
    
    // ✅ Check userId matches AND similarity is high
    if (metadata.userId === userId && distance < 0.05) {
      return JSON.parse(metadata.evaluation);
    }
  }
  
  return null; // No cache hit from this user
}
```

---

## Privacy Guarantees

### ✅ What's Protected:

1. **Interview Answers**
   - User A's answers are NEVER used to evaluate User B
   - Each user only sees their own cached evaluations
   - No cross-user data leakage

2. **Evaluation Results**
   - Scores and feedback are private per user
   - Cached evaluations are isolated by userId
   - No user can access another user's evaluations

3. **Interview History**
   - Q&A pairs are stored with userId
   - Only accessible by the same user
   - No aggregation across users without consent

### ✅ What's Shared (Intentionally):

1. **Knowledge Base**
   - Industry standards (public information)
   - Best practices (educational content)
   - Technical concepts (factual knowledge)
   - NO user-generated content

2. **Evaluation Patterns**
   - Generic quality indicators
   - "Good answers include metrics"
   - "Vague answers lack specifics"
   - NO specific user examples

---

## Data Flow Example

### Scenario: Two Users with Similar Answers

**User A (First Interview):**
```
Question: "Tell me about your RAG project"
Answer: "I built a RAG pipeline with ChromaDB and reduced latency by 50%"

Flow:
1. Check cache for User A → No results (first time)
2. Generate evaluation → 85/100
3. Cache with userId: "user_123"
4. Store: {answer, evaluation, userId: "user_123"}
```

**User B (Later Interview):**
```
Question: "Tell me about your RAG project"
Answer: "I built a RAG pipeline with ChromaDB and reduced latency by 50%"

Flow:
1. Check cache for User B → No results (different userId)
2. Generate evaluation → 87/100 (fresh evaluation)
3. Cache with userId: "user_456"
4. Store: {answer, evaluation, userId: "user_456"}

Result: User B gets their OWN evaluation, not User A's
```

**User A (Second Interview):**
```
Question: "Describe your microservices experience"
Answer: "I built a RAG pipeline with ChromaDB and reduced latency by 50%"

Flow:
1. Check cache for User A → FOUND! (same userId, similar answer)
2. Return cached evaluation → 85/100
3. No API call needed → $0 cost, <100ms latency

Result: User A benefits from their OWN previous evaluation
```

---

## Privacy Benefits

### 1. Fair Evaluation
- Each user gets fresh, unbiased evaluation
- No advantage/disadvantage from other users' data
- Consistent evaluation quality

### 2. Data Ownership
- Users own their interview data
- No cross-contamination
- Can delete their data independently

### 3. Compliance Ready
- GDPR compliant (data isolation)
- CCPA compliant (user data control)
- Easy to implement "right to be forgotten"

### 4. Performance + Privacy
- Users still benefit from caching (their own data)
- Cost savings maintained
- No privacy trade-off

---

## Future Enhancements

### 1. Anonymized Aggregation (Optional)
```javascript
// Aggregate insights WITHOUT personal data
async getAggregatedInsights() {
  // "90% of candidates mention 'improved performance'"
  // "Top 10% include specific metrics"
  // NO user identification, NO specific answers
}
```

### 2. User Consent for Sharing
```javascript
// Allow users to opt-in to share anonymized data
async cacheQA(question, answer, evaluation, userId, shareConsent) {
  if (shareConsent) {
    // Anonymize and add to shared patterns
    await this.addToSharedPatterns(answer, evaluation);
  }
  // Always cache privately
  await this.cachePrivately(question, answer, evaluation, userId);
}
```

### 3. Data Retention Policy
```javascript
// Auto-delete old cache entries
async cleanupOldCache(userId, daysToKeep = 90) {
  const cutoffDate = Date.now() - (daysToKeep * 24 * 60 * 60 * 1000);
  // Delete entries older than cutoff for this user
}
```

---

## Testing Privacy

### Test Case 1: User Isolation
```javascript
// User A caches data
await chromaService.cacheQA(q, a, eval, 'user_A');

// User B queries - should NOT get User A's data
const result = await chromaService.queryCachedEvaluation(a, 'user_B');
assert(result === null); // ✅ Privacy protected
```

### Test Case 2: Same User Caching
```javascript
// User A caches data
await chromaService.cacheQA(q, a, eval, 'user_A');

// User A queries - SHOULD get their own data
const result = await chromaService.queryCachedEvaluation(a, 'user_A');
assert(result !== null); // ✅ Caching works
```

### Test Case 3: Knowledge Base Sharing
```javascript
// All users can access knowledge base
const kb1 = await chromaService.queryKnowledge('RAG', 'user_A');
const kb2 = await chromaService.queryKnowledge('RAG', 'user_B');
assert(kb1 === kb2); // ✅ Shared knowledge
```

---

## Summary

**Privacy Model:**
- 🔒 Q&A Cache: **PRIVATE** (isolated per user)
- ✅ Knowledge Base: **SHARED** (public information)
- ✅ Patterns: **SHARED** (generic, no PII)

**Benefits:**
- Fair evaluation for all users
- Data ownership and control
- GDPR/CCPA compliance ready
- Performance maintained
- No privacy trade-offs

**Implementation:**
- userId required for all cache operations
- Filtering by userId in queries
- Clear separation of private vs shared data
- Easy to audit and verify

---

**Status:** ✅ IMPLEMENTED

**Files Modified:**
- `server/services/chromaService.js` - Added userId filtering
- `server/agents/evaluatorAgent.js` - Pass userId to cache methods
- `server/controllers/interviewController.js` - Pass userId to evaluator

**Privacy Level:** HIGH - Full user data isolation
