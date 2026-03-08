/**
 * Dialogue State Machine
 * 
 * Enforces structured interview progression and prevents random state transitions
 * Manages interview stages: START → INTRODUCTION → PROJECT_DISCOVERY → PROJECT_DEEP_DIVE → TECHNICAL_CONCEPT → BEHAVIORAL → WRAP_UP
 */

const { DialogueStage } = require('./conversationState');

/**
 * Validation result for state transitions
 */
class ValidationResult {
  constructor(isValid, violations = []) {
    this.isValid = isValid;
    this.violations = violations;
  }
}

/**
 * Transition result
 */
class TransitionResult {
  constructor(success, fromState, toState, reason = '') {
    this.success = success;
    this.fromState = fromState;
    this.toState = toState;
    this.reason = reason;
    this.timestamp = new Date();
  }
}

/**
 * Dialogue State Machine class
 */
class DialogueStateMachine {
  constructor() {
    // Define valid state transitions
    this.transitions = {
      [DialogueStage.START]: [DialogueStage.INTRODUCTION],
      [DialogueStage.INTRODUCTION]: [DialogueStage.PROJECT_DISCOVERY, DialogueStage.TECHNICAL_CONCEPT],
      [DialogueStage.PROJECT_DISCOVERY]: [DialogueStage.PROJECT_DEEP_DIVE, DialogueStage.TECHNICAL_CONCEPT],
      [DialogueStage.PROJECT_DEEP_DIVE]: [DialogueStage.TECHNICAL_CONCEPT, DialogueStage.PROJECT_DISCOVERY],
      [DialogueStage.TECHNICAL_CONCEPT]: [DialogueStage.BEHAVIORAL, DialogueStage.PROJECT_DEEP_DIVE],
      [DialogueStage.BEHAVIORAL]: [DialogueStage.WRAP_UP],
      [DialogueStage.WRAP_UP]: [] // Terminal state
    };
    
    // Minimum question counts per stage
    this.minimumQuestions = {
      [DialogueStage.START]: 0,
      [DialogueStage.INTRODUCTION]: 1,
      [DialogueStage.PROJECT_DISCOVERY]: 2,
      [DialogueStage.PROJECT_DEEP_DIVE]: 3,
      [DialogueStage.TECHNICAL_CONCEPT]: 2,
      [DialogueStage.BEHAVIORAL]: 2,
      [DialogueStage.WRAP_UP]: 1
    };
    
    console.log('✅ Dialogue State Machine initialized');
  }
  
  /**
   * Check if transition is valid
   */
  canTransition(fromState, toState, context = {}) {
    // Check if transition is allowed
    const allowedTransitions = this.transitions[fromState] || [];
    if (!allowedTransitions.includes(toState)) {
      return new ValidationResult(false, [`Invalid transition from ${fromState} to ${toState}`]);
    }
    
    // Check stage-specific requirements
    const violations = [];
    
    switch (toState) {
      case DialogueStage.PROJECT_DISCOVERY:
        // Can always go to project discovery from introduction
        break;
        
      case DialogueStage.PROJECT_DEEP_DIVE:
        // Only if projects were mentioned
        if (!context.mentionedProjects || context.mentionedProjects.length === 0) {
          violations.push('Cannot transition to PROJECT_DEEP_DIVE without mentioned projects');
        }
        break;
        
      case DialogueStage.TECHNICAL_CONCEPT:
        // Can transition if no projects mentioned after sufficient discovery, or after project exploration
        if (fromState === DialogueStage.PROJECT_DISCOVERY && 
            context.questionCount < this.minimumQuestions[DialogueStage.PROJECT_DISCOVERY]) {
          violations.push('Insufficient questions in PROJECT_DISCOVERY stage');
        }
        break;
        
      case DialogueStage.BEHAVIORAL:
        // Need sufficient technical discussion
        if (context.questionCount < 4) {
          violations.push('Insufficient interview depth for behavioral questions');
        }
        break;
        
      case DialogueStage.WRAP_UP:
        // Need sufficient overall interview length
        if (context.questionCount < 6) {
          violations.push('Interview too short for wrap-up');
        }
        break;
    }
    
    return new ValidationResult(violations.length === 0, violations);
  }
  
  /**
   * Perform state transition
   */
  transition(conversationState, toState, context = {}) {
    const fromState = conversationState.currentStage;
    
    // Validate transition
    const validation = this.canTransition(fromState, toState, context);
    if (!validation.isValid) {
      const reason = validation.violations.join('; ');
      console.log(`❌ State transition rejected: ${fromState} → ${toState} (${reason})`);
      return new TransitionResult(false, fromState, toState, reason);
    }
    
    // Perform transition
    conversationState.setStage(toState);
    
    const reason = `Transitioned based on context: ${JSON.stringify(context)}`;
    console.log(`✅ State transition: ${fromState} → ${toState}`);
    
    return new TransitionResult(true, fromState, toState, reason);
  }
  
  /**
   * Get next possible states
   */
  getNextPossibleStates(currentState, context = {}) {
    const allowedTransitions = this.transitions[currentState] || [];
    const possibleStates = [];
    
    for (const nextState of allowedTransitions) {
      const validation = this.canTransition(currentState, nextState, context);
      if (validation.isValid) {
        possibleStates.push(nextState);
      }
    }
    
    return possibleStates;
  }
  
