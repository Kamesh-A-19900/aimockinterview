/**
 * ChromaDB Service for Semantic Caching and Knowledge Base
 * 
 * Using in-memory ChromaDB (no server required)
 * 
 * Collections:
 * 1. qa_cache - Cache Q&A patterns for fast retrieval
 * 2. technical_knowledge - Industry standards and best practices
 * 3. evaluation_patterns - Good/bad answer patterns
 */

// Simple in-memory vector store (lightweight alternative to ChromaDB)
class SimpleVectorStore {
  constructor() {
    this.documents = [];
  }

  async add({ documents, metadatas, ids }) {
    documents.forEach((doc, i) => {
      this.documents.push({
        id: ids[i],
        document: doc,
        metadata: metadatas[i],
        embedding: this.simpleEmbed(doc)
      });
    });
  }

  async query({ queryTexts, nResults }) {
    const queryEmbedding = this.simpleEmbed(queryTexts[0]);
    
    // Calculate cosine similarity
    const results = this.documents.map(doc => ({
      ...doc,
      distance: this.cosineSimilarity(queryEmbedding, doc.embedding)
    }));

    // Sort by similarity (lower distance = more similar)
    results.sort((a, b) => a.distance - b.distance);

    // Return top N results
    const topResults = results.slice(0, nResults);

    return {
      documents: [topResults.map(r => r.document)],
      metadatas: [topResults.map(r => r.metadata)],
      distances: [topResults.map(r => r.distance)]
    };
  }

  async count() {
    return this.documents.length;
  }

  // Simple embedding: word frequency vector
  simpleEmbed(text) {
    const words = text.toLowerCase().match(/\w+/g) || [];
    const freq = {};
    words.forEach(word => {
      freq[word] = (freq[word] || 0) + 1;
    });
    return freq;
  }

  // Cosine similarity
  cosineSimilarity(vec1, vec2) {
    const words = new Set([...Object.keys(vec1), ...Object.keys(vec2)]);
    let dotProduct = 0;
    let mag1 = 0;
    let mag2 = 0;

    words.forEach(word => {
      const v1 = vec1[word] || 0;
      const v2 = vec2[word] || 0;
      dotProduct += v1 * v2;
      mag1 += v1 * v1;
      mag2 += v2 * v2;
    });

    if (mag1 === 0 || mag2 === 0) return 1; // Max distance
    return 1 - (dotProduct / (Math.sqrt(mag1) * Math.sqrt(mag2)));
  }
}

class ChromaService {
  constructor() {
    this.collections = {
      qaCache: new SimpleVectorStore(),
      knowledge: new SimpleVectorStore(),
      patterns: new SimpleVectorStore()
    };
    this.initialized = false;
  }

  /**
   * Initialize ChromaDB collections and seed knowledge base
   */
  async initialize() {
    if (this.initialized) return;

    try {
      console.log('🔄 Initializing Vector Store...');

      // Collections already created in constructor
      // Just seed knowledge base
      await this.seedKnowledgeBase();

      this.initialized = true;
      console.log('✅ Vector Store initialized successfully');
    } catch (error) {
      console.error('❌ Vector Store initialization failed:', error);
      throw error;
    }
  }

  /**
   * Seed knowledge base with industry standards
   */
  async seedKnowledgeBase() {
    const knowledge = [
      // RAG & AI
      {
        doc: "A good RAG (Retrieval Augmented Generation) pipeline includes: chunking strategy (semantic or fixed-size), embedding model (OpenAI, Cohere, or open-source), vector store (Pinecone, Weaviate, ChromaDB), retrieval mechanism (similarity search, hybrid search), and re-ranking for relevance.",
        meta: { topic: 'RAG', category: 'AI', difficulty: 'advanced' }
      },
      {
        doc: "LLM best practices: prompt engineering, temperature control (0 for deterministic, 0.7 for creative), token management, context window optimization, and fallback strategies for API failures.",
        meta: { topic: 'LLM', category: 'AI', difficulty: 'intermediate' }
      },

      // Architecture
      {
        doc: "Microservices best practices: API gateway for routing, service discovery (Consul, Eureka), circuit breakers (Hystrix, Resilience4j), distributed tracing (Jaeger, Zipkin), independent deployment, and database per service pattern.",
        meta: { topic: 'microservices', category: 'architecture', difficulty: 'advanced' }
      },
      {
        doc: "System design principles: scalability (horizontal vs vertical), reliability (redundancy, failover), availability (uptime, SLA), performance (latency, throughput), and maintainability (clean code, documentation).",
        meta: { topic: 'system-design', category: 'architecture', difficulty: 'intermediate' }
      },

      // Database
      {
        doc: "Database optimization techniques: indexing (B-tree, hash, composite), query optimization (EXPLAIN, query plans), connection pooling, caching (Redis, Memcached), and denormalization when read-heavy.",
        meta: { topic: 'database', category: 'backend', difficulty: 'intermediate' }
      },
      {
        doc: "SQL vs NoSQL trade-offs: SQL for ACID compliance, complex queries, and relationships; NoSQL for scalability, flexibility, and high write throughput. Choose based on data structure and access patterns.",
        meta: { topic: 'database', category: 'backend', difficulty: 'intermediate' }
      },

      // Behavioral
      {
        doc: "STAR method for behavioral questions: Situation (set context), Task (describe challenge), Action (explain what YOU did), Result (quantify outcome with metrics). Always include specific numbers.",
        meta: { topic: 'behavioral', category: 'interview', difficulty: 'basic' }
      },
      {
        doc: "Good answer characteristics: specific metrics (reduced latency by 50%), clear problem statement, detailed approach with trade-offs, measurable results, and lessons learned.",
        meta: { topic: 'answer-quality', category: 'evaluation', difficulty: 'basic' }
      },

      // Frontend
      {
        doc: "React best practices: component composition, hooks for state management, memoization (useMemo, useCallback), code splitting, lazy loading, and performance optimization with React.memo.",
        meta: { topic: 'React', category: 'frontend', difficulty: 'intermediate' }
      },
      {
        doc: "Frontend performance: minimize bundle size, lazy load components, optimize images, use CDN, implement caching, reduce API calls, and use service workers for offline support.",
        meta: { topic: 'performance', category: 'frontend', difficulty: 'intermediate' }
      },

      // Backend
      {
        doc: "API design best practices: RESTful principles, proper HTTP methods (GET, POST, PUT, DELETE), status codes, versioning (/v1/), pagination, rate limiting, and comprehensive error handling.",
        meta: { topic: 'API', category: 'backend', difficulty: 'intermediate' }
      },
      {
        doc: "Authentication & Authorization: JWT for stateless auth, OAuth2 for third-party, refresh tokens for security, role-based access control (RBAC), and secure password hashing (bcrypt, Argon2).",
        meta: { topic: 'security', category: 'backend', difficulty: 'advanced' }
      },

      // DevOps
      {
        doc: "CI/CD pipeline: automated testing, code quality checks (linting, coverage), build automation, deployment strategies (blue-green, canary), rollback mechanisms, and monitoring.",
        meta: { topic: 'CICD', category: 'devops', difficulty: 'intermediate' }
      },
      {
        doc: "Container orchestration with Kubernetes: pods, services, deployments, scaling (HPA, VPA), health checks, config maps, secrets, and ingress for routing.",
        meta: { topic: 'kubernetes', category: 'devops', difficulty: 'advanced' }
      }
    ];

    try {
      // Check if already seeded
      const existing = await this.collections.knowledge.count();
      if (existing > 0) {
        console.log(`✅ Knowledge base already seeded (${existing} documents)`);
        return;
      }

      // Add knowledge to collection
      await this.collections.knowledge.add({
        documents: knowledge.map(k => k.doc),
        metadatas: knowledge.map(k => k.meta),
        ids: knowledge.map((_, i) => `kb_${i}`)
      });

      console.log(`✅ Seeded knowledge base with ${knowledge.length} documents`);
    } catch (error) {
      console.error('❌ Failed to seed knowledge base:', error);
    }
  }

