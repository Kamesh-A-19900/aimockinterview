/**
 * Researcher Agent - Deep Diver & Technical Interrogator
 * 
 * Model: Groq Llama 3.1 70B (Smart & Deep)
 * 
 * Responsibilities:
 * - Detect vague answers and CHALLENGE them aggressively
 * - Generate TOUGH technical probing questions
 * - Query knowledge base for context
 * - Challenge assumptions and push for specifics
 * - Act as the "bad cop" interviewer
 * - Handle 20% of interactions
 * 
 * Cost: ~$0.001 per request
 */

const { getGroqService } = require('../services/groqService');
const { chromaService } = require('../services/chromaService');
const { getRateLimitService } = require('../services/rateLimitService');

class ResearcherAgent {
  constructor() {
    this.groq = getGroqService();
    this.model = 'llama-3.1-8b-instant'; // Using 8B model since 70B is decommissioned
    this.rateLimiter = getRateLimitService();
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
      
      const response = await this.rateLimiter.queueRequest(async () => {
        return await this.groq.client.chat.completions.create({
          model: this.model,
          messages: [{role: 'user', content: prompt}],
          temperature: 0.3, // More focused than Interviewer
          max_tokens: 300
        });
      }, context.userId || 'system', 800); // Include userId for rate limiting
      
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
    
    // Analyze answer quality for aggressive response
    const answerLength = lastAnswer?.length || 0;
    const hasNumbers = /\d+/.test(lastAnswer || '');
    const hasSpecifics = /specific|example|implemented|built|developed|created|designed/i.test(lastAnswer || '');
    const isUnprofessional = /lol|haha|whatever|idk|dunno|yeah|nah|ok|fine/i.test(lastAnswer || '');
    const isOneWord = (lastAnswer?.trim().split(' ').length || 0) <= 3;
    
    let aggressiveness = 'standard';
    if (isUnprofessional || isOneWord || answerLength < 30) {
      aggressiveness = 'very_aggressive';
    } else if (isVague || (!hasNumbers && !hasSpecifics)) {
      aggressiveness = 'aggressive';
    } else if (hasSpecifics && hasNumbers) {
      aggressiveness = 'probing';
    }
    
    let prompt = `You are a SENIOR TECHNICAL INTERVIEWER known for being TOUGH and DEMANDING. You work at a top-tier tech company and have ZERO TOLERANCE for vague, unprofessional, or weak answers.

INTERVIEWER PERSONALITY:
- Direct, challenging, and uncompromising
- Expects CONCRETE examples with QUANTIFIED results
- Calls out vague answers immediately
- Pushes candidates to their technical limits
- Does NOT accept "I don't know" without follow-up
- Maintains professional authority but is STRICT

CURRENT AGGRESSIVENESS LEVEL: ${aggressiveness.toUpperCase()}

Candidate's Last Answer:
"${lastAnswer}"

ANSWER ANALYSIS:
- Length: ${answerLength} characters
- Has Numbers/Metrics: ${hasNumbers ? 'YES' : 'NO'}
- Has Specifics: ${hasSpecifics ? 'YES' : 'NO'}
- Professional: ${isUnprofessional ? 'NO' : 'YES'}
- Quality Assessment: ${this.getAnswerQualityAssessment(lastAnswer)}

`;

    // Add topic context if available
    if (topicContext) {
      if (topicContext.shouldTransition && topicContext.nextTopic) {
        prompt += `🔄 TRANSITION TO NEW TOPIC:
- New Topic: ${topicContext.nextTopic.name} (${topicContext.nextTopic.type})
- Action: Move to this topic with a CHALLENGING technical question
- Be direct and authoritative

`;
      } else if (topicContext.currentTopic) {
        prompt += `📍 CURRENT TOPIC: ${topicContext.currentTopic.name}
- Continue GRILLING them on this ${topicContext.currentTopic.type}
- Demand technical depth and implementation details
- Push for specifics and quantified results

`;
      }
    }

    // Add knowledge base context
    if (kbContext && Array.isArray(kbContext) && kbContext.length > 0) {
      prompt += `Industry Standards & Best Practices:
${kbContext.map((doc, i) => `${i + 1}. ${doc}`).join('\n')}

`;
    }
    
    // Add interview summary
    if (summary) {
      prompt += `Interview Progress:
${summary}

`;
    }
    
    // Add extracted concepts
    if (concepts.length > 0) {
      prompt += `Technical Concepts Mentioned: ${concepts.join(', ')}

`;
    }
    
    // Add aggressiveness-specific instructions
    let aggressivenessInstructions = '';
    
    switch (aggressiveness) {
      case 'very_aggressive':
        aggressivenessInstructions = `
🔥 VERY AGGRESSIVE MODE - Candidate gave unprofessional/inadequate response:
- Be STERN and DIRECT
- Express disappointment in the answer quality
- Demand they take this seriously
- Use phrases like "That's not acceptable" or "I need much more detail"
- Challenge their professionalism
- Example: "That's far too brief for a technical interview. Let me be very specific about what I need..."
`;
        break;
        
      case 'aggressive':
        aggressivenessInstructions = `
⚡ AGGRESSIVE MODE - Vague or weak answer:
- Call out the vagueness directly
- Demand specific metrics and examples
- Don't let them off the hook
- Use phrases like "That's too vague" or "I need concrete numbers"
- Example: "That's too general. What specific metrics improved and by how much?"
`;
        break;
        
      case 'probing':
        aggressivenessInstructions = `
🔍 PROBING MODE - Decent answer, push deeper:
- Acknowledge briefly, then dig deeper
- Ask about edge cases, failures, trade-offs
- Test their depth of understanding
- Example: "Good. Now what happens when that approach fails at scale?"
`;
        break;
        
      default:
        aggressivenessInstructions = `
💼 STANDARD MODE - Professional but demanding:
- Maintain high standards
- Ask challenging technical questions
- Expect detailed, specific responses
`;
    }
    
    prompt += aggressivenessInstructions;
    
    // Add vagueness detection
    if (isVague) {
      prompt += `
⚠️  VAGUE ANSWER DETECTED: This answer lacks specific metrics, numbers, or concrete details. CALL THIS OUT.

`;
    }
    
    // Add instructions
    prompt += `

Your Task - Generate a CHALLENGING technical question that:

`;

    if (aggressiveness === 'very_aggressive') {
      prompt += `1. CALLS OUT the inadequate response directly
2. DEMANDS they provide proper technical details
3. Makes it clear you expect professional-level answers
4. Asks for specific implementation details with metrics
5. Shows you won't accept weak responses
`;
    } else if (isVague) {
      prompt += `1. DIRECTLY addresses the vagueness: "That's too general..."
2. DEMANDS specific metrics: "What exact numbers improved?"
3. PUSHES for concrete examples: "Give me a specific implementation..."
4. CHALLENGES vague claims: "How exactly did you measure that?"
5. Makes it clear you expect QUANTIFIED results
`;
    } else if (topicContext?.shouldTransition) {
      prompt += `1. Transitions AUTHORITATIVELY to: ${topicContext.nextTopic.name}
2. Asks a CHALLENGING technical question about this topic
3. Sets high expectations for the response
4. Demands specific examples and metrics
`;
    } else {
      prompt += `1. Probes DEEPER into technical implementation details
2. Asks about FAILURE scenarios and edge cases
3. Tests their understanding of TRADE-OFFS
4. Challenges them with industry best practices
5. Demands QUANTIFIED results and specific metrics
`;
    }
    
    prompt += `

QUESTION STYLE REQUIREMENTS:
- Be DIRECT and CHALLENGING (not friendly or encouraging)
- Use authoritative language: "I need...", "Explain exactly...", "What specific..."
- Demand concrete examples and metrics
- Professional but TOUGH
- Under 35 words
- NO pleasantries or encouragement

AVOID:
- Friendly phrases like "That's great!" or "Interesting!"
- Vague questions that allow vague answers
- Multiple questions in one
- Being too nice or encouraging

Return ONLY the question text, no additional formatting or explanation.`;
    
    return prompt;
  }
  
