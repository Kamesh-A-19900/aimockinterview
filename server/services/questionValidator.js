/**
 * Question Validator
 * 
 * Validates interview questions to ensure they only reference entities
 * that candidates have actually mentioned, preventing hallucinated questions
 */

const { EntityType } = require('./conversationState');

/**
 * Validation result for a question
 */
class ValidationResult {
  constructor(isValid, violations = [], suggestions = [], confidence = 1.0) {
    this.isValid = isValid;
    this.violations = violations;
    this.suggestions = suggestions;
    this.confidence = confidence;
    this.timestamp = new Date();
  }
}

/**
 * Validation violation details
 */
class ValidationViolation {
  constructor(type, description, severity, entityReference = null, suggestedFix = null) {
    this.type = type;
    this.description = description;
    this.severity = severity; // 'critical', 'warning', 'info'
    this.entityReference = entityReference;
    this.suggestedFix = suggestedFix;
  }
}

/**
 * Question Validator class
 */
class QuestionValidator {
  constructor() {
    // Validation rules configuration
    this.validationRules = {
      entityReference: {
        enabled: true,
        severity: 'critical',
        description: 'Questions must only reference entities mentioned by candidate'
      },
      stageAppropriate: {
        enabled: true,
        severity: 'warning',
        description: 'Questions must be appropriate for current interview stage'
      },
      logicalFlow: {
        enabled: true,
        severity: 'warning',
        description: 'Questions must follow logical conversation flow'
      },
      repetitionCheck: {
        enabled: true,
        severity: 'warning',
        description: 'Questions should not repeat previous questions'
      },
      clarityCheck: {
        enabled: true,
        severity: 'info',
        description: 'Questions should be clear and specific'
      }
    };
    
    // Common technology patterns that might be hallucinated
    this.commonHallucinations = [
      'wireshark', 'network debugging', 'packet analysis',
      'spark', 'hadoop', 'big data processing',
      'kubernetes', 'docker', 'containerization',
      'microservices', 'distributed systems',
      'machine learning', 'ai', 'neural networks',
      'blockchain', 'cryptocurrency', 'smart contracts'
    ];
    
    // Stage-appropriate question patterns
    this.stagePatterns = {
      INTRODUCTION: [
        /tell me about yourself/i,
        /introduce yourself/i,
        /background/i,
        /experience/i
      ],
      PROJECT_DISCOVERY: [
        /project/i,
        /built/i,
        /created/i,
        /developed/i,
        /worked on/i
      ],
      PROJECT_DEEP_DIVE: [
        /how did you/i,
        /what challenges/i,
        /technical details/i,
        /implementation/i,
        /architecture/i
      ],
      TECHNICAL_CONCEPT: [
        /explain/i,
        /how would you/i,
        /what is/i,
        /difference between/i,
        /approach/i
      ],
      BEHAVIORAL: [
        /time when/i,
        /situation where/i,
        /how do you handle/i,
        /teamwork/i,
        /conflict/i
      ],
      WRAP_UP: [
        /questions for/i,
        /anything else/i,
        /final/i,
        /conclude/i
      ]
    };
    
    console.log('✅ Question Validator initialized');
  }
  
  /**
   * Validate a question against conversation state
   */
  validateQuestion(question, conversationState) {
    console.log(`🔍 Validating question: "${question.substring(0, 100)}..."`);
    
    const violations = [];
    const suggestions = [];
    
    // Rule 1: Entity reference validation
    const entityViolations = this.checkEntityReferences(question, conversationState);
    violations.push(...entityViolations);
    
    // Rule 2: Stage appropriateness
    const stageViolations = this.checkStageAppropriateness(question, conversationState);
    violations.push(...stageViolations);
    
    // Rule 3: Logical flow validation
    const flowViolations = this.checkLogicalFlow(question, conversationState);
    violations.push(...flowViolations);
    
    // Rule 4: Repetition check
    const repetitionViolations = this.checkRepetition(question, conversationState);
    violations.push(...repetitionViolations);
    
    // Rule 5: Clarity check
    const clarityViolations = this.checkClarity(question, conversationState);
    violations.push(...clarityViolations);
    
    // Generate suggestions based on violations
    const generatedSuggestions = this.generateSuggestions(question, violations, conversationState);
    suggestions.push(...generatedSuggestions);
    
    // Determine if question is valid (no critical violations)
    const criticalViolations = violations.filter(v => v.severity === 'critical');
    const isValid = criticalViolations.length === 0;
    
    // Calculate confidence score
    const confidence = this.calculateValidationConfidence(violations, conversationState);
    
    const result = new ValidationResult(isValid, violations, suggestions, confidence);
    
    console.log(`${isValid ? '✅' : '❌'} Question validation: ${isValid ? 'PASSED' : 'FAILED'} (${violations.length} violations)`);
    
    return result;
  }
  
