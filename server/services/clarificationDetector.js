/**
 * Clarification Detector
 * 
 * Identifies when candidates need clarification and switches to clarification mode
 * Handles patterns like "which project?", "can you repeat?", "what do you mean?"
 */

const { ClarificationType } = require('./conversationState');

/**
 * Clarification request result
 */
class ClarificationRequest {
  constructor(type, originalAnswer, confidence, suggestedResponse = null) {
    this.type = type;
    this.originalAnswer = originalAnswer;
    this.confidence = confidence;
    this.suggestedResponse = suggestedResponse;
    this.timestamp = new Date();
  }
}

/**
 * Clarification context for managing state
 */
class ClarificationContext {
  constructor(sessionId, requestType, originalQuestion, candidateAnswer) {
    this.sessionId = sessionId;
    this.requestType = requestType;
    this.originalQuestion = originalQuestion;
    this.candidateAnswer = candidateAnswer;
    this.timestamp = new Date();
    this.resolved = false;
  }
}

/**
 * Clarification Detector class
 */
class ClarificationDetector {
  constructor() {
    // Detection patterns for different clarification types
    this.patterns = {
      [ClarificationType.WHICH_PROJECT]: [
        /which\s+project/i,
        /what\s+project/i,
        /which\s+one/i,
        /which\s+app/i,
        /which\s+application/i,
        /which\s+system/i,
        /what\s+do\s+you\s+mean\s+by\s+project/i
      ],
      
      [ClarificationType.WHAT_TECHNOLOGY]: [
        /which\s+technology/i,
        /what\s+technology/i,
        /which\s+tool/i,
        /what\s+tool/i,
        /which\s+framework/i,
        /what\s+framework/i,
        /which\s+language/i,
        /what\s+language/i
      ],
      
      [ClarificationType.REPEAT_QUESTION]: [
        /can\s+you\s+repeat/i,
        /repeat\s+the\s+question/i,
        /say\s+that\s+again/i,
        /didn't\s+catch\s+that/i,
        /didn't\s+hear/i,
        /pardon/i,
        /excuse\s+me/i,
        /what\s+was\s+the\s+question/i,
        /could\s+you\s+repeat/i
      ],
      
      [ClarificationType.UNCLEAR_QUESTION]: [
        /what\s+do\s+you\s+mean/i,
        /i\s+don't\s+understand/i,
        /can\s+you\s+clarify/i,
        /what\s+are\s+you\s+asking/i,
        /what\s+are\s+you\s+talking\s+about/i,
        /i'm\s+confused/i,
        /i'm\s+not\s+sure\s+what\s+you\s+mean/i,
        /could\s+you\s+explain/i,
        /what\s+exactly/i,
        /be\s+more\s+specific/i
      ],
      
      [ClarificationType.NEED_EXAMPLES]: [
        /can\s+you\s+give\s+me\s+an\s+example/i,
        /what\s+kind\s+of/i,
        /like\s+what/i,
        /for\s+example/i,
        /such\s+as/i,
        /what\s+do\s+you\s+mean\s+by\s+that/i
      ]
    };
    
    // Context indicators that help determine clarification type
    this.contextIndicators = {
      project: ['project', 'app', 'application', 'system', 'website', 'tool'],
      technology: ['technology', 'tech', 'framework', 'library', 'language', 'tool', 'platform'],
      experience: ['experience', 'work', 'job', 'role', 'position', 'company'],
      skill: ['skill', 'ability', 'knowledge', 'expertise', 'proficiency']
    };
    
    // Confidence thresholds
    this.confidenceThresholds = {
      high: 0.9,
      medium: 0.7,
      low: 0.5
    };
    
    console.log('✅ Clarification Detector initialized');
  }
  
