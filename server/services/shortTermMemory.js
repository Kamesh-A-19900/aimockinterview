/**
 * Short-Term Memory Service
 * 
 * Manages conversation state in RAM/Redis for active interview sessions
 * Provides session lifecycle management with TTL support
 */

const { ConversationState } = require('./conversationState');

class ShortTermMemory {
  constructor() {
    // In-memory storage as fallback (for development)
    this.conversationStates = new Map();
    this.dialogueStates = new Map();
    this.clarificationContexts = new Map();
    this.sessionTTLs = new Map();
    
    // Redis client (will be initialized if available)
    this.redis = null;
    this.useRedis = false;
    
    // Default TTL: 2 hours for interview sessions
    this.defaultTTL = 2 * 60 * 60; // 2 hours in seconds
    
    this.initializeRedis();
    
    console.log('✅ Short-term memory service initialized');
  }
  
  /**
   * Initialize Redis connection (optional)
   */
  async initializeRedis() {
    try {
      // Try to initialize Redis if available
      const redis = require('redis');
      this.redis = redis.createClient({
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
        password: process.env.REDIS_PASSWORD || undefined
      });
      
      await this.redis.connect();
      this.useRedis = true;
      console.log('✅ Redis connected for short-term memory');
    } catch (error) {
      console.log('⚠️  Redis not available, using in-memory fallback');
      this.useRedis = false;
    }
  }
  
  /**
   * Create new conversation session
   */
  async createSession(sessionId, candidateName, resumeData = {}) {
    const conversationState = new ConversationState(sessionId, candidateName, resumeData);
    
    if (this.useRedis) {
      try {
        await this.redis.setEx(
          `conversation:${sessionId}`,
          this.defaultTTL,
          JSON.stringify(conversationState.toJSON())
        );
        console.log(`💾 Session ${sessionId} stored in Redis`);
      } catch (error) {
        console.error('❌ Redis storage failed, using memory fallback:', error);
        this.conversationStates.set(sessionId, conversationState);
      }
    } else {
      this.conversationStates.set(sessionId, conversationState);
      this.setSessionTTL(sessionId, this.defaultTTL);
    }
    
    return conversationState;
  }
  
  /**
   * Get conversation session
   */
  async getSession(sessionId) {
    if (this.useRedis) {
      try {
        const data = await this.redis.get(`conversation:${sessionId}`);
        if (data) {
          return ConversationState.fromJSON(JSON.parse(data));
        }
      } catch (error) {
        console.error('❌ Redis retrieval failed:', error);
      }
    }
    
    // Fallback to in-memory
    const state = this.conversationStates.get(sessionId);
    if (state && this.isSessionValid(sessionId)) {
      return state;
    }
    
    return null;
  }
  
  /**
   * Update conversation session
   */
  async updateSession(sessionId, conversationState) {
    if (this.useRedis) {
      try {
        await this.redis.setEx(
          `conversation:${sessionId}`,
          this.defaultTTL,
          JSON.stringify(conversationState.toJSON())
        );
        return true;
      } catch (error) {
        console.error('❌ Redis update failed:', error);
      }
    }
    
    // Fallback to in-memory
    this.conversationStates.set(sessionId, conversationState);
    this.extendSessionTTL(sessionId, 1800); // Extend by 30 minutes on activity
    return true;
  }
  
  /**
   * Delete conversation session
   */
  async deleteSession(sessionId) {
    if (this.useRedis) {
      try {
        await this.redis.del(`conversation:${sessionId}`);
      } catch (error) {
        console.error('❌ Redis deletion failed:', error);
      }
    }
    
    // Clean up in-memory
    this.conversationStates.delete(sessionId);
    this.dialogueStates.delete(sessionId);
    this.clarificationContexts.delete(sessionId);
    this.sessionTTLs.delete(sessionId);
    
    console.log(`🗑️  Session ${sessionId} deleted from memory`);
  }
  
  /**
   * Set session TTL (Time To Live)
   */
  setSessionTTL(sessionId, ttlSeconds) {
    const expiryTime = Date.now() + (ttlSeconds * 1000);
    this.sessionTTLs.set(sessionId, expiryTime);
  }
  
  /**
   * Extend session TTL
   */
  extendSessionTTL(sessionId, additionalSeconds) {
    const currentTTL = this.sessionTTLs.get(sessionId) || Date.now();
    const newTTL = Math.max(currentTTL, Date.now()) + (additionalSeconds * 1000);
    this.sessionTTLs.set(sessionId, newTTL);
  }
  
  /**
   * Check if session is still valid (not expired)
   */
  isSessionValid(sessionId) {
    const expiryTime = this.sessionTTLs.get(sessionId);
    if (!expiryTime) return false;
    return Date.now() < expiryTime;
  }
  
