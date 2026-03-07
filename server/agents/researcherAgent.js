/**
 * Researcher Agent - Deep Diver
 * 
 * Model: Groq Llama 3.1 70B (Smart & Deep)
 * 
 * Responsibilities:
 * - Detect vague answers (no metrics)
 * - Generate technical probing questions
 * - Query knowledge base for context
 * - Challenge assumptions
 * - Handle 20% of interactions
 * 
 * Cost: ~$0.001 per request
 */

const { getGroqService } = require('../services/groqService');
const { chromaService } = require('../services/chromaService');

class ResearcherAgent {
  constructor() {
    this.groq = getGroqService();
    this.model = 'openai/gpt-oss-120b'; // 120B - Most intelligent for technical deep-dive
  }
  
  /**
   * Generate technical deep-dive question
   * @param {Object} context - Interview context
   * @returns {Promise<Object>} Question with metadata
   */
  async generateQuestion(context) {
    try {
      // Extract technical concepts from last answer
      const concepts = this.extractConcepts(context.lastAnswer);
      
      // Query knowledge base for relevant context
      let kbContext = null;
      if (concepts.length > 0) {
        const kbResults = await chromaService.queryKnowledge(concepts.join(' '), 3);
        kbContext = kbResults.documents && kbResults.documents[0] ? kbResults.documents[0] : [];
      }
      
      // Detect if answer is vague
      const isVague = this.detectVagueness(context.lastAnswer);
      
      // Build prompt
      const prompt = this.buildPrompt(context, kbContext, isVague, concepts);
      
      const startTime = Date.now();
      
      const response = await this.groq.client.chat.completions.create({
        model: this.model,
        messages: [{role: 'user', content: prompt}],
        temperature: 0.3, // More focused than Interviewer
        max_tokens: 300
      });
      
      const duration = Date.now() - startTime;
      console.log(`✅ Researcher Agent: Generated question in ${duration}ms`);
      
      const content = response.choices[0].message.content.trim();
      
      // Try to parse as JSON, fallback to plain text
      try {
        const parsed = JSON.parse(content);
        return {
          question: parsed.next_question || parsed.question || content,
          isVague: parsed.is_vague || isVague,
          probingAreas: parsed.probing_areas || concepts,
          concepts: concepts
        };
      } catch {
        return {
          question: content,
          isVague: isVague,
          probingAreas: concepts,
          concepts: concepts
        };
      }
    } catch (error) {
      console.error('❌ Researcher Agent error:', error.message);
      
      // Fallback
      return {
        question: this.getFallbackQuestion(context),
        isVague: false,
        probingAreas: [],
        concepts: []
      };
    }
  }
  
  /**
   * Build prompt for technical question generation with topic awareness
   * @param {Object} context - Interview context
   * @param {Array} kbContext - Knowledge base context
   * @param {boolean} isVague - Whether answer is vague
   * @param {Array} concepts - Extracted technical concepts
   * @returns {string} Prompt
   */
  buildPrompt(context, kbContext, isVague, concepts) {
    const { lastAnswer, summary, topicContext } = context;
    
    let prompt = `You are a technical researcher conducting a deep technical interview.

Candidate's Last Answer:
"${lastAnswer}"

`;

    // Add topic context if available
    if (topicContext) {
      if (topicContext.shouldTransition && topicContext.nextTopic) {
        prompt += `🔄 TRANSITION TO NEW TOPIC:
- New Topic: ${topicContext.nextTopic.name} (${topicContext.nextTopic.type})
- Action: Smoothly transition to this new topic with a technical question
- Make it natural and conversational

`;
      } else if (topicContext.currentTopic) {
        prompt += `📍 CURRENT TOPIC: ${topicContext.currentTopic.name}
- Continue exploring this ${topicContext.currentTopic.type} with technical depth
- Probe for implementation details and technical decisions

`;
      }
    }

    // Add knowledge base context
    if (kbContext && Array.isArray(kbContext) && kbContext.length > 0) {
      prompt += `Relevant Technical Knowledge:
${kbContext.map((doc, i) => `${i + 1}. ${doc}`).join('\n')}

`;
    }
    
    // Add interview summary
    if (summary) {
      prompt += `Interview Summary:
${summary}

`;
    }
    
    // Add vagueness detection
    if (isVague) {
      prompt += `⚠️  VAGUE ANSWER DETECTED: The answer lacks specific metrics, numbers, or concrete details.

`;
    }
    
    // Add extracted concepts
    if (concepts.length > 0) {
      prompt += `Technical Concepts Mentioned: ${concepts.join(', ')}

`;
    }
    
    // Add instructions
    prompt += `Your Task:
Generate a deep technical follow-up question that:

`;

    if (isVague) {
      prompt += `1. Asks for QUANTIFICATION: "Can you provide specific metrics?"
2. Probes for CONCRETE DETAILS: "What exactly did you implement?"
3. Challenges VAGUE CLAIMS: "How did you measure that improvement?"
`;
    } else if (topicContext?.shouldTransition) {
      prompt += `1. Smoothly TRANSITIONS to the new topic: ${topicContext.nextTopic.name}
2. Asks a technical question about this new topic
3. Makes the transition feel natural and conversational
`;
    } else {
      prompt += `1. Probes DEEPER into the technical implementation
2. Asks about TRADE-OFFS and design decisions
3. Tests DEPTH of understanding
4. References industry best practices from knowledge base
`;
    }
    
    prompt += `
Keep the question:
- Specific and technical
- Challenging but fair
- Under 40 words
- Professional

Return ONLY the question text, no additional formatting.`;
    
    return prompt;
  }
  