  /**
   * Detect clarification request in candidate's answer
   */
  detectClarificationRequest(answer) {
    if (!answer || answer.trim().length === 0) {
      return null;
    }
    
    console.log(`🔍 Analyzing answer for clarification requests: "${answer.substring(0, 100)}..."`);
    
    const detectionResults = [];
    
    // Test against all pattern types
    for (const [type, patterns] of Object.entries(this.patterns)) {
      for (const pattern of patterns) {
        const match = pattern.exec(answer);
        if (match) {
          const confidence = this.calculateConfidence(type, answer, match);
          detectionResults.push({
            type,
            confidence,
            match: match[0],
            pattern: pattern.source
          });
        }
      }
    }
    
    if (detectionResults.length === 0) {
      return null;
    }
    
    // Sort by confidence and get the best match
    detectionResults.sort((a, b) => b.confidence - a.confidence);
    const bestMatch = detectionResults[0];
    
    // Only return if confidence is above minimum threshold
    if (bestMatch.confidence < this.confidenceThresholds.low) {
      return null;
    }
    
    console.log(`✅ Clarification request detected: ${bestMatch.type} (confidence: ${bestMatch.confidence.toFixed(2)})`);
    
    return new ClarificationRequest(
      bestMatch.type,
      answer,
      bestMatch.confidence,
      this.generateSuggestedResponse(bestMatch.type, answer)
    );
  }
  
  /**
   * Calculate confidence score for clarification detection
   */
  calculateConfidence(type, answer, match) {
    let confidence = 0.7; // Base confidence
    
    const lowerAnswer = answer.toLowerCase();
    
    // Boost confidence for direct questions
    if (lowerAnswer.includes('?')) {
      confidence += 0.2;
    }
    
    // Boost confidence for question words at the beginning
    const questionWords = ['what', 'which', 'how', 'when', 'where', 'why', 'can', 'could', 'would'];
    const firstWord = lowerAnswer.trim().split(/\s+/)[0];
    if (questionWords.includes(firstWord)) {
      confidence += 0.1;
    }
    
    // Boost confidence based on context indicators
    for (const [contextType, indicators] of Object.entries(this.contextIndicators)) {
      const hasIndicator = indicators.some(indicator => lowerAnswer.includes(indicator));
      if (hasIndicator) {
        // Match context type with clarification type
        if ((type === ClarificationType.WHICH_PROJECT && contextType === 'project') ||
            (type === ClarificationType.WHAT_TECHNOLOGY && contextType === 'technology')) {
          confidence += 0.15;
        } else {
          confidence += 0.05;
        }
      }
    }
    
    // Reduce confidence for very long answers (likely not just clarification)
    if (answer.length > 200) {
      confidence -= 0.2;
    }
    
    // Reduce confidence if answer contains other content
    const sentences = answer.split(/[.!?]+/).filter(s => s.trim().length > 0);
    if (sentences.length > 2) {
      confidence -= 0.1;
    }
    
    // Boost confidence for polite clarification requests
    const politeWords = ['please', 'sorry', 'excuse me', 'pardon'];
    if (politeWords.some(word => lowerAnswer.includes(word))) {
      confidence += 0.1;
    }
    
    return Math.min(Math.max(confidence, 0.0), 1.0);
  }
  
  /**
   * Generate suggested clarification response
   */
  generateSuggestedResponse(type, originalAnswer) {
    switch (type) {
      case ClarificationType.WHICH_PROJECT:
        return "Let me clarify - I was asking about any projects you've worked on. You can tell me about any project from your experience.";
        
      case ClarificationType.WHAT_TECHNOLOGY:
        return "Let me be more specific - I'm asking about the technologies, programming languages, or tools you've used in your work.";
        
      case ClarificationType.REPEAT_QUESTION:
        return "Of course, let me repeat the question: [PREVIOUS_QUESTION]";
        
      case ClarificationType.UNCLEAR_QUESTION:
        return "Let me clarify what I'm asking. I want to understand more about your background and experience.";
        
      case ClarificationType.NEED_EXAMPLES:
        return "For example, I'm looking for specific projects you've built, technologies you've used, or challenges you've solved.";
        
      default:
        return "Let me rephrase that question to be clearer.";
    }
  }
  
  /**
   * Set clarification context for a session
   */
  setClarificationContext(sessionId, requestType, originalQuestion, candidateAnswer) {
    const context = new ClarificationContext(sessionId, requestType, originalQuestion, candidateAnswer);
    
    // Store in memory (in a real implementation, this might go to Redis/database)
    if (!this.clarificationContexts) {
      this.clarificationContexts = new Map();
    }
    
    this.clarificationContexts.set(sessionId, context);
    console.log(`📝 Clarification context set for session ${sessionId}: ${requestType}`);
    
    return context;
  }
  
