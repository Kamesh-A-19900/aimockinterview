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
const { getRateLimitService } = require('../services/rateLimitService');
const { getPDFQuestionBankService } = require('../services/pdfQuestionBankService');

class InterviewerAgent {
  constructor() {
    this.groq = getGroqService();
    this.model = 'llama-3.1-8b-instant'; // Fast & cheap
    this.rateLimiter = getRateLimitService();
    this.questionBank = getPDFQuestionBankService();
  }
  
  /**
   * Generate conversational follow-up question
   * @param {Object} context - Interview context
   * @returns {Promise<string>} Generated question
   */
  async generateQuestion(context) {
    try {
      // First, try to get relevant questions from the PDF question bank
      const relevantQuestions = await this.getQuestionBankSuggestions(context);
      
      // Build prompt with question bank context
      const prompt = this.buildPrompt(context, relevantQuestions);
      
      const startTime = Date.now();
      
      const response = await this.rateLimiter.queueRequest(async () => {
        return await this.groq.client.chat.completions.create({
          model: this.model,
          messages: [{role: 'user', content: prompt}],
          temperature: 0.7, // Creative but controlled
          max_tokens: 200
        });
      }, context.userId || 'system', 700); // Include userId for rate limiting
      
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
   * Get question suggestions from PDF question bank
   * @param {Object} context - Interview context
   * @returns {Promise<Array>} Relevant questions from question bank
   */
  async getQuestionBankSuggestions(context) {
    try {
      if (!this.questionBank.isInitialized) {
        console.log('⚠️  Question bank not initialized, using fallback');
        return [];
      }
      
      // Prepare context for question bank query
      const candidateAnswer = context.lastAnswer || '';
      const resumeContext = this.buildResumeContext(context.resumeData);
      const previousTopics = this.extractPreviousTopics(context.previousQuestions || []);
      
      // Get relevant questions from question bank
      const relevantQuestions = await this.questionBank.getRelevantQuestions(
        candidateAnswer,
        resumeContext,
        previousTopics
      );
      
      console.log(`📚 Found ${relevantQuestions.length} relevant questions from question bank`);
      return relevantQuestions;
      
    } catch (error) {
      console.error('❌ Error getting question bank suggestions:', error);
      return [];
    }
  }
  
  /**
   * Build resume context string
   * @param {Object} resumeData - Resume data
   * @returns {string} Resume context
   */
  buildResumeContext(resumeData) {
    if (!resumeData) return '';
    
    const parts = [];
    
    if (resumeData.skills) {
      parts.push(`Skills: ${resumeData.skills.slice(0, 8).join(', ')}`);
    }
    
    if (resumeData.experience) {
      const exp = resumeData.experience.slice(0, 3)
        .map(e => `${e.position} at ${e.company}`)
        .join(', ');
      parts.push(`Experience: ${exp}`);
    }
    
    if (resumeData.projects) {
      const projects = resumeData.projects.slice(0, 3)
        .map(p => p.name)
        .join(', ');
      parts.push(`Projects: ${projects}`);
    }
    
    return parts.join('. ');
  }
  
  /**
   * Extract topics from previous questions
   * @param {Array} previousQuestions - Previous questions
   * @returns {Array} Extracted topics
   */
  extractPreviousTopics(previousQuestions) {
    const topics = new Set();
    
    const techKeywords = [
      'javascript', 'react', 'node', 'python', 'java', 'sql', 'database',
      'api', 'rest', 'graphql', 'microservices', 'docker', 'kubernetes',
      'aws', 'cloud', 'frontend', 'backend', 'fullstack', 'devops'
    ];
    
    previousQuestions.forEach(question => {
      const lowerQuestion = question.toLowerCase();
      techKeywords.forEach(keyword => {
        if (lowerQuestion.includes(keyword)) {
          topics.add(keyword);
        }
      });
    });
    
    return Array.from(topics);
  }
  
  /**
   * Build prompt for question generation with intelligent topic tracking
   * @param {Object} context - Interview context
   * @param {Array} relevantQuestions - Questions from PDF question bank
   * @returns {string} Prompt
   */
  buildPrompt(context, relevantQuestions = []) {
    const { lastAnswer, summary, resumeData, questionCount, topicContext, previousQuestions, previousAnswers, mentionedProjects, mentionedSkills, mentionedTechnologies } = context;
    
    // Analyze answer quality and candidate behavior
    let candidateBehavior = this.analyzeCandidateBehavior(lastAnswer, previousAnswers || []);
    let interviewerResponse = this.determineInterviewerResponse(candidateBehavior, questionCount);
    
    // Check for repeated questions (CRITICAL FIX)
    const isRepeatedTopic = this.isRepeatingTopic(previousQuestions || [], topicContext?.currentTopic);
    
    // CRITICAL: Analyze if candidate is asking for clarification
    const needsClarification = this.detectClarificationRequest(lastAnswer);
    
    // Use the entities from DialogueController instead of re-extracting
    const allMentionedProjects = [
      ...(mentionedProjects || []),
      ...(mentionedTechnologies || [])
    ];
    const allMentionedSkills = [
      ...(mentionedSkills || []),
      ...(mentionedTechnologies || [])
    ];
    
    let prompt = `You are a SENIOR TECHNICAL INTERVIEWER with 15+ years of experience. You maintain COMPLETE CONTROL of the interview and adapt your approach based on candidate behavior.

CANDIDATE BEHAVIOR ANALYSIS: ${candidateBehavior.type.toUpperCase()}
INTERVIEWER RESPONSE MODE: ${interviewerResponse.mode.toUpperCase()}
QUESTION COUNT: ${questionCount}
REPEATED TOPIC DETECTED: ${isRepeatedTopic ? 'YES - MUST CHANGE TOPIC' : 'NO'}
CLARIFICATION REQUESTED: ${needsClarification ? 'YES - MUST CLARIFY' : 'NO'}

CRITICAL CONTEXT AWARENESS:
- ONLY ask about projects/technologies the candidate has ACTUALLY mentioned
- NEVER assume projects or skills not explicitly stated by the candidate
- If candidate asks for clarification, provide it before asking new questions
- Build questions based on what the candidate has ACTUALLY said

MENTIONED PROJECTS: ${allMentionedProjects.length > 0 ? allMentionedProjects.join(', ') : 'NONE - Do not assume any projects'}
MENTIONED SKILLS: ${allMentionedSkills.length > 0 ? allMentionedSkills.join(', ') : 'NONE - Ask about their actual skills'}

`;

    // Handle clarification requests FIRST
    if (needsClarification) {
      prompt += `🔍 CLARIFICATION REQUEST DETECTED:
The candidate is asking for clarification about your previous question. You MUST:
1. Acknowledge their confusion
2. Clarify what you meant or rephrase the question
3. Be more specific about what you're asking
4. Don't ask a completely new question until you clarify

EXAMPLES:
- "Let me clarify - I was asking about [specific topic]"
- "Sorry for the confusion. What I meant was..."
- "Let me be more specific about what I'm looking for..."
- "I see you mentioned ${allMentionedProjects.join(', ')} - let's focus on one of these"

`;
    }

    // Handle multiple projects mentioned
    if (allMentionedProjects.length > 1) {
      prompt += `🎯 MULTIPLE PROJECTS MENTIONED:
The candidate has mentioned these projects: ${allMentionedProjects.join(', ')}
- Pick ONE specific project to focus on
- Ask detailed questions about that ONE project
- Don't ask generic questions about "projects" - be specific
- Example: "Tell me about the technical architecture of StudySpark" (not "tell me about your projects")

`;
    }

    // Add candidate behavior context
    if (candidateBehavior.type === 'uncooperative') {
      prompt += `🚨 UNCOOPERATIVE CANDIDATE DETECTED:
- Multiple unprofessional responses: ${candidateBehavior.unprofessionalCount}
- Refusing to answer questions: ${candidateBehavior.refusalCount}
- One-word answers: ${candidateBehavior.briefCount}

IMMEDIATE ACTION REQUIRED: ${interviewerResponse.action}

`;
    } else if (candidateBehavior.type === 'evasive') {
      prompt += `⚠️ EVASIVE CANDIDATE DETECTED:
- Avoiding technical questions
- Deflecting with questions
- Not providing concrete answers

ACTION: ${interviewerResponse.action}

`;
    }

    // Add resume context
    if (resumeData) {
      prompt += `Candidate Background (USE THIS, DON'T ASSUME):
- Name: ${resumeData.name || 'Candidate'}
- Skills: ${resumeData.skills?.slice(0, 8).join(', ') || 'Not specified - ASK about their skills'}
- Experience: ${resumeData.experience?.slice(0, 3).map(e => `${e.position} at ${e.company}`).join(', ') || 'Not specified - ASK about their experience'}
- Projects: ${resumeData.projects?.slice(0, 3).map(p => p.name).join(', ') || 'Not specified - ASK about their projects'}

`;
    }
    
    // Add conversation history for context
    if (previousQuestions && previousAnswers && previousQuestions.length > 0) {
      prompt += `CONVERSATION HISTORY (CRITICAL - USE THIS FOR CONTEXT):
`;
      for (let i = 0; i < Math.min(previousQuestions.length, previousAnswers.length); i++) {
        prompt += `Q${i + 1}: ${previousQuestions[i]}
A${i + 1}: ${previousAnswers[i] || 'No answer'}

`;
      }
    }
    
    // Add last answer analysis
    if (lastAnswer) {
      prompt += `Candidate's Last Answer: "${lastAnswer}"
Answer Quality: ${this.analyzeAnswerQuality(lastAnswer)}

`;
    }
    
    // CRITICAL: Handle repeated topics
    if (isRepeatedTopic) {
      prompt += `🔄 TOPIC REPETITION DETECTED - MUST CHANGE APPROACH:
- You've asked about this topic ${this.countTopicRepeats(previousQuestions, topicContext?.currentTopic)} times
- Candidate is not responding appropriately
- MANDATORY: Switch to a completely different topic or approach

`;
    }
    
    // Add question bank context if available
    if (relevantQuestions.length > 0) {
      prompt += `📚 RELEVANT INTERVIEW SCENARIOS FROM QUESTION BANK:
${relevantQuestions.map((q, i) => 
  `${i + 1}. ${q.question} (Relevance: ${Math.round(q.relevanceScore * 100)}%, Type: ${q.type}, Difficulty: ${q.difficulty})`
).join('\n')}

INSTRUCTIONS FOR USING QUESTION BANK:
- Use these scenarios as inspiration for your next question
- Adapt the questions to fit the current conversation flow
- Stay within the context of these proven interview scenarios
- Don't copy exactly - make it conversational and relevant
- Prioritize higher relevance scores

`;
    }
    
    // Add response mode instructions
    prompt += this.getResponseModeInstructions(interviewerResponse, candidateBehavior, isRepeatedTopic);
    
    // Add topic guidance
    if (topicContext && topicContext.shouldTransition && topicContext.nextTopic) {
      prompt += `
🔄 TRANSITION TO NEW TOPIC:
- New Topic: ${topicContext.nextTopic.name} (${topicContext.nextTopic.type})
- This is ${isRepeatedTopic ? 'MANDATORY due to repetition' : 'recommended for coverage'}
- Ask about: ${topicContext.nextTopic.name}

`;
    }
    
    prompt += `
Generate your next question following these STRICT rules:

QUESTION REQUIREMENTS:
1. ${interviewerResponse.tone} tone as specified above
2. ${isRepeatedTopic ? 'MUST change topic - no exceptions' : 'Continue current approach'}
3. ${candidateBehavior.type === 'uncooperative' ? 'Address unprofessional behavior directly' : 'Maintain professional standards'}
4. ${relevantQuestions.length > 0 ? 'STAY WITHIN the question bank scenarios - adapt but don\'t deviate' : 'Use professional interview standards'}
5. ${needsClarification ? 'PROVIDE CLARIFICATION FIRST before asking new questions' : 'Ask clear, specific questions'}
6. Be SPECIFIC and DIRECT
7. Under 30 words

CRITICAL CONTEXT RULES:
- NEVER ask about projects/technologies not mentioned by the candidate
- NEVER assume skills or experience not explicitly stated
- BUILD on what the candidate has actually said
- If candidate asks "which project?" - clarify or ask them to tell you about their projects
- If candidate seems confused, clarify your question
- LISTEN to their answers and respond appropriately
- If candidate mentions multiple projects (${allMentionedProjects.join(', ')}), pick ONE and ask specific questions about it

CRITICAL RULES:
- NEVER repeat the same question type more than 2 times
- NEVER ask "tell me more about your projects" if they already mentioned specific ones
- If candidate is uncooperative, address it directly
- If candidate deflects, redirect firmly
- Always maintain interview control
- Switch topics if current approach isn't working
- BE SPECIFIC: Instead of "tell me about your projects", ask "How did you implement the AI features in StudySpark?"
${relevantQuestions.length > 0 ? '- PRIORITIZE questions inspired by the question bank scenarios above' : ''}
${relevantQuestions.length > 0 ? '- These scenarios are from real interviews - they work well' : ''}

Return ONLY the question text, no additional formatting.`;
    
    return prompt;
  }
  
  /**
   * Analyze candidate behavior patterns
   * @param {string} lastAnswer - Most recent answer
   * @param {Array} previousAnswers - All previous answers
   * @returns {Object} Behavior analysis
   */
  analyzeCandidateBehavior(lastAnswer, previousAnswers = []) {
    const allAnswers = [...previousAnswers, lastAnswer].filter(Boolean);
    
    let unprofessionalCount = 0;
    let refusalCount = 0;
    let briefCount = 0;
    let deflectionCount = 0;
    let clarificationCount = 0;
    
    allAnswers.forEach(answer => {
      const lower = answer.toLowerCase();
      
      // Unprofessional responses
      if (/you are not good|what happened to you|why cant you|this is stupid|boring|idiotic/i.test(answer)) {
        unprofessionalCount++;
      }
      
      // Direct refusals
      if (/i wont|i will not|i dont want|no way|refuse/i.test(answer)) {
        refusalCount++;
      }
      
      // Very brief responses
      if (answer.trim().length <= 10 || /^(hi|ok|yes|no|maybe)$/i.test(answer.trim())) {
        briefCount++;
      }
      
      // Deflection attempts
      if (/can you ask|why dont you|what about|ask me about/i.test(answer)) {
        deflectionCount++;
      }
      
      // Clarification requests (NOT negative behavior)
      if (this.detectClarificationRequest(answer)) {
        clarificationCount++;
      }
    });
    
    // Determine behavior type
    let behaviorType = 'cooperative';
    
    // Don't penalize clarification requests
    if (unprofessionalCount >= 2 || refusalCount >= 3) {
      behaviorType = 'uncooperative';
    } else if (deflectionCount >= 2 || (briefCount >= 4 && clarificationCount === 0)) {
      behaviorType = 'evasive';
    } else if (briefCount >= 2 && clarificationCount === 0) {
      behaviorType = 'minimal';
    } else if (clarificationCount > 0) {
      behaviorType = 'seeking_clarification'; // New behavior type
    }
    
    return {
      type: behaviorType,
      unprofessionalCount,
      refusalCount,
      briefCount,
      deflectionCount,
      clarificationCount,
      totalAnswers: allAnswers.length
    };
  }
  
  /**
   * Determine interviewer response based on behavior
   * @param {Object} behavior - Candidate behavior analysis
   * @param {number} questionCount - Number of questions asked
   * @returns {Object} Response strategy
   */
  determineInterviewerResponse(behavior, questionCount) {
    if (behavior.type === 'uncooperative') {
      return {
        mode: 'confrontational',
        tone: 'STERN and DIRECT',
        action: 'Address unprofessional behavior and set expectations'
      };
    } else if (behavior.type === 'evasive') {
      return {
        mode: 'redirecting',
        tone: 'FIRM and CONTROLLING',
        action: 'Stop deflection and demand direct answers'
      };
    } else if (behavior.type === 'minimal') {
      return {
        mode: 'probing',
        tone: 'DEMANDING and SPECIFIC',
        action: 'Push for detailed responses with specific examples'
      };
    } else if (behavior.type === 'seeking_clarification') {
      return {
        mode: 'clarifying',
        tone: 'HELPFUL but PROFESSIONAL',
        action: 'Provide clarification and rephrase questions clearly'
      };
    } else {
      return {
        mode: 'professional',
        tone: 'PROFESSIONAL but CHALLENGING',
        action: 'Continue with technical depth'
      };
    }
  }
  
  /**
   * Detect if candidate is asking for clarification
   * @param {string} answer - Candidate's answer
   * @returns {boolean} True if asking for clarification
   */
  detectClarificationRequest(answer) {
    if (!answer) return false;
    
    const clarificationPatterns = [
      /which project/i,
      /what are you talking about/i,
      /can you repeat/i,
      /i don't understand/i,
      /what do you mean/i,
      /can you clarify/i,
      /what question/i,
      /which one/i,
      /what exactly/i,
      /i'm confused/i,
      /sorry, what/i,
      /about what/i,
      /about what experience/i,
      /ask some other/i,
      /ask something else/i,
      /you asked the same question/i,
      /same question again/i,
      /same issue/i,
      /what did you change/i
    ];
    
    return clarificationPatterns.some(pattern => pattern.test(answer));
  }
  
  /**
   * Extract projects mentioned by candidate
   * @param {Array} previousAnswers - All previous answers
   * @returns {Array} List of mentioned projects
   */
  extractMentionedProjects(previousAnswers) {
    const projects = new Set();
    
    previousAnswers.forEach(answer => {
      if (!answer) return;
      
      // Look for project patterns
      const projectPatterns = [
        /project\s+called\s+(\w+)/gi,
        /(\w+)\s+project/gi,
        /working on\s+(\w+)/gi,
        /built\s+(\w+)/gi,
        /developed\s+(\w+)/gi,
        /created\s+(\w+)/gi
      ];
      
      projectPatterns.forEach(pattern => {
        let match;
        while ((match = pattern.exec(answer)) !== null) {
          const project = match[1];
          if (project && project.length > 2 && project.length < 20) {
            projects.add(project);
          }
        }
      });
      
      // Look for specific project names mentioned in the transcript
      const commonProjectNames = ['StudySpark', 'ChatBridge'];
      commonProjectNames.forEach(name => {
        if (answer.toLowerCase().includes(name.toLowerCase())) {
          projects.add(name);
        }
      });
    });
    
    return Array.from(projects);
  }
  
  /**
   * Extract skills/technologies mentioned by candidate
   * @param {Array} previousAnswers - All previous answers
   * @returns {Array} List of mentioned skills
   */
  extractMentionedSkills(previousAnswers) {
    const skills = new Set();
    
    const techKeywords = [
      'javascript', 'react', 'node', 'python', 'java', 'sql', 'database',
      'api', 'rest', 'graphql', 'microservices', 'docker', 'kubernetes',
      'aws', 'cloud', 'frontend', 'backend', 'fullstack', 'devops',
      'ai', 'ml', 'llm', 'genai', 'artificial intelligence', 'machine learning',
      'data science', 'web development', 'mobile app'
    ];
    
    previousAnswers.forEach(answer => {
      if (!answer) return;
      
      const lowerAnswer = answer.toLowerCase();
      techKeywords.forEach(keyword => {
        if (lowerAnswer.includes(keyword)) {
          skills.add(keyword);
        }
      });
    });
    
    return Array.from(skills);
  }
  
  /**
   * Analyze answer quality for scoring
   * @param {string} answer - Answer to analyze
   * @returns {string} Quality assessment
   */
  analyzeAnswerQuality(answer) {
    if (!answer || answer.trim().length === 0) {
      return 'No answer provided';
    }
    
    const length = answer.trim().length;
    const wordCount = answer.trim().split(/\s+/).length;
    
    // Check for specific quality indicators
    const hasSpecifics = /\d+|specific|example|implemented|built|created|developed/i.test(answer);
    const hasMetrics = /\d+%|\d+x|increased|decreased|improved|reduced/i.test(answer);
    const isVague = /good|nice|okay|fine|alright|maybe|probably|i think/i.test(answer);
    const isProfessional = !/you are not good|what happened|why cant you|stupid|boring/i.test(answer);
    
    if (length < 20) {
      return 'Very brief response - needs more detail';
    } else if (length < 50) {
      return 'Brief response - could be more detailed';
    } else if (!hasSpecifics && isVague) {
      return 'Vague response - lacks specific examples';
    } else if (hasSpecifics && hasMetrics && isProfessional) {
      return 'Good quality - specific with metrics';
    } else if (hasSpecifics && isProfessional) {
      return 'Decent quality - has specifics';
    } else if (!isProfessional) {
      return 'Unprofessional response - inappropriate tone';
    } else {
      return 'Average quality - could be more specific';
    }
  }
  
  /**
   * Check if we're repeating the same topic
   * @param {Array} previousQuestions - All previous questions
   * @param {Object} currentTopic - Current topic being discussed
   * @returns {boolean} True if repeating
   */
  isRepeatingTopic(previousQuestions = [], currentTopic) {
    if (previousQuestions.length < 2) return false;
    
    // Check for similar questions in recent history
    const recentQuestions = previousQuestions.slice(-4); // Look at last 4 questions
    
    // Look for repeated key phrases
    const repeatedPhrases = [
      'tell me more about',
      'can you tell me more',
      'what technologies did you use',
      'what challenges did you face',
      'walk me through',
      'elaborate on',
      'specific project where you applied'
    ];
    
    let similarQuestionCount = 0;
    
    for (let i = 0; i < recentQuestions.length - 1; i++) {
      const currentQ = recentQuestions[i].toLowerCase();
      
      for (let j = i + 1; j < recentQuestions.length; j++) {
        const compareQ = recentQuestions[j].toLowerCase();
        
        // Check for repeated phrases
        const hasRepeatedPhrase = repeatedPhrases.some(phrase => 
          currentQ.includes(phrase) && compareQ.includes(phrase)
        );
        
        // Check for similar project references
        const bothMentionProjects = (currentQ.includes('project') && compareQ.includes('project')) ||
                                   (currentQ.includes('studyspark') && compareQ.includes('studyspark'));
        
        if (hasRepeatedPhrase || bothMentionProjects) {
          similarQuestionCount++;
        }
      }
    }
    
    // Also check topic-based repetition if currentTopic is provided
    if (currentTopic) {
      const topicMentions = recentQuestions.filter(q => 
        q.toLowerCase().includes(currentTopic.name.toLowerCase())
      ).length;
      
      if (topicMentions >= 2) {
        similarQuestionCount++;
      }
    }
    
    return similarQuestionCount >= 2;
  }
  
  /**
   * Count how many times a topic has been repeated
   * @param {Array} previousQuestions - All previous questions
   * @param {Object} currentTopic - Current topic
   * @returns {number} Repeat count
   */
  countTopicRepeats(previousQuestions = [], currentTopic) {
    if (!currentTopic) return 0;
    
    return previousQuestions.filter(q => 
      q.toLowerCase().includes(currentTopic.name.toLowerCase())
    ).length;
  }
  
  /**
   * Get response mode specific instructions
   * @param {Object} response - Response strategy
   * @param {Object} behavior - Candidate behavior
   * @param {boolean} isRepeated - Is topic repeated
   * @returns {string} Instructions
   */
  getResponseModeInstructions(response, behavior, isRepeated) {
    let instructions = '';
    
    switch (response.mode) {
      case 'confrontational':
        instructions = `
🔥 CONFRONTATIONAL MODE - Address unprofessional behavior:
- "I need you to take this interview seriously"
- "Your responses are unprofessional. Let's refocus"
- "If you're not interested in this position, we can end here"
- Be DIRECT about their behavior
- Set clear expectations
- Give ONE more chance before ending
`;
        break;
        
      case 'redirecting':
        instructions = `
🎯 REDIRECTING MODE - Stop deflection:
- "I'm asking the questions here"
- "Let's focus on what I asked"
- "I need you to answer my question directly"
- Don't let them control the conversation
- Be FIRM and redirect immediately
`;
        break;
        
      case 'probing':
        instructions = `
🔍 PROBING MODE - Demand details:
- "That's too brief. I need specifics"
- "Give me concrete examples"
- "What exactly did you do?"
- Push for technical depth
- Don't accept vague answers
`;
        break;
        
      case 'clarifying':
        instructions = `
💡 CLARIFYING MODE - Help candidate understand:
- "Let me clarify what I'm asking about"
- "Sorry for the confusion, I meant..."
- "To be more specific, I'm looking for..."
- Acknowledge their confusion
- Rephrase the question clearly
- Be helpful but maintain professional standards
`;
        break;
        
      default:
        instructions = `
💼 PROFESSIONAL MODE - Maintain standards:
- Ask challenging technical questions
- Expect detailed responses
- Probe for depth and understanding
`;
    }
    
    if (isRepeated) {
      instructions += `
⚠️ TOPIC REPETITION OVERRIDE:
- MUST change topic immediately
- Try: skills assessment, different project, technical concepts
- Examples: "Let's discuss your experience with [different skill]"
- "Tell me about a different project you've worked on"
- "What's your experience with [technical area]?"
`;
    }
    
    return instructions;
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
    
    // Create dynamic opening questions based on resume data
    const openingVariations = [];
    
    // If we have skills, create skill-focused openings
    if (resumeData.skills && resumeData.skills.length > 0) {
      const primarySkill = resumeData.skills[0];
      const skillCount = resumeData.skills.length;
      
      openingVariations.push(
        `Hello ${candidateName}, I see you have experience with ${primarySkill}${skillCount > 1 ? ` and ${skillCount - 1} other technologies` : ''}. Tell me about your background and what drew you to this field.`
      );
      
      openingVariations.push(
        `Hi ${candidateName}, thanks for joining us today. I noticed your expertise in ${primarySkill} - I'd love to hear about your journey and what you're passionate about in tech.`
      );
    }
    
    // If we have experience, create experience-focused openings
    if (resumeData.experience && resumeData.experience.length > 0) {
      const recentRole = resumeData.experience[0];
      if (recentRole.company || recentRole.title) {
        openingVariations.push(
          `Hello ${candidateName}, I see you've worked ${recentRole.company ? `at ${recentRole.company}` : `as ${recentRole.title}`}. Tell me about your professional journey and what excites you about your work.`
        );
      }
    }
    
    // If we have education, create education-focused openings
    if (resumeData.education && resumeData.education.length > 0) {
      const education = resumeData.education[0];
      if (education.degree || education.field) {
        openingVariations.push(
          `Hi ${candidateName}, I see you studied ${education.field || education.degree}. Tell me about your background and how you've applied your learning in practice.`
        );
      }
    }
    
    // If we have projects, create project-focused openings
    if (resumeData.projects && resumeData.projects.length > 0) {
      openingVariations.push(
        `Hello ${candidateName}, I noticed you've worked on some interesting projects. I'd love to hear about your background and what drives your technical work.`
      );
    }
    
    // Generic variations as fallback
    if (openingVariations.length === 0) {
      openingVariations.push(
        `Hello ${candidateName}, thank you for joining us today. Tell me about yourself - your background, experience, and what brings you here.`,
        `Hi ${candidateName}, great to meet you! I'd love to learn more about your background and what you're passionate about in your work.`,
        `Hello ${candidateName}, thanks for taking the time to chat with us today. Could you start by telling me about your professional journey?`,
        `Hi ${candidateName}, I'm excited to learn more about you. Tell me about your background and what led you to where you are today.`
      );
    }
    
    // Randomly select one of the variations
    const selectedOpening = openingVariations[Math.floor(Math.random() * openingVariations.length)];
    
    console.log(`🎯 Generated dynamic opening question for ${candidateName}`);
    return selectedOpening;
  }
}

module.exports = { InterviewerAgent };