  /**
   * Extract technical concepts from text
   * @param {string} text - Text to analyze
   * @returns {Array<string>} Extracted concepts
   */
  extractConcepts(text) {
    if (!text) return [];
    
    const technicalKeywords = [
      // Programming
      'algorithm', 'data structure', 'complexity', 'optimization',
      'API', 'REST', 'GraphQL', 'microservices',
      
      // Database
      'database', 'SQL', 'NoSQL', 'MongoDB', 'PostgreSQL', 'Redis',
      'cache', 'caching', 'indexing', 'query',
      
      // AI & ML
      'RAG', 'LLM', 'GPT', 'embedding', 'vector', 'semantic',
      'machine learning', 'neural network', 'model',
      
      // Architecture
      'architecture', 'design pattern', 'scalability', 'distributed',
      'event-driven', 'message queue', 'load balancer',
      
      // DevOps
      'Docker', 'Kubernetes', 'CI/CD', 'pipeline', 'deployment',
      'AWS', 'cloud', 'serverless', 'monitoring',
      
      // Frontend
      'React', 'Vue', 'Angular', 'component', 'state management',
      'Redux', 'hooks', 'performance', 'bundle',
      
      // Backend
      'Node.js', 'Express', 'authentication', 'authorization',
      'JWT', 'OAuth', 'security', 'encryption'
    ];
    
    const lowerText = text.toLowerCase();
    const found = [];
    
    technicalKeywords.forEach(keyword => {
      if (lowerText.includes(keyword.toLowerCase())) {
        found.push(keyword);
      }
    });
    
    return [...new Set(found)]; // Remove duplicates
  }
  
  /**
   * Detect if answer is vague (lacks specifics)
   * @param {string} text - Text to analyze
   * @returns {boolean} True if vague
   */
  detectVagueness(text) {
    if (!text) return true;
    
    // Vague phrases
    const vaguePatterns = [
      /improved efficiency/i,
      /made it better/i,
      /optimized performance/i,
      /worked on/i,
      /helped with/i,
      /contributed to/i,
      /was involved in/i,
      /participated in/i,
      /assisted with/i,
      /enhanced/i,
      /upgraded/i,
      /modernized/i
    ];
    
    // Check for vague patterns
    const hasVaguePattern = vaguePatterns.some(pattern => pattern.test(text));
    
    // Check for numbers/metrics (good sign)
    const hasNumbers = /\d+/.test(text);
    
    // Check for specific technical details
    const hasSpecifics = text.length > 100; // Longer answers tend to be more specific
    
    // Vague if: has vague pattern AND (no numbers OR short answer)
    return hasVaguePattern && (!hasNumbers || !hasSpecifics);
  }
  
  /**
   * Get fallback question if API fails
   * @param {Object} context - Interview context
   * @returns {string} Fallback question
   */
  getFallbackQuestion(context) {
    const fallbackQuestions = [
      "Can you provide specific metrics or numbers to quantify that improvement?",
      "What were the key technical challenges you faced in that implementation?",
      "How did you decide on that particular approach over alternatives?",
      "What trade-offs did you consider when making that design decision?",
      "Can you walk me through the technical architecture of that system?",
      "What specific technologies or tools did you use, and why?",
      "How did you measure the success of that implementation?",
      "What would you do differently if you were to implement it again?",
      "Can you explain the technical details of how that works?",
      "What were the performance implications of that approach?"
    ];
    
    const index = Math.floor(Math.random() * fallbackQuestions.length);
    console.log('⚠️  Using fallback technical question');
    return fallbackQuestions[index];
  }
}

module.exports = { ResearcherAgent };