  /**
   * Determine next stage based on conversation context
   */
  determineNextStage(conversationState) {
    const currentStage = conversationState.currentStage;
    const context = conversationState.getContextSummary();
    
    switch (currentStage) {
      case DialogueStage.START:
        return DialogueStage.INTRODUCTION;
        
      case DialogueStage.INTRODUCTION:
        // Move to project discovery after introduction
        if (context.questionCount >= 1) {
          return DialogueStage.PROJECT_DISCOVERY;
        }
        break;
        
      case DialogueStage.PROJECT_DISCOVERY:
        // If projects mentioned, go deep dive
        if (context.mentionedProjects.length > 0) {
          return DialogueStage.PROJECT_DEEP_DIVE;
        }
        // If no projects after sufficient questions, move to technical
        if (context.questionCount >= this.minimumQuestions[DialogueStage.PROJECT_DISCOVERY] + 2) {
          return DialogueStage.TECHNICAL_CONCEPT;
        }
        break;
        
      case DialogueStage.PROJECT_DEEP_DIVE:
        // After sufficient project exploration, move to technical
        if (context.questionCount >= 5) {
          return DialogueStage.TECHNICAL_CONCEPT;
        }
        break;
        
      case DialogueStage.TECHNICAL_CONCEPT:
        // After technical discussion, move to behavioral
        if (context.questionCount >= 7) {
          return DialogueStage.BEHAVIORAL;
        }
        break;
        
      case DialogueStage.BEHAVIORAL:
        // After behavioral questions, wrap up
        if (context.questionCount >= 9) {
          return DialogueStage.WRAP_UP;
        }
        break;
        
      case DialogueStage.WRAP_UP:
        // Terminal state
        return null;
    }
    
    return null; // Stay in current stage
  }
  
  /**
   * Get stage-appropriate question guidelines
   */
  getStageGuidelines(stage) {
    const guidelines = {
      [DialogueStage.START]: {
        purpose: 'Initialize interview session',
        questionTypes: ['greeting', 'setup'],
        focus: 'Welcome candidate and set expectations'
      },
      
      [DialogueStage.INTRODUCTION]: {
        purpose: 'Get candidate to introduce themselves',
        questionTypes: ['self-introduction', 'background'],
        focus: 'Let candidate tell their story, extract mentioned skills/projects'
      },
      
      [DialogueStage.PROJECT_DISCOVERY]: {
        purpose: 'Discover what projects candidate has worked on',
        questionTypes: ['project-inquiry', 'experience-exploration'],
        focus: 'Ask about projects, only reference what they mention'
      },
      
      [DialogueStage.PROJECT_DEEP_DIVE]: {
        purpose: 'Deep dive into mentioned projects',
        questionTypes: ['project-details', 'technical-challenges', 'implementation'],
        focus: 'Explore ONE mentioned project in detail'
      },
      
      [DialogueStage.TECHNICAL_CONCEPT]: {
        purpose: 'Assess technical knowledge and concepts',
        questionTypes: ['technical-knowledge', 'problem-solving', 'architecture'],
        focus: 'Technical depth based on mentioned technologies'
      },
      
      [DialogueStage.BEHAVIORAL]: {
        purpose: 'Evaluate soft skills and behavior',
        questionTypes: ['behavioral', 'teamwork', 'challenges'],
        focus: 'How they handle situations and work with others'
      },
      
      [DialogueStage.WRAP_UP]: {
        purpose: 'Conclude interview professionally',
        questionTypes: ['questions-for-us', 'next-steps', 'closing'],
        focus: 'Give candidate chance to ask questions, explain next steps'
      }
    };
    
    return guidelines[stage] || null;
  }
  
  /**
   * Validate stage requirements
   */
  validateStageRequirements(stage, conversationState) {
    const context = conversationState.getContextSummary();
    const violations = [];
    
    switch (stage) {
      case DialogueStage.PROJECT_DEEP_DIVE:
        if (context.mentionedProjects.length === 0) {
          violations.push('PROJECT_DEEP_DIVE requires mentioned projects');
        }
        break;
        
      case DialogueStage.TECHNICAL_CONCEPT:
        if (context.mentionedSkills.length === 0 && context.mentionedTechnologies.length === 0) {
          violations.push('TECHNICAL_CONCEPT requires mentioned skills or technologies');
        }
        break;
        
      case DialogueStage.BEHAVIORAL:
        if (context.questionCount < 4) {
          violations.push('BEHAVIORAL requires sufficient interview depth');
        }
        break;
        
      case DialogueStage.WRAP_UP:
        if (context.questionCount < 6) {
          violations.push('WRAP_UP requires sufficient interview length');
        }
        break;
    }
    
    return new ValidationResult(violations.length === 0, violations);
  }
  
  /**
   * Get stage progress information
   */
  getStageProgress(conversationState) {
    const context = conversationState.getContextSummary();
    const currentStage = conversationState.currentStage;
    const guidelines = this.getStageGuidelines(currentStage);
    
    return {
      currentStage,
      questionCount: context.questionCount,
      guidelines,
      nextPossibleStates: this.getNextPossibleStates(currentStage, context),
      suggestedNextStage: this.determineNextStage(conversationState),
      stageValidation: this.validateStageRequirements(currentStage, conversationState)
    };
  }
}

// Singleton instance
let dialogueStateMachineInstance = null;

function getDialogueStateMachine() {
  if (!dialogueStateMachineInstance) {
    dialogueStateMachineInstance = new DialogueStateMachine();
  }
  return dialogueStateMachineInstance;
}

module.exports = {
  DialogueStateMachine,
  ValidationResult,
  TransitionResult,
  getDialogueStateMachine
};