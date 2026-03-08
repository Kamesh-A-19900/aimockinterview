/**
 * Conversation State Data Model
 * 
 * Maintains active interview memory and context in short-term memory (RAM/Redis)
 * Tracks mentioned entities, dialogue stage, and conversation flow
 */

/**
 * Dialogue stages for interview flow
 */
const DialogueStage = {
  START: 'START',
  INTRODUCTION: 'INTRODUCTION',
  PROJECT_DISCOVERY: 'PROJECT_DISCOVERY',
  PROJECT_DEEP_DIVE: 'PROJECT_DEEP_DIVE',
  TECHNICAL_CONCEPT: 'TECHNICAL_CONCEPT',
  BEHAVIORAL: 'BEHAVIORAL',
  WRAP_UP: 'WRAP_UP'
};

/**
 * Entity types for tracking mentioned items
 */
const EntityType = {
  PROJECT: 'PROJECT',
  SKILL: 'SKILL',
  TECHNOLOGY: 'TECHNOLOGY',
  EXPERIENCE: 'EXPERIENCE',
  COMPANY: 'COMPANY'
};

/**
 * Clarification types for handling candidate requests
 */
const ClarificationType = {
  WHICH_PROJECT: 'WHICH_PROJECT',
  WHAT_TECHNOLOGY: 'WHAT_TECHNOLOGY',
  REPEAT_QUESTION: 'REPEAT_QUESTION',
  UNCLEAR_QUESTION: 'UNCLEAR_QUESTION',
  NEED_EXAMPLES: 'NEED_EXAMPLES'
};

/**
 * Conversation State class
 */
class ConversationState {
  constructor(sessionId, candidateName, resumeData = {}) {
    // Session metadata
    this.sessionId = sessionId;
    this.candidateName = candidateName || 'Candidate';
    this.startTime = new Date();
    this.currentStage = DialogueStage.START;
    
    // Extracted entities (CRITICAL - only what candidate actually said)
    this.mentionedProjects = [];
    this.mentionedSkills = [];
    this.mentionedExperience = [];
    this.mentionedTechnologies = [];
    
    // Conversation history
    this.questionsAsked = [];
    this.answersReceived = [];
    this.currentQuestionOrder = 0;
    
    // State flags
    this.clarificationPending = false;
    this.clarificationContext = null;
    this.stageTransitionReady = false;
    
    // Quality metrics
    this.answerQualityScores = [];
    this.engagementLevel = 'UNKNOWN';
    
    // Resume reference (for fallback only - NOT for assumptions)
    this.resumeReference = {
      skills: resumeData.skills || [],
      projects: resumeData.projects || [],
      experience: resumeData.experience || []
    };
    
    console.log(`✅ Conversation state initialized for ${this.candidateName} (Session: ${sessionId})`);
  }
  
  /**
   * Add Q&A pair to conversation history
   */
  addQA(question, answer) {
    this.questionsAsked.push({
      text: question,
      order: this.currentQuestionOrder + 1,
      stage: this.currentStage,
      timestamp: new Date()
    });
    
    if (answer) {
      this.answersReceived.push({
        text: answer,
        questionOrder: this.currentQuestionOrder + 1,
        timestamp: new Date(),
        length: answer.length
      });
    }
    
    this.currentQuestionOrder++;
    console.log(`📝 Added Q&A pair (${this.currentQuestionOrder}) to conversation state`);
  }
  
  /**
   * Add extracted entity from candidate's answer
   */
  addExtractedEntity(entity) {
    const entityData = {
      ...entity,
      timestamp: new Date(),
      sessionId: this.sessionId
    };
    
    switch (entity.type) {
      case EntityType.PROJECT:
        if (!this.mentionedProjects.find(p => p.name === entity.name)) {
          this.mentionedProjects.push(entityData);
          console.log(`🎯 Extracted project: ${entity.name}`);
        }
        break;
      case EntityType.SKILL:
        if (!this.mentionedSkills.find(s => s.name === entity.name)) {
          this.mentionedSkills.push(entityData);
          console.log(`🎯 Extracted skill: ${entity.name}`);
        }
        break;
      case EntityType.TECHNOLOGY:
        if (!this.mentionedTechnologies.find(t => t.name === entity.name)) {
          this.mentionedTechnologies.push(entityData);
          console.log(`🎯 Extracted technology: ${entity.name}`);
        }
        break;
      case EntityType.EXPERIENCE:
        if (!this.mentionedExperience.find(e => e.name === entity.name)) {
          this.mentionedExperience.push(entityData);
          console.log(`🎯 Extracted experience: ${entity.name}`);
        }
        break;
    }
  }
  
