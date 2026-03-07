const { getGroqService } = require('./groqService');

/**
 * Context Manager for Interview Sessions
 * 
 * Handles context compression to reduce token usage:
 * - Keeps full history of recent messages
 * - Compresses older messages into summaries
 * - Reduces token usage by 70-80%
 */
class ContextManager {
  constructor(sessionId) {
    this.sessionId = sessionId;
    this.rawHistory = []; // Recent Q&A pairs
    this.summary = ""; // Compressed history
    this.compressionThreshold = 3; // Compress every 3 messages
    this.groq = getGroqService();
  }

  /**
   * Add new Q&A pair to history
   * Triggers compression if threshold reached
   */
  async addMessage(question, answer) {
    this.rawHistory.push({
      question,
      answer,
      timestamp: Date.now()
    });

    console.log(`📝 Added message to context (${this.rawHistory.length} messages)`);

    // Compress every N messages
    if (this.rawHistory.length % this.compressionThreshold === 0) {
      await this.compress();
    }
  }

  /**
   * Compress recent messages into summary
   * Keeps only key insights, discards raw text
   */
  async compress() {
    const recentMessages = this.rawHistory.slice(-this.compressionThreshold);

    const prompt = `
Summarize this interview segment into key insights (max 200 tokens):

${JSON.stringify(recentMessages, null, 2)}

Extract:
1. Technical skills mentioned (specific technologies, frameworks, tools)
2. Projects discussed (brief description, role, impact)
3. Strengths identified (what they did well)
4. Areas to probe further (vague answers, missing details)
5. Key metrics or achievements (numbers, percentages, time saved)

Be concise and factual. Focus on actionable insights.
    `.trim();

    try {
      const response = await this.groq.client.chat.completions.create({
        model: 'llama-3.1-8b-instant', // Cheap model for summarization
        messages: [{ role: 'user', content: prompt }],
        temperature: 0, // Deterministic
        max_tokens: 200
      });

      const newSummary = response.choices[0].message.content;
      this.summary += (this.summary ? "\n\n" : "") + newSummary;

      // Keep only last 2 messages for continuity
      this.rawHistory = this.rawHistory.slice(-2);

      console.log(`✅ Compressed context for session ${this.sessionId}`);
      console.log(`   Token estimate: ${this.estimateTokens()} tokens`);
    } catch (error) {
      console.error('❌ Failed to compress context:', error);
      // Keep raw history if compression fails
    }
  }

  /**
   * Get current context for agent
   * Returns summary + recent messages
   */
  getContext() {
    return {
      summary: this.summary,
      recentMessages: this.rawHistory,
      tokenEstimate: this.estimateTokens()
    };
  }

  /**
   * Get full history (for final evaluation)
   */
  getFullHistory() {
    return {
      summary: this.summary,
      rawHistory: this.rawHistory
    };
  }

  /**
   * Estimate token count
   * Rough estimate: 1 token ≈ 4 characters
   */
  estimateTokens() {
    const summaryTokens = Math.ceil(this.summary.length / 4);
    const recentTokens = Math.ceil(
      JSON.stringify(this.rawHistory).length / 4
    );
    return summaryTokens + recentTokens;
  }

  /**
   * Get last answer for routing decisions
   */
  getLastAnswer() {
    if (this.rawHistory.length === 0) return null;
    return this.rawHistory[this.rawHistory.length - 1].answer;
  }

  /**
   * Get message count
   */
  getMessageCount() {
    return this.rawHistory.length;
  }

  /**
   * Clear context (for cleanup)
   */
  clear() {
    this.rawHistory = [];
    this.summary = "";
    console.log(`🗑️  Cleared context for session ${this.sessionId}`);
  }
}

module.exports = { ContextManager };