  /**
   * Check if question references entities mentioned by candidate
   */
  checkEntityReferences(question, conversationState) {
    const violations = [];
    const lowerQuestion = question.toLowerCase();
    
    // Get mentioned entities
    const mentionedProjects = [
      ...conversationState.mentionedProjects.map(p => p.name.toLowerCase()),
      ...conversationState.mentionedTechnologies.map(t => t.name.toLowerCase())
    ];
    
    const mentionedSkills = [
      ...conversationState.mentionedSkills.map(s => s.name.toLowerCase()),
      ...conversationState.mentionedTechnologies.map(t => t.name.toLowerCase())
    ];
    
    // Check for hallucinated technologies
    for (const hallucination of this.commonHallucinations) {
      if (lowerQuestion.includes(hallucination.toLowerCase())) {
        // Check if this technology was actually mentioned
        const wasMentioned = mentionedSkills.some(skill => 
          skill.includes(hallucination.toLowerCase()) || 
          hallucination.toLowerCase().includes(skill)
        );
        
        if (!wasMentioned) {
          violations.push(new ValidationViolation(
            'HALLUCINATED_ENTITY',
            `Question references "${hallucination}" which was not mentioned by candidate`,
            'critical',
            hallucination,
            `Remove reference to "${hallucination}" or ask about technologies the candidate actually mentioned`
          ));
        }
      }
    }
    
    // Check for specific project references
    const projectPatterns = [
      /(?:in|for|with|about|regarding)\s+(?:the\s+)?(\w+)\s+project/gi,
      /(\w+)\s+(?:project|app|application)/gi,
      /your\s+(\w+)\s+(?:work|experience)/gi
    ];
    
    projectPatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(question)) !== null) {
        const referencedProject = match[1].toLowerCase();
        
        // Skip common words
        const commonWords = ['this', 'that', 'your', 'the', 'any', 'some', 'other'];
        if (commonWords.includes(referencedProject)) {
          continue;
        }
        
        const wasMentioned = mentionedProjects.some(project => 
          project.includes(referencedProject) || 
          referencedProject.includes(project)
        );
        
        if (!wasMentioned && referencedProject.length > 2) {
          violations.push(new ValidationViolation(
            'UNMENTIONED_PROJECT',
            `Question references project "${referencedProject}" which was not mentioned by candidate`,
            'critical',
            referencedProject,
            `Ask about projects the candidate actually mentioned: ${mentionedProjects.join(', ') || 'none yet'}`
          ));
        }
      }
    });
    
    return violations;
  }
  
  /**
   * Check if question is appropriate for current stage
   */
  checkStageAppropriateness(question, conversationState) {
    const violations = [];
    const currentStage = conversationState.currentStage;
    const stagePatterns = this.stagePatterns[currentStage] || [];
    
    // Check if question matches stage patterns
    const matchesStage = stagePatterns.some(pattern => pattern.test(question));
    
    if (!matchesStage && stagePatterns.length > 0) {
      violations.push(new ValidationViolation(
        'INAPPROPRIATE_STAGE',
        `Question may not be appropriate for ${currentStage} stage`,
        'warning',
        null,
        `Consider questions more suitable for ${currentStage} stage`
      ));
    }
    
    // Specific stage violations
    if (currentStage === 'INTRODUCTION' && question.toLowerCase().includes('technical')) {
      violations.push(new ValidationViolation(
        'PREMATURE_TECHNICAL',
        'Technical questions should not be asked during introduction stage',
        'warning',
        null,
        'Focus on getting to know the candidate first'
      ));
    }
    
    if (currentStage === 'PROJECT_DISCOVERY' && !question.toLowerCase().includes('project')) {
      const hasProjectKeywords = ['built', 'created', 'developed', 'worked on', 'experience'].some(
        keyword => question.toLowerCase().includes(keyword)
      );
      
      if (!hasProjectKeywords) {
        violations.push(new ValidationViolation(
          'MISSING_PROJECT_FOCUS',
          'Questions in PROJECT_DISCOVERY stage should focus on discovering projects',
          'warning',
          null,
          'Ask about projects, work experience, or things the candidate has built'
        ));
      }
    }
    
    return violations;
  }
  
  /**
   * Check logical flow of conversation
   */
  checkLogicalFlow(question, conversationState) {
    const violations = [];
    const previousQuestions = conversationState.questionsAsked;
    
    if (previousQuestions.length === 0) {
      return violations; // First question, no flow to check
    }
    
    const lastQuestion = previousQuestions[previousQuestions.length - 1];
    const lastAnswer = lastQuestion.answer;
    
    if (!lastAnswer) {
      return violations; // No answer to build upon
    }
    
    // Check if question acknowledges previous answer
    const hasAcknowledgment = this.hasAnswerAcknowledgment(question, lastAnswer);
    
    if (!hasAcknowledgment && conversationState.currentStage !== 'INTRODUCTION') {
      violations.push(new ValidationViolation(
        'POOR_FLOW',
        'Question does not acknowledge or build upon previous answer',
        'warning',
        null,
        'Consider acknowledging the previous answer before asking the next question'
      ));
    }
    
    return violations;
  }
  
  /**
   * Check for question repetition
   */
  checkRepetition(question, conversationState) {
    const violations = [];
    const previousQuestions = conversationState.questionsAsked.map(q => q.text.toLowerCase());
    const currentQuestion = question.toLowerCase();
    
    // Check for exact or near-exact repetition
    for (const prevQuestion of previousQuestions) {
      const similarity = this.calculateSimilarity(currentQuestion, prevQuestion);
      
      if (similarity > 0.8) {
        violations.push(new ValidationViolation(
          'REPETITIVE_QUESTION',
          'Question is very similar to a previously asked question',
          'warning',
          null,
          'Ask a different question or approach the topic from a new angle'
        ));
        break;
      }
    }
    
    return violations;
  }
  
  /**
   * Check question clarity
   */
  checkClarity(question, conversationState) {
    const violations = [];
    
    // Check for vague questions
    const vaguePhrases = [
      'tell me more',
      'anything else',
      'what about',
      'can you explain',
      'how about'
    ];
    
    const hasVaguePhrase = vaguePhrases.some(phrase => 
      question.toLowerCase().includes(phrase)
    );
    
    if (hasVaguePhrase && question.length < 50) {
      violations.push(new ValidationViolation(
        'VAGUE_QUESTION',
        'Question may be too vague or unclear',
        'info',
        null,
        'Be more specific about what you want to know'
      ));
    }
    
    // Check for overly long questions
    if (question.length > 200) {
      violations.push(new ValidationViolation(
        'OVERLY_LONG',
        'Question may be too long and complex',
        'info',
        null,
        'Consider breaking into simpler, more focused questions'
      ));
    }
    
    return violations;
  }
  
  /**
   * Generate suggestions for improving question
   */
  generateSuggestions(question, violations, conversationState) {
    const suggestions = [];
    
    // If there are entity violations, suggest using mentioned entities
    const entityViolations = violations.filter(v => 
      v.type === 'HALLUCINATED_ENTITY' || v.type === 'UNMENTIONED_PROJECT'
    );
    
    if (entityViolations.length > 0) {
      const mentionedProjects = [
        ...conversationState.mentionedProjects.map(p => p.name),
        ...conversationState.mentionedTechnologies.map(t => t.name)
      ];
      
      const mentionedSkills = [
        ...conversationState.mentionedSkills.map(s => s.name),
        ...conversationState.mentionedTechnologies.map(t => t.name)
      ];
      
      if (mentionedProjects.length > 0) {
        suggestions.push(`Ask about mentioned projects: ${mentionedProjects.join(', ')}`);
      }
      
      if (mentionedSkills.length > 0) {
        suggestions.push(`Ask about mentioned technologies: ${mentionedSkills.join(', ')}`);
      }
      
      if (mentionedProjects.length === 0 && mentionedSkills.length === 0) {
        suggestions.push('Ask open-ended questions to discover what the candidate has worked on');
      }
    }
    
    // Stage-specific suggestions
    const currentStage = conversationState.currentStage;
    
    switch (currentStage) {
      case 'INTRODUCTION':
        suggestions.push('Ask about background, experience, or what brings them here');
        break;
        
      case 'PROJECT_DISCOVERY':
        suggestions.push('Ask about projects they\'ve worked on, built, or are proud of');
        break;
        
      case 'PROJECT_DEEP_DIVE':
        if (conversationState.mentionedProjects.length > 0) {
          suggestions.push('Ask about technical details, challenges, or implementation of mentioned projects');
        }
        break;
        
      case 'TECHNICAL_CONCEPT':
        suggestions.push('Ask about problem-solving approach, technical knowledge, or system design');
        break;
        
      case 'BEHAVIORAL':
        suggestions.push('Ask about teamwork, challenges, learning experiences, or soft skills');
        break;
    }
    
    return suggestions;
  }
  
  /**
   * Calculate validation confidence score
   */
  calculateValidationConfidence(violations, conversationState) {
    let confidence = 1.0;
    
    // Reduce confidence based on violations
    violations.forEach(violation => {
      switch (violation.severity) {
        case 'critical':
          confidence -= 0.3;
          break;
        case 'warning':
          confidence -= 0.1;
          break;
        case 'info':
          confidence -= 0.05;
          break;
      }
    });
    
    // Boost confidence if we have good entity coverage
    const entityCount = conversationState.mentionedProjects.length + 
                       conversationState.mentionedSkills.length + 
                       conversationState.mentionedTechnologies.length + 
                       conversationState.mentionedExperience.length;
    if (entityCount > 3) {
      confidence += 0.1;
    }
    
    // Boost confidence for later stages (more context available)
    const stageBonus = {
      'INTRODUCTION': 0,
      'PROJECT_DISCOVERY': 0.05,
      'PROJECT_DEEP_DIVE': 0.1,
      'TECHNICAL_CONCEPT': 0.1,
      'BEHAVIORAL': 0.1,
      'WRAP_UP': 0.05
    };
    
    confidence += stageBonus[conversationState.currentStage] || 0;
    
    return Math.max(0.0, Math.min(1.0, confidence));
  }
  
  /**
   * Check if question acknowledges previous answer
   */
  hasAnswerAcknowledgment(question, previousAnswer) {
    const lowerQuestion = question.toLowerCase();
    const lowerAnswer = previousAnswer.toLowerCase();
    
    // Look for acknowledgment phrases
    const acknowledgmentPhrases = [
      'you mentioned',
      'you said',
      'that\'s interesting',
      'great',
      'i see',
      'thanks for',
      'building on that',
      'following up'
    ];
    
    const hasAcknowledgment = acknowledgmentPhrases.some(phrase => 
      lowerQuestion.includes(phrase)
    );
    
    if (hasAcknowledgment) {
      return true;
    }
    
    // Look for references to content from previous answer
    const answerWords = lowerAnswer.split(/\s+/).filter(word => word.length > 3);
    const questionWords = lowerQuestion.split(/\s+/);
    
    const sharedWords = answerWords.filter(word => questionWords.includes(word));
    
    // If question references specific content from answer, it's building on it
    return sharedWords.length > 0;
  }
  
  /**
   * Calculate similarity between two strings
   */
  calculateSimilarity(str1, str2) {
    const words1 = str1.split(/\s+/);
    const words2 = str2.split(/\s+/);
    
    const allWords = new Set([...words1, ...words2]);
    const sharedWords = words1.filter(word => words2.includes(word));
    
    return sharedWords.length / allWords.size;
  }
  
  /**
   * Suggest improved question based on validation results
   */
  suggestImprovedQuestion(question, validationResult, conversationState) {
    if (validationResult.isValid) {
      return question; // No improvement needed
    }
    
    const criticalViolations = validationResult.violations.filter(v => v.severity === 'critical');
    
    if (criticalViolations.length === 0) {
      return question; // Only minor issues
    }
    
    // Generate improved question based on violations
    const entityViolations = criticalViolations.filter(v => 
      v.type === 'HALLUCINATED_ENTITY' || v.type === 'UNMENTIONED_PROJECT'
    );
    
    if (entityViolations.length > 0) {
      return this.generateEntityAwareQuestion(conversationState);
    }
    
    return this.generateFallbackQuestion(conversationState);
  }
  
  /**
   * Generate entity-aware question
   */
  generateEntityAwareQuestion(conversationState) {
    const mentionedProjects = [
      ...conversationState.mentionedProjects.map(p => p.name),
      ...conversationState.mentionedTechnologies.map(t => t.name)
    ];
    
    const mentionedSkills = [
      ...conversationState.mentionedSkills.map(s => s.name),
      ...conversationState.mentionedTechnologies.map(t => t.name)
    ];
    
    const currentStage = conversationState.currentStage;
    
    if (mentionedProjects.length > 0) {
      switch (currentStage) {
        case 'PROJECT_DEEP_DIVE':
          return `You mentioned working on ${mentionedProjects[0]}. Can you tell me more about the technical challenges you faced in that project?`;
        case 'TECHNICAL_CONCEPT':
          return `Based on your experience with ${mentionedProjects[0]}, how would you approach scaling a similar system?`;
        default:
          return `Tell me more about your ${mentionedProjects[0]} project.`;
      }
    }
    
    if (mentionedSkills.length > 0) {
      switch (currentStage) {
        case 'TECHNICAL_CONCEPT':
          return `You mentioned experience with ${mentionedSkills[0]}. Can you explain how you would use it to solve a specific problem?`;
        default:
          return `How did you learn ${mentionedSkills[0]} and what projects have you used it in?`;
      }
    }
    
    // No entities mentioned yet
    switch (currentStage) {
      case 'PROJECT_DISCOVERY':
        return 'Can you tell me about any projects you\'ve worked on, either professionally or personally?';
      case 'INTRODUCTION':
        return 'Tell me about your background and what kind of work you enjoy doing.';
      default:
        return 'What kind of technical work or projects have you been involved in?';
    }
  }
  
  /**
   * Generate fallback question for current stage
   */
  generateFallbackQuestion(conversationState) {
    const currentStage = conversationState.currentStage;
    
    const fallbackQuestions = {
      'INTRODUCTION': 'Tell me about yourself and your background.',
      'PROJECT_DISCOVERY': 'What projects have you worked on that you\'re most proud of?',
      'PROJECT_DEEP_DIVE': 'Can you walk me through the technical details of one of your projects?',
      'TECHNICAL_CONCEPT': 'How do you approach solving complex technical problems?',
      'BEHAVIORAL': 'Tell me about a time when you had to work with a difficult team member.',
      'WRAP_UP': 'Do you have any questions for me about the role or the company?'
    };
    
    return fallbackQuestions[currentStage] || 'Tell me more about your experience.';
  }
  
  /**
   * Enable or disable a specific validation rule
   */
  setRuleEnabled(ruleName, enabled) {
    if (this.validationRules[ruleName]) {
      this.validationRules[ruleName].enabled = enabled;
      console.log(`${enabled ? '✅' : '❌'} Validation rule "${ruleName}" ${enabled ? 'enabled' : 'disabled'}`);
    } else {
      console.warn(`⚠️  Unknown validation rule: ${ruleName}`);
    }
  }
  
  /**
   * Get current rule configuration
   */
  getRuleConfiguration() {
    return { ...this.validationRules };
  }
  
  /**
   * Update rule severity
   */
  setRuleSeverity(ruleName, severity) {
    if (this.validationRules[ruleName]) {
      this.validationRules[ruleName].severity = severity;
      console.log(`🔧 Rule "${ruleName}" severity set to ${severity}`);
    } else {
      console.warn(`⚠️  Unknown validation rule: ${ruleName}`);
    }
  }
  
  /**
   * Add custom validation rule
   */
  addCustomRule(ruleName, config) {
    this.validationRules[ruleName] = {
      enabled: true,
      severity: 'warning',
      description: 'Custom validation rule',
      ...config
    };
    console.log(`➕ Added custom validation rule: ${ruleName}`);
  }
  
  /**
   * Generate detailed violation report
   */
  generateViolationReport(validationResult, question, conversationState) {
    const report = {
      question: question.substring(0, 100) + (question.length > 100 ? '...' : ''),
      timestamp: new Date(),
      sessionId: conversationState.sessionId,
      stage: conversationState.currentStage,
      isValid: validationResult.isValid,
      confidence: validationResult.confidence,
      violations: validationResult.violations.map(v => ({
        type: v.type,
        description: v.description,
        severity: v.severity,
        entityReference: v.entityReference,
        suggestedFix: v.suggestedFix
      })),
      suggestions: validationResult.suggestions,
      context: {
        mentionedProjects: [
          ...conversationState.mentionedProjects.map(p => p.name),
          ...conversationState.mentionedTechnologies.map(t => t.name)
        ],
        mentionedSkills: [
          ...conversationState.mentionedSkills.map(s => s.name),
          ...conversationState.mentionedTechnologies.map(t => t.name)
        ],
        questionCount: conversationState.questionsAsked.length,
        currentStage: conversationState.currentStage
      }
    };
    
    return report;
  }
  
  /**
   * Enforce validation rules with detailed logging
   */
  enforceValidationRules(question, conversationState, options = {}) {
    const { 
      strictMode = false, 
      logViolations = true, 
      generateReport = false 
    } = options;
    
    const validationResult = this.validateQuestion(question, conversationState);
    
    if (logViolations && validationResult.violations.length > 0) {
      console.log(`🚨 Validation violations detected for question: "${question.substring(0, 50)}..."`);
      
      validationResult.violations.forEach((violation, index) => {
        const severityIcon = {
          'critical': '🔴',
          'warning': '🟡',
          'info': '🔵'
        }[violation.severity] || '⚪';
        
        console.log(`  ${severityIcon} ${index + 1}. [${violation.severity.toUpperCase()}] ${violation.description}`);
        
        if (violation.suggestedFix) {
          console.log(`     💡 Suggestion: ${violation.suggestedFix}`);
        }
      });
      
      if (validationResult.suggestions.length > 0) {
        console.log(`  📝 General suggestions:`);
        validationResult.suggestions.forEach((suggestion, index) => {
          console.log(`     ${index + 1}. ${suggestion}`);
        });
      }
    }
    
    // In strict mode, throw error for critical violations
    if (strictMode) {
      const criticalViolations = validationResult.violations.filter(v => v.severity === 'critical');
      if (criticalViolations.length > 0) {
        throw new Error(`Critical validation violations: ${criticalViolations.map(v => v.description).join(', ')}`);
      }
    }
    
    // Generate detailed report if requested
    let report = null;
    if (generateReport) {
      report = this.generateViolationReport(validationResult, question, conversationState);
    }
    
    return {
      validationResult,
      report,
      shouldRegenerate: !validationResult.isValid,
      criticalViolations: validationResult.violations.filter(v => v.severity === 'critical').length
    };
  }
  
  /**
   * Get validation statistics for monitoring
   */
  getValidationStatistics() {
    // This would track validation metrics over time
    return {
      totalValidations: 0,
      passRate: 0,
      commonViolations: [],
      averageConfidence: 0
    };
  }
}

// Singleton instance
let questionValidatorInstance = null;

function getQuestionValidator() {
  if (!questionValidatorInstance) {
    questionValidatorInstance = new QuestionValidator();
  }
  return questionValidatorInstance;
}

module.exports = {
  QuestionValidator,
  ValidationResult,
  ValidationViolation,
  getQuestionValidator
};