  /**
   * Set dialogue stage
   */
  setStage(newStage) {
    const oldStage = this.currentStage;
    this.currentStage = newStage;
    console.log(`🔄 Stage transition: ${oldStage} → ${newStage}`);
  }
  
  /**
   * Set clarification state
   */
  setClarificationPending(pending, context = null) {
    this.clarificationPending = pending;
    this.clarificationContext = context;
    console.log(`🔍 Clarification ${pending ? 'requested' : 'resolved'}`);
  }
  
  /**
   * Get all mentioned entities
   */
  getAllMentionedEntities() {
    return [
      ...this.mentionedProjects,
      ...this.mentionedSkills,
      ...this.mentionedTechnologies,
      ...this.mentionedExperience
    ];
  }
  
  /**
   * Check if entity was mentioned
   */
  isEntityMentioned(entityName, entityType = null) {
    const allEntities = this.getAllMentionedEntities();
    return allEntities.some(entity => 
      entity.name.toLowerCase() === entityName.toLowerCase() &&
      (entityType === null || entity.type === entityType)
    );
  }
  
  /**
   * Get conversation summary for context injection
   */
  getContextSummary() {
    return {
      sessionId: this.sessionId,
      candidateName: this.candidateName,
      currentStage: this.currentStage,
      questionCount: this.currentQuestionOrder,
      
      // Mentioned entities (CRITICAL for question generation)
      mentionedProjects: this.mentionedProjects.map(p => p.name),
      mentionedSkills: this.mentionedSkills.map(s => s.name),
      mentionedTechnologies: this.mentionedTechnologies.map(t => t.name),
      mentionedExperience: this.mentionedExperience.map(e => e.name),
      
      // Recent conversation
      lastQuestion: this.questionsAsked[this.questionsAsked.length - 1]?.text,
      lastAnswer: this.answersReceived[this.answersReceived.length - 1]?.text,
      
      // State flags
      clarificationPending: this.clarificationPending,
      clarificationContext: this.clarificationContext,
      
      // Quality indicators
      avgAnswerLength: this.getAverageAnswerLength(),
      engagementLevel: this.engagementLevel
    };
  }
  
  /**
   * Get average answer length for quality assessment
   */
  getAverageAnswerLength() {
    if (this.answersReceived.length === 0) return 0;
    const totalLength = this.answersReceived.reduce((sum, answer) => sum + answer.length, 0);
    return Math.round(totalLength / this.answersReceived.length);
  }
  
  /**
   * Serialize state for storage
   */
  toJSON() {
    return {
      sessionId: this.sessionId,
      candidateName: this.candidateName,
      startTime: this.startTime,
      currentStage: this.currentStage,
      mentionedProjects: this.mentionedProjects,
      mentionedSkills: this.mentionedSkills,
      mentionedExperience: this.mentionedExperience,
      mentionedTechnologies: this.mentionedTechnologies,
      questionsAsked: this.questionsAsked,
      answersReceived: this.answersReceived,
      currentQuestionOrder: this.currentQuestionOrder,
      clarificationPending: this.clarificationPending,
      clarificationContext: this.clarificationContext,
      stageTransitionReady: this.stageTransitionReady,
      answerQualityScores: this.answerQualityScores,
      engagementLevel: this.engagementLevel,
      resumeReference: this.resumeReference
    };
  }
  
  /**
   * Deserialize state from storage
   */
  static fromJSON(data) {
    const state = new ConversationState(data.sessionId, data.candidateName);
    Object.assign(state, data);
    state.startTime = new Date(data.startTime);
    return state;
  }
}

module.exports = {
  ConversationState,
  DialogueStage,
  EntityType,
  ClarificationType
};