  /**
   * Get clarification context for a session
   */
  getClarificationContext(sessionId) {
    if (!this.clarificationContexts) {
      return null;
    }
    
    return this.clarificationContexts.get(sessionId) || null;
  }
  
  /**
   * Clear clarification context for a session
   */
  clearClarificationContext(sessionId) {
    if (!this.clarificationContexts) {
      return;
    }
    
    const context = this.clarificationContexts.get(sessionId);
    if (context) {
      context.resolved = true;
      this.clarificationContexts.delete(sessionId);
      console.log(`✅ Clarification context cleared for session ${sessionId}`);
    }
  }
  
  /**
   * Generate contextual clarification response
   */
  generateClarification(request, conversationState) {
    const summary = conversationState.getContextSummary();
    
    switch (request.type) {
      case ClarificationType.WHICH_PROJECT:
        return this.generateProjectClarification(summary);
        
      case ClarificationType.WHAT_TECHNOLOGY:
        return this.generateTechnologyClarification(summary);
        
      case ClarificationType.REPEAT_QUESTION:
        return this.generateRepeatClarification(summary);
        
      case ClarificationType.UNCLEAR_QUESTION:
        return this.generateUnclearClarification(summary);
        
      case ClarificationType.NEED_EXAMPLES:
        return this.generateExampleClarification(summary);
        
      default:
        return "Let me rephrase that question to be clearer.";
    }
  }
  
  /**
   * Generate project-specific clarification
   */
  generateProjectClarification(summary) {
    if (summary.mentionedProjects && summary.mentionedProjects.length > 0) {
      const projects = summary.mentionedProjects.join(', ');
      return `Let me clarify - I was asking about one of the projects you mentioned: ${projects}. You can pick any one to discuss in more detail.`;
    } else {
      return "Let me clarify - I was asking if you have worked on any projects. If you have, please tell me about one of them. If not, you can tell me about any technical work you've done.";
    }
  }
  
  /**
   * Generate technology-specific clarification
   */
  generateTechnologyClarification(summary) {
    if (summary.mentionedSkills && summary.mentionedSkills.length > 0) {
      const skills = summary.mentionedSkills.slice(0, 3).join(', ');
      return `Let me be more specific - I'm asking about the technologies you mentioned like ${skills}, or any other programming languages and tools you've used.`;
    } else {
      return "Let me be more specific - I'm asking about programming languages, frameworks, databases, or any other technologies you've worked with.";
    }
  }
  
  /**
   * Generate repeat clarification
   */
  generateRepeatClarification(summary) {
    if (summary.lastQuestion) {
      return `Of course, let me repeat the question: ${summary.lastQuestion}`;
    } else {
      return "Let me ask again: Can you tell me about your background and experience?";
    }
  }
  
  /**
   * Generate unclear question clarification
   */
  generateUnclearClarification(summary) {
    const stage = summary.currentStage;
    
    switch (stage) {
      case 'INTRODUCTION':
        return "Let me clarify - I'm asking you to introduce yourself. Tell me about your background, what you do, and what brings you here today.";
        
      case 'PROJECT_DISCOVERY':
        return "Let me be clearer - I want to learn about any projects you've worked on. These could be personal projects, work projects, or school projects.";
        
      case 'PROJECT_DEEP_DIVE':
        if (summary.mentionedProjects && summary.mentionedProjects.length > 0) {
          return `Let me clarify - I want to dive deeper into your ${summary.mentionedProjects[0]} project. I'm interested in the technical details and challenges you faced.`;
        }
        return "Let me be more specific - I want to understand the technical details of a project you've worked on.";
        
      case 'TECHNICAL_CONCEPT':
        return "Let me clarify - I'm asking about your technical knowledge and problem-solving approach. I want to understand how you think about technical challenges.";
        
      case 'BEHAVIORAL':
        return "Let me be clearer - I'm asking about how you work with others and handle workplace situations. I want to understand your soft skills and teamwork approach.";
        
      default:
        return "Let me clarify what I'm asking. I want to understand more about your experience and background to see how you might fit with our team.";
    }
  }
  