  /**
   * Cache Q&A pair with evaluation - PRIVATE PER USER
   * @param {string} question - Interview question
   * @param {string} answer - Candidate's answer
   * @param {Object} evaluation - Evaluation result
   * @param {string} userId - User ID for privacy isolation
   */
  async cacheQA(question, answer, evaluation, userId) {
    try {
      await this.collections.qaCache.add({
        documents: [answer],
        metadatas: [{
          question,
          evaluation: JSON.stringify(evaluation),
          timestamp: Date.now(),
          userId: userId, // Privacy: Isolate by user
          isPrivate: true
        }],
        ids: [`qa_${userId}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`]
      });

      console.log(`✅ Cached Q&A pair for user ${userId} (private)`);
    } catch (error) {
      console.error('❌ Failed to cache Q&A:', error);
    }
  }

  /**
   * Query cached evaluation for similar answer - ONLY FROM SAME USER
   * Returns cached evaluation if similarity > 95% AND belongs to same user
   * @param {string} answer - Answer to search for
   * @param {string} userId - User ID for privacy filtering
   * @returns {Object|null} Cached evaluation or null
   */
  async queryCachedEvaluation(answer, userId) {
    try {
      // Get all results and filter by userId manually (since simple vector store doesn't support where clause)
      const results = await this.collections.qaCache.query({
        queryTexts: [answer],
        nResults: 10 // Get more results to filter by userId
      });

      // Filter results to only include this user's data
      if (results.distances[0] && results.metadatas[0]) {
        for (let i = 0; i < results.distances[0].length; i++) {
          const metadata = results.metadatas[0][i];
          const distance = results.distances[0][i];
          
          // Check if this result belongs to the same user AND is similar enough
          if (metadata.userId === userId && distance < 0.05) {
            console.log(`✅ Cache hit! Using cached evaluation from user ${userId} (private)`);
            return JSON.parse(metadata.evaluation);
          }
        }
      }

      console.log(`❌ Cache miss for user ${userId}. Generating new evaluation`);
      return null;
    } catch (error) {
      console.error('❌ Failed to query cache:', error);
      return null;
    }
  }

  /**
   * Query knowledge base for relevant context
   */
  async queryKnowledge(query, nResults = 3) {
    try {
      const results = await this.collections.knowledge.query({
        queryTexts: [query],
        nResults
      });

      return {
        documents: results.documents[0] || [],
        metadatas: results.metadatas[0] || [],
        distances: results.distances[0] || []
      };
    } catch (error) {
      console.error('❌ Failed to query knowledge base:', error);
      return { documents: [], metadatas: [], distances: [] };
    }
  }

  /**
   * Get collection statistics
   */
  async getStats() {
    try {
      const qaCacheCount = await this.collections.qaCache.count();
      const knowledgeCount = await this.collections.knowledge.count();
      const patternsCount = await this.collections.patterns.count();

      return {
        qaCache: qaCacheCount,
        knowledge: knowledgeCount,
        patterns: patternsCount
      };
    } catch (error) {
      console.error('❌ Failed to get stats:', error);
      return { qaCache: 0, knowledge: 0, patterns: 0 };
    }
  }
}

// Singleton instance
const chromaService = new ChromaService();

module.exports = { chromaService };