  /**
   * Clean up expired sessions
   */
  cleanupExpiredSessions() {
    const now = Date.now();
    const expiredSessions = [];
    
    for (const [sessionId, expiryTime] of this.sessionTTLs.entries()) {
      if (now >= expiryTime) {
        expiredSessions.push(sessionId);
      }
    }
    
    expiredSessions.forEach(sessionId => {
      this.conversationStates.delete(sessionId);
      this.dialogueStates.delete(sessionId);
      this.clarificationContexts.delete(sessionId);
      this.sessionTTLs.delete(sessionId);
    });
    
    if (expiredSessions.length > 0) {
      console.log(`🧹 Cleaned up ${expiredSessions.length} expired sessions`);
    }
  }
  
  /**
   * Get session statistics
   */
  getStatistics() {
    return {
      activeSessions: this.conversationStates.size,
      useRedis: this.useRedis,
      memoryUsage: process.memoryUsage(),
      uptime: process.uptime()
    };
  }
  
  /**
   * Rebuild conversation state from database (recovery)
   */
  async rebuildFromDatabase(sessionId, query) {
    try {
      console.log(`🔄 Rebuilding conversation state for session ${sessionId} from database`);
      
      // Get session info
      const sessionResult = await query(
        `SELECT s.user_id, s.resume_id, r.extracted_data, r.name
         FROM interview_sessions s
         LEFT JOIN resumes r ON s.resume_id = r.id
         WHERE s.id = $1`,
        [sessionId]
      );
      
      if (sessionResult.rows.length === 0) {
        throw new Error('Session not found in database');
      }
      
      const sessionData = sessionResult.rows[0];
      const resumeData = sessionData.extracted_data || {};
      const candidateName = sessionData.name || resumeData.name || 'Candidate';
      
      // Create new conversation state
      const conversationState = new ConversationState(sessionId, candidateName, resumeData);
      
      // Get all Q&A pairs to rebuild conversation history
      const qaResult = await query(
        `SELECT question, answer, question_order, created_at
         FROM qa_pairs
         WHERE session_id = $1
         ORDER BY question_order ASC`,
        [sessionId]
      );
      
      // Rebuild conversation history
      for (const qa of qaResult.rows) {
        conversationState.addQA(qa.question, qa.answer);
        
        // Extract entities from answers (simplified rebuild)
        if (qa.answer) {
          // This is a simplified entity extraction for recovery
          // The full EntityTracker will handle this properly
          this.extractBasicEntities(qa.answer, conversationState);
        }
      }
      
      // Store rebuilt state
      await this.updateSession(sessionId, conversationState);
      
      console.log(`✅ Conversation state rebuilt for session ${sessionId}`);
      return conversationState;
      
    } catch (error) {
      console.error(`❌ Failed to rebuild conversation state for session ${sessionId}:`, error);
      throw error;
    }
  }
  
  /**
   * Basic entity extraction for recovery (simplified)
   */
  extractBasicEntities(answer, conversationState) {
    const lowerAnswer = answer.toLowerCase();
    
    // Basic skill extraction
    const techKeywords = [
      'javascript', 'react', 'node', 'python', 'java', 'sql', 'database',
      'api', 'rest', 'graphql', 'docker', 'kubernetes', 'aws', 'cloud'
    ];
    
    techKeywords.forEach(keyword => {
      if (lowerAnswer.includes(keyword)) {
        conversationState.addExtractedEntity({
          type: 'SKILL',
          name: keyword,
          context: answer.substring(0, 100),
          extractedFrom: answer,
          confidence: 0.8
        });
      }
    });
    
    // Basic project extraction (look for "project" patterns)
    const projectMatches = answer.match(/(?:project|built|created|developed)\s+(?:called\s+)?(\w+)/gi);
    if (projectMatches) {
      projectMatches.forEach(match => {
        const projectName = match.split(/\s+/).pop();
        if (projectName && projectName.length > 2) {
          conversationState.addExtractedEntity({
            type: 'PROJECT',
            name: projectName,
            context: answer.substring(0, 100),
            extractedFrom: answer,
            confidence: 0.7
          });
        }
      });
    }
  }
}

// Singleton instance
let shortTermMemoryInstance = null;

function getShortTermMemory() {
  if (!shortTermMemoryInstance) {
    shortTermMemoryInstance = new ShortTermMemory();
    
    // Set up cleanup interval (every 10 minutes)
    setInterval(() => {
      shortTermMemoryInstance.cleanupExpiredSessions();
    }, 10 * 60 * 1000);
  }
  return shortTermMemoryInstance;
}

module.exports = { ShortTermMemory, getShortTermMemory };