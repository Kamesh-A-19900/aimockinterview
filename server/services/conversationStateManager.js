/**
 * Conversation State Manager
 * 
 * Manages interview conversation state in RAM (NOT ChromaDB)
 * Tracks mentioned entities, dialogue stage, and conversation flow
 */

class ConversationStateManager {
  constructor(sessionId, resumeData) {
    this.sessionId = sessionId;
    this.state = {
      // Basic info
      candidateName: resumeData?.name || 'Candidate',
      stage: 'INTRODUCTION',
      questionCount: 0,
      
      // Mentioned entities (CRITICAL - only what candidate actually said)
      mentionedSkills: [],
      mentionedProjects: [],
      mentionedExperience: [],
      mentionedTechnologies: [],
      
      // Conversation flow
      questionsAsked: [],
      answers: [],
      lastQuestion: null,
      lastAnswer: null,
      
      // State flags
      clarificationRequested: false,
      clarificationPending: false,
      topicExhausted: false,
      
      // Resume context (reference only)
      resumeSkills: resumeData?.skills || [],
      resumeProjects: resumeData?.projects || [],
      resumeExperience: resumeData?.experience || []
    };
    
    console.log(`✅ Conversation state initialized for ${this.state.candidateName}`);
  }
  
  /**
   * Add Q&A pair and update state
   */
  addQA(question, answer) {
    this.state.questionsAsked.push(question);
    this.state.answers.push(answer);
    this.state.lastQuestion = question;
    this.state.lastAnswer = answer;
    this.state.questionCount++;
    
    // Extract mentioned entities from answer
    this.extractMentionedEntities(answer);
    
    // Detect clarification request
    this.state.clarificationRequested = this.detectClarificationRequest(answer);
    
    // Update dialogue stage
    this.updateDialogueStage();
    
    console.log(`📝 State updated: Stage=${this.state.stage}, Skills=${this.state.mentionedSkills.length}, Projects=${this.state.mentionedProjects.length}`);
  }
  