  /**
   * Get answer quality assessment
   * @param {string} answer - Candidate's answer
   * @returns {string} Quality assessment
   */
  getAnswerQualityAssessment(answer) {
    if (!answer) return 'No answer provided';
    
    const length = answer.length;
    const hasNumbers = /\d+/.test(answer);
    const hasSpecifics = /specific|example|implemented|built|developed|created|designed/i.test(answer);
    const isVague = /maybe|i think|probably|not sure|i guess|kind of|sort of/i.test(answer);
    const isUnprofessional = /lol|haha|whatever|idk|dunno|yeah|nah|ok|fine/i.test(answer);
    const isOneWord = answer.trim().split(' ').length <= 3;
    
    if (isUnprofessional) return 'Unprofessional language detected';
    if (isOneWord) return 'Extremely brief/inadequate';
    if (length < 30) return 'Too short for technical question';
    if (isVague && !hasNumbers) return 'Vague without metrics';
    if (!hasSpecifics && length < 100) return 'Lacks technical detail';
    if (hasSpecifics && hasNumbers && length > 150) return 'Good technical depth';
    if (hasNumbers || hasSpecifics) return 'Adequate with some detail';
    return 'Generic/surface-level response';
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
    const challengingQuestions = [
      "That's too vague. What specific metrics improved and by how much?",
      "I need concrete numbers. What was the exact performance gain?",
      "What specific technical challenges did you face and how did you solve them?",
      "That's too general. Walk me through the exact implementation details.",
      "What trade-offs did you consider and why did you choose that approach?",
      "How did you measure success? Give me specific metrics.",
      "What would you do differently if you had to implement it again?",
      "That lacks detail. What specific technologies did you use and why?",
      "How did that solution perform under load? Give me numbers.",
      "What were the failure scenarios and how did you handle them?",
      "I need more specifics. What exactly was your role in that project?",
      "That's too surface-level. What were the technical complexities involved?"
    ];
    
    const index = Math.floor(Math.random() * challengingQuestions.length);
    console.log('⚠️  Using fallback challenging question');
    return challengingQuestions[index];
  }
}

module.exports = { ResearcherAgent };
