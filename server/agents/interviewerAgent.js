/**
 * Interviewer Agent - Conversationalist
 * 
 * Model: Groq Llama 3.1 8B (Fast & Cheap)
 * 
 * Responsibilities:
 * - Generate follow-up questions
 * - Maintain conversation flow
 * - Show empathy and engagement
 * - Handle 70% of interactions
 * 
 * Cost: ~$0.0001 per request
 */

const { getGroqService } = require('../services/groqService');

class InterviewerAgent {
  constructor() {
    this.groq = getGroqService();
    this.model = 'llama-3.1-8b-instant'; // Fast & cheap
  }
  
  /**
   * Generate conversational follow-up question
   * @param {Object} context - Interview context
   * @returns {Promise<string>} Generated question
   */
  async generateQuestion(context) {
    const prompt = this.buildPrompt(context);
    
    try {
      const startTime = Date.now();
      
      const response = await this.groq.client.chat.completions.create({
        model: this.model,
        messages: [{role: 'user', content: prompt}],
        temperature: 0.7, // Creative but controlled
        max_tokens: 200
      });
      
      const duration = Date.now() - startTime;
      console.log(`✅ Interviewer Agent: Generated question in ${duration}ms`);
      
      return response.choices[0].message.content.trim();
    } catch (error) {
      console.error('❌ Interviewer Agent error:', error.message);
      
      // Fallback question
      return this.getFallbackQuestion(context);
    }
  }
  
  /**
   * Build prompt for question generation with intelligent topic tracking
   * @param {Object} context - Interview context
   * @returns {string} Prompt
   */
  buildPrompt(context) {
    const { lastAnswer, summary, resumeData, questionCount, topicContext } = context;
    
    // Get topic-aware instructions
    let topicInstructions = '';
    
    if (topicContext && topicContext.shouldTransition && topicContext.nextTopic) {
      // Transition to new topic
      const topic = topicContext.nextTopic;
      topicInstructions = `
🔄 TRANSITION TO NEW TOPIC:
- Type: ${topic.type}
- Topic: ${topic.name}
- Action: Smoothly transition from previous topic to this new ${topic.type}
- Ask about: ${topic.name}
- Make it conversational and natural

Example transitions:
- "That's great! I'd also like to hear about ${topic.name}..."
- "Interesting! Now, can you tell me about ${topic.name}?"
- "Thanks for sharing. Let's discuss ${topic.name}..."
`;
    } else if (topicContext && topicContext.currentTopic) {
      // Continue current topic
      topicInstructions = `
📍 CURRENT TOPIC: ${topicContext.currentTopic.name}
- Continue exploring this ${topicContext.currentTopic.type}
- Ask follow-up questions to go deeper
- Probe for details, challenges, outcomes
`;
    } else {
      // General flow
      topicInstructions = `
💬 CONVERSATIONAL FLOW:
- Build naturally on their previous answer
- Show genuine interest and engagement
- Ask for specific examples or details
`;
    }
    
    let prompt = `You are an empathetic and engaging interviewer conducting a professional interview.

${topicInstructions}

`;

    // Add resume context if available
    if (resumeData) {
      prompt += `Candidate Background:
- Name: ${resumeData.name || 'Not specified'}
- Skills: ${resumeData.skills?.slice(0, 8).join(', ') || 'Not specified'}
- Experience: ${resumeData.experience?.slice(0, 3).map(e => `${e.position} at ${e.company}`).join(', ') || 'Not specified'}
- Education: ${resumeData.education?.slice(0, 2).map(e => `${e.degree} from ${e.institution}`).join(', ') || 'Not specified'}
- Projects: ${resumeData.projects?.slice(0, 3).map(p => p.name).join(', ') || 'Not specified'}

`;
    }
    
    // Add conversation summary
    if (summary) {
      prompt += `Interview Summary So Far:
${summary}

`;
    }
    
    // Add last answer
    if (lastAnswer) {
      prompt += `Candidate's Last Answer:
"${lastAnswer}"

`;
    }
    
    // Add coverage stats if available
    if (topicContext && topicContext.coverage) {
      const cov = topicContext.coverage;
      prompt += `Coverage Progress:
- Projects: ${cov.projects.covered}/${cov.projects.total} discussed
- Skills: ${cov.skills.covered}/${cov.skills.total} discussed
- Overall: ${cov.overall.percentage}% of resume covered

`;
    }
    
    prompt += `Generate your next question:

Requirements:
1. Be conversational and natural
2. Build on their previous answer
3. ${topicContext?.shouldTransition ? 'Transition smoothly to the new topic' : 'Continue exploring current topic'}
4. Encourage detailed responses with specific examples
5. Maintain professional yet friendly tone

Keep it:
- Conversational and engaging
- Clear and specific
- Professional but friendly
- Under 35 words

Return ONLY the question text, no additional formatting or explanation.`;
    
    return prompt;
  }
  
  /**
   * Get fallback question if API fails
   * @param {Object} context - Interview context
   * @returns {string} Fallback question
   */
  getFallbackQuestion(context) {
    const fallbackQuestions = [
      "Can you tell me more about that experience?",
      "What was the most challenging aspect of that project?",
      "How did you approach solving that problem?",
      "What did you learn from that experience?",
      "Can you walk me through your thought process?",
      "What would you do differently if you could do it again?",
      "How did that experience shape your approach to similar challenges?",
      "What was the outcome of that project?",
      "How did you measure success in that role?",
      "What skills did you develop through that experience?"
    ];
    
    // Return random fallback
    const index = Math.floor(Math.random() * fallbackQuestions.length);
    console.log('⚠️  Using fallback question');
    return fallbackQuestions[index];
  }
  
  /**
   * Generate opening question for interview (Self-Introduction)
   * @param {Object} resumeData - Candidate's resume data
   * @returns {Promise<string>} Opening question
   */
  async generateOpeningQuestion(resumeData) {
    const candidateName = resumeData.name || 'there';
    
    // Always start with self-introduction
    return `Hello ${candidateName}, thank you for joining us today. Let's start with you telling me about yourself - your background, experience, and what brings you here.`;
  }
}

module.exports = { InterviewerAgent };