  /**
   * Extract entities that candidate actually mentioned
   */
  extractMentionedEntities(answer) {
    if (!answer) return;
    
    const lowerAnswer = answer.toLowerCase();
    
    // Extract skills/technologies
    const techKeywords = [
      'javascript', 'react', 'node', 'python', 'java', 'sql', 'database',
      'api', 'rest', 'graphql', 'microservices', 'docker', 'kubernetes',
      'aws', 'cloud', 'frontend', 'backend', 'fullstack', 'devops',
      'ai', 'ml', 'llm', 'genai', 'artificial intelligence', 'machine learning',
      'data science', 'web development', 'mobile app', 'android', 'ios',
      'html', 'css', 'typescript', 'angular', 'vue', 'mongodb', 'postgresql',
      'redis', 'elasticsearch', 'kafka', 'spark', 'hadoop', 'tensorflow',
      'pytorch', 'opencv', 'nlp', 'computer vision', 'deep learning'
    ];
    
    techKeywords.forEach(keyword => {
      if (lowerAnswer.includes(keyword) && !this.state.mentionedSkills.includes(keyword)) {
        this.state.mentionedSkills.push(keyword);
      }
    });
    
    // Extract project names (look for patterns)
    const projectPatterns = [
      /project\s+called\s+(\w+)/gi,
      /(\w+)\s+project/gi,
      /working on\s+(\w+)/gi,
      /built\s+(\w+)/gi,
      /developed\s+(\w+)/gi,
      /created\s+(\w+)/gi,
      /app\s+called\s+(\w+)/gi,
      /(\w+)\s+app/gi
    ];
    
    projectPatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(answer)) !== null) {
        const project = match[1];
        if (project && project.length > 2 && project.length < 20 && 
            !this.state.mentionedProjects.includes(project)) {
          this.state.mentionedProjects.push(project);
        }
      }
    });
    
    // Extract experience mentions
    const experiencePatterns = [
      /worked at\s+(\w+)/gi,
      /experience at\s+(\w+)/gi,
      /(\w+)\s+company/gi,
      /internship at\s+(\w+)/gi
    ];
    
    experiencePatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(answer)) !== null) {
        const company = match[1];
        if (company && company.length > 2 && company.length < 30 && 
            !this.state.mentionedExperience.includes(company)) {
          this.state.mentionedExperience.push(company);
        }
      }
    });
  }
  
  /**
   * Detect clarification requests
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
      /repeat the question/i,
      /didn't catch that/i
    ];
    
    return clarificationPatterns.some(pattern => pattern.test(answer));
  }
  
  /**
   * Update dialogue stage based on conversation progress
   */
  updateDialogueStage() {
    const { questionCount, mentionedProjects, mentionedSkills, stage } = this.state;
    
    // Stage progression logic
    if (stage === 'INTRODUCTION' && questionCount >= 1) {
      if (mentionedSkills.length > 0 || mentionedProjects.length > 0) {
        this.state.stage = 'PROJECT_DISCOVERY';
      } else {
        this.state.stage = 'SKILL_DISCOVERY';
      }
    } else if (stage === 'SKILL_DISCOVERY' && mentionedSkills.length > 0) {
      this.state.stage = 'PROJECT_DISCOVERY';
    } else if (stage === 'PROJECT_DISCOVERY' && mentionedProjects.length > 0) {
      this.state.stage = 'PROJECT_DEEP_DIVE';
    } else if (stage === 'PROJECT_DEEP_DIVE' && questionCount >= 4) {
      this.state.stage = 'TECHNICAL_CONCEPTS';
    } else if (stage === 'TECHNICAL_CONCEPTS' && questionCount >= 6) {
      this.state.stage = 'BEHAVIORAL';
    } else if (stage === 'BEHAVIORAL' && questionCount >= 8) {
      this.state.stage = 'WRAP_UP';
    }
  }
  
  /**
   * Get allowed topics for question generation
   */
  getAllowedTopics() {
    const allowedTopics = [
      ...this.state.mentionedSkills,
      ...this.state.mentionedProjects,
      ...this.state.mentionedExperience
    ];
    
    // If nothing mentioned yet, allow asking about resume topics
    if (allowedTopics.length === 0) {
      return [...this.state.resumeSkills, ...this.state.resumeProjects.map(p => p.name)];
    }
    
    return allowedTopics;
  }
  
  /**
   * Get next question context for agent
   */
  getQuestionContext() {
    return {
      // Current state
      stage: this.state.stage,
      questionCount: this.state.questionCount,
      candidateName: this.state.candidateName,
      
      // Mentioned entities (CRITICAL)
      mentionedSkills: this.state.mentionedSkills,
      mentionedProjects: this.state.mentionedProjects,
      mentionedExperience: this.state.mentionedExperience,
      
      // Conversation history
      lastQuestion: this.state.lastQuestion,
      lastAnswer: this.state.lastAnswer,
      previousQuestions: this.state.questionsAsked,
      previousAnswers: this.state.answers,
      
      // State flags
      clarificationRequested: this.state.clarificationRequested,
      clarificationPending: this.state.clarificationPending,
      
      // Allowed topics
      allowedTopics: this.getAllowedTopics(),
      
      // Resume reference (for fallback only)
      resumeSkills: this.state.resumeSkills,
      resumeProjects: this.state.resumeProjects
    };
  }
  
  /**
   * Validate question before asking
   */
  validateQuestion(question) {
    const allowedTopics = this.getAllowedTopics();
    const lowerQuestion = question.toLowerCase();
    
    // Check for forbidden topics
    const forbiddenTopics = ['wireshark', 'network latency', 'data transmission'];
    const hasForbiddenTopic = forbiddenTopics.some(topic => 
      lowerQuestion.includes(topic.toLowerCase())
    );
    
    if (hasForbiddenTopic) {
      console.log('❌ Question validation failed: Contains forbidden topic');
      return false;
    }
    
    // If asking about specific technology, ensure it was mentioned
    const techMentions = lowerQuestion.match(/\b(react|python|java|sql|docker|aws|kubernetes|mongodb|postgresql)\b/gi);
    if (techMentions) {
      const mentionedTech = techMentions.some(tech => 
        allowedTopics.some(allowed => allowed.toLowerCase().includes(tech.toLowerCase()))
      );
      
      if (!mentionedTech && this.state.questionCount > 1) {
        console.log('❌ Question validation failed: References unmentioned technology');
        return false;
      }
    }
    
    return true;
  }
  
  /**
   * Get current state summary
   */
  getStateSummary() {
    return {
      sessionId: this.sessionId,
      stage: this.state.stage,
      questionCount: this.state.questionCount,
      mentionedSkills: this.state.mentionedSkills,
      mentionedProjects: this.state.mentionedProjects,
      clarificationRequested: this.state.clarificationRequested,
      allowedTopics: this.getAllowedTopics()
    };
  }
}

module.exports = { ConversationStateManager };