  /**
   * Generate example clarification
   */
  generateExampleClarification(summary) {
    const stage = summary.currentStage;
    
    switch (stage) {
      case 'PROJECT_DISCOVERY':
        return "For example, I'm looking for projects like: a web application you built, a mobile app, a data analysis project, an automation script, or any software you've created.";
        
      case 'TECHNICAL_CONCEPT':
        return "For example, I might ask about: how you would design a system, how you debug problems, what technologies you'd choose for a project, or how you approach learning new tools.";
        
      case 'BEHAVIORAL':
        return "For example, I might ask about: a time you disagreed with a teammate, how you handled a difficult deadline, a mistake you made and learned from, or how you helped someone else succeed.";
        
      default:
        return "For example, I'm looking for specific experiences, projects you've worked on, technologies you've used, or challenges you've overcome.";
    }
  }
  
  /**
   * Analyze clarification patterns for insights
   */
  analyzeClarificationPatterns(conversationState) {
    // This could be used to improve question clarity over time
    const clarificationHistory = conversationState.questionsAsked.filter(q => 
      q.text && (q.text.includes('clarify') || q.text.includes('Let me'))
    );
    
    return {
      clarificationCount: clarificationHistory.length,
      clarificationRate: clarificationHistory.length / conversationState.questionsAsked.length,
      commonPatterns: this.identifyCommonClarificationPatterns(clarificationHistory),
      suggestions: this.generateClarificationSuggestions(clarificationHistory)
    };
  }
  
  /**
   * Identify common clarification patterns
   */
  identifyCommonClarificationPatterns(clarificationHistory) {
    const patterns = {
      projectConfusion: 0,
      technologyConfusion: 0,
      questionRepeat: 0,
      generalConfusion: 0
    };
    
    clarificationHistory.forEach(clarification => {
      const text = clarification.text.toLowerCase();
      
      if (text.includes('project')) {
        patterns.projectConfusion++;
      } else if (text.includes('technology') || text.includes('tool')) {
        patterns.technologyConfusion++;
      } else if (text.includes('repeat')) {
        patterns.questionRepeat++;
      } else {
        patterns.generalConfusion++;
      }
    });
    
    return patterns;
  }
  
  /**
   * Generate suggestions for reducing clarification needs
   */
  generateClarificationSuggestions(clarificationHistory) {
    const suggestions = [];
    
    if (clarificationHistory.length > 2) {
      suggestions.push('Consider asking more specific questions initially');
      suggestions.push('Provide more context in questions');
    }
    
    const projectClarifications = clarificationHistory.filter(c => 
      c.text.toLowerCase().includes('project')
    ).length;
    
    if (projectClarifications > 1) {
      suggestions.push('Be more specific when asking about projects');
      suggestions.push('Ask about "any technical work" instead of just "projects"');
    }
    
    return suggestions;
  }
  
  /**
   * Get clarification statistics
   */
  getClarificationStatistics() {
    const stats = {
      totalSessions: this.clarificationContexts ? this.clarificationContexts.size : 0,
      activeContexts: 0,
      resolvedContexts: 0,
      typeDistribution: {}
    };
    
    if (this.clarificationContexts) {
      for (const context of this.clarificationContexts.values()) {
        if (context.resolved) {
          stats.resolvedContexts++;
        } else {
          stats.activeContexts++;
        }
        
        stats.typeDistribution[context.requestType] = 
          (stats.typeDistribution[context.requestType] || 0) + 1;
      }
    }
    
    return stats;
  }
}

// Singleton instance
let clarificationDetectorInstance = null;

function getClarificationDetector() {
  if (!clarificationDetectorInstance) {
    clarificationDetectorInstance = new ClarificationDetector();
  }
  return clarificationDetectorInstance;
}

module.exports = {
  ClarificationDetector,
  ClarificationRequest,
  ClarificationContext,
  getClarificationDetector
};