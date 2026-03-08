/**
 * Dialogue Controller
 * 
 * Central orchestrator that manages interview flow and coordinates all agents
 * Replaces stateless agent architecture with controller-based coordination
 */

const { getShortTermMemory } = require('./shortTermMemory');
const { getDialogueStateMachine } = require('./dialogueStateMachine');
const { ConversationState, DialogueStage } = require('./conversationState');
const { getEntityTracker } = require('./entityTracker');
const { getClarificationDetector } = require('./clarificationDetector');
const { getQuestionValidator } = require('./questionValidator');

class DialogueController {
  constructor() {
    this.shortTermMemory = getShortTermMemory();
    this.stateMachine = getDialogueStateMachine();
    this.entityTracker = getEntityTracker();
    this.clarificationDetector = getClarificationDetector();
    this.questionValidator = getQuestionValidator();
    
    // Agent references (will be injected)
    this.interviewerAgent = null;
    this.evaluatorAgent = null;
    this.routerAgent = null;
    
    console.log('✅ Dialogue Controller initialized with all components');
  }
  
  /**
   * Inject agent dependencies
   */
  setAgents(interviewerAgent, evaluatorAgent, routerAgent = null) {
    this.interviewerAgent = interviewerAgent;
    this.evaluatorAgent = evaluatorAgent;
    this.routerAgent = routerAgent;
    console.log('🔗 Agents injected into Dialogue Controller');
  }
  
  /**
   * Start new interview session
   */
  async startInterview(userId, sessionId, resumeData) {
    try {
      console.log(`🚀 Starting interview session for user ${userId}, session ${sessionId}`);
      
      // Extract candidate name from resume
      const candidateName = resumeData?.name || 'Candidate';
      
      // Create conversation state in short-term memory
      const conversationState = await this.shortTermMemory.createSession(
        sessionId, // Using sessionId as the key
        candidateName,
        resumeData
      );
      
      // Transition to INTRODUCTION stage
      const transitionResult = this.stateMachine.transition(
        conversationState,
        DialogueStage.INTRODUCTION,
        { questionCount: 0, mentionedProjects: [], mentionedSkills: [] }
      );
      
      if (!transitionResult.success) {
        throw new Error(`Failed to transition to INTRODUCTION: ${transitionResult.reason}`);
      }
      
      // Generate opening question
      const openingQuestion = await this.generateOpeningQuestion(conversationState, resumeData);
      
      // Add question to conversation state
      conversationState.addQA(openingQuestion, null);
      
      // Update state in memory
      await this.shortTermMemory.updateSession(sessionId, conversationState);
      
      console.log(`✅ Interview session ${sessionId} started successfully`);
      
      return {
        sessionId: sessionId,
        question: openingQuestion,
        questionNumber: 1,
        stage: conversationState.currentStage,
        startedAt: conversationState.startTime
      };
      
    } catch (error) {
      console.error('❌ Failed to start interview:', error);
      throw error;
    }
  }
  
  /**
   * Process candidate answer and generate next question
   */
  async processAnswer(sessionId, answer) {
    try {
      console.log(`📝 Processing answer for session ${sessionId}`);
      
      // Get conversation state from memory first
      let conversationState = await this.shortTermMemory.getSession(sessionId);
      
      // If not found in memory, try to restore from database
      if (!conversationState) {
        console.log(`⚠️  Session ${sessionId} not found in memory, attempting to restore from database...`);
        conversationState = await this.restoreSessionFromDatabase(sessionId);
        
        if (!conversationState) {
          throw new Error(`Session ${sessionId} not found in memory or database`);
        }
        
        console.log(`✅ Session ${sessionId} restored from database`);
      }
      
      // Get current question (last question without answer)
      const lastQuestion = conversationState.questionsAsked[conversationState.questionsAsked.length - 1];
      if (!lastQuestion) {
        throw new Error('No pending question found');
      }
      
      // Add answer to conversation state
      conversationState.addQA(lastQuestion.text, answer);
      
      // Check if we're currently in clarification mode
      const wasInClarificationMode = conversationState.clarificationPending;
      const clarificationContext = this.clarificationDetector.getClarificationContext(sessionId);
      
      // If we were in clarification mode, check if the answer resolves it
      if (wasInClarificationMode && clarificationContext) {
        console.log(`🔄 Processing answer in clarification mode: ${clarificationContext.requestType}`);
        
        // Check if the new answer still needs clarification
        const newClarificationRequest = this.detectClarificationRequest(answer);
        
        if (newClarificationRequest) {
          // Still needs clarification - update context and generate new clarification
          console.log(`⚠️ Answer still needs clarification: ${newClarificationRequest.type}`);
          
          this.clarificationDetector.setClarificationContext(
            sessionId, 
            newClarificationRequest.type, 
            clarificationContext.originalQuestion, 
            answer
          );
          
          const clarificationResponse = this.generateClarificationResponse(newClarificationRequest, conversationState);
          conversationState.addQA(clarificationResponse, null);
          
          await this.shortTermMemory.updateSession(sessionId, conversationState);
          
          return {
            question: clarificationResponse,
            questionNumber: conversationState.currentQuestionOrder,
            stage: conversationState.currentStage,
            isClarification: true,
            clarificationType: newClarificationRequest.type
          };
        } else {
          // Clarification resolved - clear context and continue normal flow
          console.log(`✅ Clarification resolved, returning to normal interview flow`);
          
          conversationState.setClarificationPending(false);
          this.clarificationDetector.clearClarificationContext(sessionId);
          
          // Extract entities from the clarified answer
          this.extractEntitiesFromAnswer(answer, conversationState);
        }
      } else {
        // Normal mode - check for new clarification requests
        const clarificationRequest = this.detectClarificationRequest(answer);
        
        if (clarificationRequest) {
          console.log(`🔍 Clarification request detected: ${clarificationRequest.type}`);
          
          // Enter clarification mode
          conversationState.setClarificationPending(true, clarificationRequest);
          
          // Set clarification context
          this.clarificationDetector.setClarificationContext(
            sessionId,
            clarificationRequest.type,
            lastQuestion.text,
            answer
          );
          
          // Generate clarification response
          const clarificationResponse = this.generateClarificationResponse(clarificationRequest, conversationState);
          
          // Add clarification as next question
          conversationState.addQA(clarificationResponse, null);
          
          // Update state and return
          await this.shortTermMemory.updateSession(sessionId, conversationState);
          
          return {
            question: clarificationResponse,
            questionNumber: conversationState.currentQuestionOrder,
            stage: conversationState.currentStage,
            isClarification: true,
            clarificationType: clarificationRequest.type
          };
        }
        
        // No clarification needed - extract entities from answer
        this.extractEntitiesFromAnswer(answer, conversationState);
      }
      
      // Determine if stage transition is needed
      const suggestedNextStage = this.stateMachine.determineNextStage(conversationState);
      if (suggestedNextStage && suggestedNextStage !== conversationState.currentStage) {
        const context = conversationState.getContextSummary();
        const transitionResult = this.stateMachine.transition(conversationState, suggestedNextStage, context);
        
        if (transitionResult.success) {
          console.log(`🔄 Stage transition: ${transitionResult.fromState} → ${transitionResult.toState}`);
        }
      }
      
      // Generate next question using appropriate agent
      const nextQuestion = await this.generateNextQuestion(conversationState);
      
      // Add question to conversation state
      conversationState.addQA(nextQuestion, null);
      
      // Update state in memory
      await this.shortTermMemory.updateSession(sessionId, conversationState);
      
      console.log(`✅ Answer processed, next question generated for session ${sessionId}`);
      
      return {
        question: nextQuestion,
        questionNumber: conversationState.currentQuestionOrder,
        stage: conversationState.currentStage,
        isClarification: false
      };
      
    } catch (error) {
      console.error('❌ Failed to process answer:', error);
      throw error;
    }
  }
  
  /**
   * Complete interview and generate assessment
   */
  async completeInterview(sessionId, qaPairs) {
    try {
      console.log(`🏁 Completing interview session ${sessionId}`);
      
      // Get conversation state from memory first
      let conversationState = await this.shortTermMemory.getSession(sessionId);
      
      // If not found in memory, try to restore from database
      if (!conversationState) {
        console.log(`⚠️  Session ${sessionId} not found in memory, attempting to restore from database...`);
        conversationState = await this.restoreSessionFromDatabase(sessionId);
        
        if (!conversationState) {
          console.log(`❌ Session ${sessionId} not found, using fallback assessment`);
          // Return a basic assessment based on qaPairs
          return this.getFallbackAssessment(qaPairs);
        }
        
        console.log(`✅ Session ${sessionId} restored from database for completion`);
      }
      
      // Transition to WRAP_UP stage if not already there
      if (conversationState.currentStage !== DialogueStage.WRAP_UP) {
        const context = conversationState.getContextSummary();
        this.stateMachine.transition(conversationState, DialogueStage.WRAP_UP, context);
      }
      
      // Generate assessment using evaluator agent with full context
      const assessment = await this.generateAssessment(conversationState, qaPairs);
      
      // Clean up session from memory
      await this.shortTermMemory.deleteSession(sessionId);
      
      console.log(`✅ Interview session ${sessionId} completed successfully`);
      
      return assessment;
      
    } catch (error) {
      console.error('❌ Failed to complete interview:', error);
      throw error;
    }
  }
  
  /**
   * Get conversation state for external access
   */
  async getConversationState(sessionId) {
    return await this.shortTermMemory.getSession(sessionId);
  }
  
  /**
   * Restore session from database when not found in memory
   */
  async restoreSessionFromDatabase(sessionId) {
    try {
      const { query } = require('../config/database');
      const { ConversationState } = require('./conversationState');
      
      // Get session data from database
      const sessionResult = await query(
        `SELECT s.id, s.user_id, s.started_at, s.status, r.extracted_data
         FROM interview_sessions s
         LEFT JOIN resumes r ON s.resume_id = r.id
         WHERE s.id = $1 AND s.status = 'in_progress'`,
        [sessionId]
      );
      
      if (sessionResult.rows.length === 0) {
        console.log(`❌ Session ${sessionId} not found in database or not in progress`);
        return null;
      }
      
      const sessionData = sessionResult.rows[0];
      const resumeData = sessionData.extracted_data || {};
      
      // Get Q&A pairs from database
      const qaPairsResult = await query(
        `SELECT question, answer, question_order, created_at
         FROM qa_pairs
         WHERE session_id = $1
         ORDER BY question_order ASC`,
        [sessionId]
      );
      
      const qaPairs = qaPairsResult.rows;
      
      // Create new conversation state
      const candidateName = resumeData.name || 'Candidate';
      const conversationState = new ConversationState(sessionId, candidateName, resumeData);
      
      // Restore Q&A pairs
      qaPairs.forEach(qa => {
        conversationState.addQA(qa.question, qa.answer);
      });
      
      // Restore entities by re-extracting from all answers
      const allAnswers = qaPairs.filter(qa => qa.answer).map(qa => qa.answer);
      allAnswers.forEach(answer => {
        this.extractEntitiesFromAnswer(answer, conversationState);
      });
      
      // Determine current stage based on question count and content
      const questionCount = qaPairs.length;
      let currentStage = 'INTRODUCTION';
      
      if (questionCount >= 7) {
        currentStage = 'WRAP_UP';
      } else if (questionCount >= 5) {
        currentStage = 'BEHAVIORAL';
      } else if (questionCount >= 4) {
        currentStage = 'TECHNICAL_CONCEPT';
      } else if (questionCount >= 3) {
        currentStage = 'PROJECT_DEEP_DIVE';
      } else if (questionCount >= 2) {
        currentStage = 'PROJECT_DISCOVERY';
      }
      
      conversationState.setStage(currentStage);
      
      // Store restored session back in memory
      await this.shortTermMemory.updateSession(sessionId, conversationState);
      
      console.log(`🔄 Restored session ${sessionId}: ${questionCount} Q&A pairs, stage: ${currentStage}`);
      
      return conversationState;
      
    } catch (error) {
      console.error(`❌ Failed to restore session ${sessionId} from database:`, error);
      return null;
    }
  }
  
  /**
   * Update conversation state
   */
  async updateConversationState(sessionId, updates) {
    const conversationState = await this.shortTermMemory.getSession(sessionId);
    if (!conversationState) {
      throw new Error(`Session ${sessionId} not found`);
    }
    
    // Apply updates
    Object.assign(conversationState, updates);
    
    // Save updated state
    await this.shortTermMemory.updateSession(sessionId, conversationState);
  }
  
  /**
   * Generate opening question
   */
  async generateOpeningQuestion(conversationState, resumeData) {
    if (this.interviewerAgent && this.interviewerAgent.generateOpeningQuestion) {
      try {
        return await this.interviewerAgent.generateOpeningQuestion(resumeData);
      } catch (error) {
        console.error('❌ Interviewer agent failed for opening question:', error);
      }
    }
    
    // Dynamic fallback opening questions
    const candidateName = conversationState.candidateName;
    const fallbackOpenings = [
      `Hello ${candidateName}, thank you for joining us today. Tell me about yourself - your background, experience, and what brings you here.`,
      `Hi ${candidateName}, great to meet you! I'd love to learn more about your background and what you're passionate about.`,
      `Hello ${candidateName}, thanks for taking the time to chat with us. Could you start by telling me about your professional journey?`,
      `Hi ${candidateName}, I'm excited to learn more about you. Tell me about your background and what led you to where you are today.`
    ];
    
    // Select random fallback
    return fallbackOpenings[Math.floor(Math.random() * fallbackOpenings.length)];
  }
  
  /**
   * Generate next question using appropriate agent with enhanced coordination
   */
  async generateNextQuestion(conversationState) {
    try {
      // Build enhanced context for agent
      const context = this.buildAgentContext(conversationState);
      
      // Route to appropriate agent if router is available
      let selectedAgent = this.interviewerAgent;
      if (this.routerAgent) {
        selectedAgent = this.routerAgent.route('generate_question', {
          lastAnswer: context.lastAnswer
        });
      }
      
      // Generate question with full context and coordination
      const question = await this.coordinateQuestionGeneration(selectedAgent, context, conversationState);
      
      return question;
      
    } catch (error) {
      console.error('❌ Failed to generate next question:', error);
      return this.getFallbackQuestion(conversationState);
    }
  }
  
  /**
   * Coordinate question generation with validation and retry logic
   */
  async coordinateQuestionGeneration(agent, context, conversationState, retryCount = 0) {
    const maxRetries = 2;
    
    try {
      if (!agent || !agent.generateQuestion) {
        console.log('⚠️  No agent available for question generation');
        return this.questionValidator.generateFallbackQuestion(conversationState);
      }
      
      // Generate question with full context injection
      const question = await agent.generateQuestion(context);
      
      // Enforce validation rules with detailed reporting
      const enforcement = this.enforceQuestionValidation(question, conversationState, {
        logViolations: true,
        generateReport: retryCount === 0 // Only generate report on first attempt
      });
      
      if (enforcement.validationResult.isValid) {
        console.log(`✅ Question generated and validated by ${agent.constructor.name}`);
        return question;
      }
      
      // Question failed validation
      console.log(`⚠️  Question validation failed with ${enforcement.criticalViolations} critical violations`);
      
      if (retryCount < maxRetries) {
        // Try to get improved question from validator
        const improvedQuestion = this.questionValidator.suggestImprovedQuestion(
          question, 
          enforcement.validationResult, 
          conversationState
        );
        
        if (improvedQuestion !== question) {
          console.log(`🔄 Using improved question from validator`);
          
          // Validate the improved question
          const improvedEnforcement = this.enforceQuestionValidation(improvedQuestion, conversationState, {
            logViolations: false // Don't log violations for auto-generated improvements
          });
          
          if (improvedEnforcement.validationResult.isValid) {
            return improvedQuestion;
          }
        }
        
        // Retry with enhanced context including validation feedback
        const enhancedContext = {
          ...context,
          validationFeedback: enforcement.validationResult.violations.map(v => v.description),
          suggestions: enforcement.validationResult.suggestions,
          previousFailedQuestion: question,
          retryAttempt: retryCount + 1,
          enforcementReport: enforcement.report
        };
        
        console.log(`🔄 Retrying question generation (attempt ${retryCount + 1})`);
        return await this.coordinateQuestionGeneration(agent, enhancedContext, conversationState, retryCount + 1);
      }
      
      // Max retries reached, use fallback from validator
      console.log('❌ Max retries reached, using fallback question');
      return this.questionValidator.generateFallbackQuestion(conversationState);
      
    } catch (error) {
      console.error(`❌ Agent question generation failed (attempt ${retryCount + 1}):`, error);
      
      if (retryCount < maxRetries) {
        console.log(`🔄 Retrying due to error (attempt ${retryCount + 1})`);
        return await this.coordinateQuestionGeneration(agent, context, conversationState, retryCount + 1);
      }
      
      return this.questionValidator.generateFallbackQuestion(conversationState);
    }
  }
  
  /**
   * Coordinate evaluation with enhanced context
   */
  async coordinateEvaluation(qaPairs, conversationState) {
    try {
      if (!this.evaluatorAgent || !this.evaluatorAgent.evaluate) {
        console.log('⚠️  No evaluator agent available');
        return this.getFallbackAssessment(qaPairs);
      }
      
      // Build comprehensive evaluation context
      const evaluationContext = {
        conversationState: conversationState.getContextSummary(),
        mentionedEntities: conversationState.getAllMentionedEntities(),
        stageProgression: this.getStageProgression(conversationState),
        interviewFlow: this.analyzeInterviewFlow(conversationState),
        qualityMetrics: this.calculateQualityMetrics(conversationState)
      };
      
      console.log('🎯 Coordinating evaluation with enhanced context');
      
      // Generate assessment with full context
      const assessment = await this.evaluatorAgent.evaluate(qaPairs, conversationState.sessionId);
      
      // Enhance assessment with conversation state insights
      return this.enhanceAssessmentWithContext(assessment, evaluationContext);
      
    } catch (error) {
      console.error('❌ Coordinated evaluation failed:', error);
      return this.getFallbackAssessment(qaPairs);
    }
  }
  
  /**
   * Inject shared state into all agent interactions
   */
  injectSharedState(baseContext, conversationState) {
    const sharedState = {
      // Core conversation state
      sessionId: conversationState.sessionId,
      candidateName: conversationState.candidateName,
      currentStage: conversationState.currentStage,
      
      // Critical entity tracking
      mentionedProjects: conversationState.mentionedProjects.map(p => ({
        name: p.name,
        confidence: p.confidence,
        context: p.context
      })),
      mentionedSkills: conversationState.mentionedSkills.map(s => ({
        name: s.name,
        confidence: s.confidence,
        context: s.context
      })),
      mentionedTechnologies: conversationState.mentionedTechnologies.map(t => ({
        name: t.name,
        confidence: t.confidence,
        context: t.context
      })),
      
      // Conversation flow
      questionCount: conversationState.currentQuestionOrder,
      conversationHistory: this.buildConversationHistory(conversationState),
      
      // State machine context
      stageGuidelines: this.stateMachine.getStageGuidelines(conversationState.currentStage),
      possibleTransitions: this.stateMachine.getNextPossibleStates(conversationState.currentStage, conversationState.getContextSummary()),
      
      // Validation constraints
      allowedTopics: this.getAllowedTopics(conversationState),
      forbiddenAssumptions: this.getForbiddenAssumptions(conversationState),
      
      // Quality indicators
      engagementLevel: conversationState.engagementLevel,
      clarificationPending: conversationState.clarificationPending
    };
    
    return {
      ...baseContext,
      sharedState,
      // Ensure backward compatibility
      mentionedProjects: sharedState.mentionedProjects.map(p => p.name),
      mentionedSkills: sharedState.mentionedSkills.map(s => s.name),
      mentionedTechnologies: sharedState.mentionedTechnologies.map(t => t.name)
    };
  }
  
  /**
   * Generate assessment using evaluator agent with coordination
   */
  async generateAssessment(conversationState, qaPairs) {
    try {
      return await this.coordinateEvaluation(qaPairs, conversationState);
    } catch (error) {
      console.error('❌ Failed to generate assessment:', error);
      return this.getFallbackAssessment(qaPairs);
    }
  }
  
  /**
   * Build enhanced context for agents with shared state injection
   */
  buildAgentContext(conversationState) {
    const summary = conversationState.getContextSummary();
    const stageGuidelines = this.stateMachine.getStageGuidelines(conversationState.currentStage);
    
    const baseContext = {
      // Conversation state
      sessionId: conversationState.sessionId,
      candidateName: conversationState.candidateName,
      currentStage: conversationState.currentStage,
      questionCount: summary.questionCount,
      
      // Mentioned entities (CRITICAL)
      mentionedProjects: summary.mentionedProjects,
      mentionedSkills: summary.mentionedSkills,
      mentionedTechnologies: summary.mentionedTechnologies,
      mentionedExperience: summary.mentionedExperience,
      
      // Conversation history
      lastQuestion: summary.lastQuestion,
      lastAnswer: summary.lastAnswer,
      previousQuestions: conversationState.questionsAsked.map(q => q.text),
      previousAnswers: conversationState.answersReceived.map(a => a.text),
      
      // State context
      clarificationPending: summary.clarificationPending,
      clarificationContext: summary.clarificationContext,
      stageGuidelines: stageGuidelines,
      
      // Resume reference (for fallback only)
      resumeData: conversationState.resumeReference,
      
      // Quality metrics
      avgAnswerLength: summary.avgAnswerLength,
      engagementLevel: summary.engagementLevel
    };
    
    // Inject shared state for coordination
    return this.injectSharedState(baseContext, conversationState);
  }
  
  /**
   * Basic entity extraction from answer
   */
  extractEntitiesFromAnswer(answer, conversationState) {
    const extractionResult = this.entityTracker.extractEntities(answer, conversationState);
    
    // Add extracted entities to conversation state
    extractionResult.entities.forEach(entity => {
      conversationState.addExtractedEntity(entity);
    });
    
    console.log(`🔍 Extracted ${extractionResult.entities.length} entities from answer`);
    return extractionResult.entities;
  }
  
  /**
   * Detect clarification requests
   */
  /**
   * Enforce question validation with detailed reporting
   */
  enforceQuestionValidation(question, conversationState, options = {}) {
    return this.questionValidator.enforceValidationRules(question, conversationState, {
      strictMode: false,
      logViolations: true,
      generateReport: true,
      ...options
    });
  }

  /**
   * Handle clarification mode switching and state restoration
   */
  async handleClarificationMode(sessionId, answer, conversationState) {
    const clarificationContext = this.clarificationDetector.getClarificationContext(sessionId);
    
    if (!clarificationContext) {
      return { needsClarification: false };
    }
    
    console.log(`🔄 Handling clarification mode for type: ${clarificationContext.requestType}`);
    
    // Check if the answer resolves the clarification
    const newClarificationRequest = this.detectClarificationRequest(answer);
    
    if (newClarificationRequest) {
      // Still needs clarification - update context
      this.clarificationDetector.setClarificationContext(
        sessionId,
        newClarificationRequest.type,
        clarificationContext.originalQuestion,
        answer
      );
      
      const clarificationResponse = this.generateClarificationResponse(newClarificationRequest, conversationState);
      
      return {
        needsClarification: true,
        clarificationResponse,
        clarificationType: newClarificationRequest.type
      };
    } else {
      // Clarification resolved - restore normal state
      console.log(`✅ Clarification resolved, restoring normal interview flow`);
      
      conversationState.setClarificationPending(false);
      this.clarificationDetector.clearClarificationContext(sessionId);
      
      return { needsClarification: false, clarificationResolved: true };
    }
  }

  detectClarificationRequest(answer) {
    return this.clarificationDetector.detectClarificationRequest(answer);
  }
  
  /**
   * Generate clarification response
   */
  generateClarificationResponse(clarificationRequest, conversationState) {
    return this.clarificationDetector.generateClarification(clarificationRequest, conversationState);
  }
  
  /**
   * Validate generated question
   */
  validateQuestion(question, conversationState) {
    const validationResult = this.questionValidator.validateQuestion(question, conversationState);
    return validationResult.isValid;
  }
  
  /**
   * Get fallback question based on stage
   */
  getFallbackQuestion(conversationState) {
    const stage = conversationState.currentStage;
    const summary = conversationState.getContextSummary();
    
    switch (stage) {
      case DialogueStage.INTRODUCTION:
        return "Tell me about your background and experience.";
        
      case DialogueStage.PROJECT_DISCOVERY:
        return "Have you worked on any projects you'd like to discuss?";
        
      case DialogueStage.PROJECT_DEEP_DIVE:
        if (summary.mentionedProjects.length > 0) {
          return `Can you tell me more about ${summary.mentionedProjects[0]}?`;
        }
        return "What was the most challenging project you've worked on?";
        
      case DialogueStage.TECHNICAL_CONCEPT:
        return "What technologies are you most comfortable working with?";
        
      case DialogueStage.BEHAVIORAL:
        return "Tell me about a time you had to work with a difficult team member.";
        
      case DialogueStage.WRAP_UP:
        return "Do you have any questions for us about the role or company?";
        
      default:
        return "Can you tell me more about that?";
    }
  }
  
  /**
   * Get fallback assessment
   */
  getFallbackAssessment(qaPairs) {
    const answeredCount = qaPairs.filter(qa => qa.answer && qa.answer.length > 20).length;
    const baseScore = Math.min(50 + (answeredCount * 5), 75);
    
    return {
      communication_score: baseScore,
      correctness_score: baseScore,
      confidence_score: baseScore,
      stress_handling_score: baseScore,
      overall_score: baseScore,
      feedback_text: `Completed ${answeredCount} questions. Consider providing more detailed responses in future interviews.`,
      strengths: ['Completed the interview session'],
      weaknesses: ['Could provide more detailed responses'],
      recommendations: ['Practice explaining technical concepts clearly']
    };
  }
  
  /**
   * Get stage progression information
   */
  getStageProgression(conversationState) {
    const stages = Object.values(DialogueStage);
    const currentIndex = stages.indexOf(conversationState.currentStage);
    
    return {
      currentStage: conversationState.currentStage,
      stageIndex: currentIndex,
      totalStages: stages.length,
      progressPercentage: Math.round((currentIndex / (stages.length - 1)) * 100),
      stagesCompleted: stages.slice(0, currentIndex),
      stagesRemaining: stages.slice(currentIndex + 1)
    };
  }
  
  /**
   * Enhanced question validation with detailed feedback
   */
  validateQuestionWithDetails(question, conversationState) {
    const validationResult = this.questionValidator.validateQuestion(question, conversationState);
    
    return {
      isValid: validationResult.isValid,
      violations: validationResult.violations.map(v => v.description),
      suggestions: validationResult.suggestions,
      confidence: validationResult.confidence
    };
  }
  
  /**
   * Check if question is appropriate for current stage
   */
  isQuestionAppropriateForStage(question, stage) {
    const lowerQuestion = question.toLowerCase();
    
    switch (stage) {
      case DialogueStage.INTRODUCTION:
        return lowerQuestion.includes('tell me about') || lowerQuestion.includes('yourself') || lowerQuestion.includes('background');
        
      case DialogueStage.PROJECT_DISCOVERY:
        return lowerQuestion.includes('project') || lowerQuestion.includes('worked on') || lowerQuestion.includes('experience');
        
      case DialogueStage.PROJECT_DEEP_DIVE:
        return lowerQuestion.includes('project') || lowerQuestion.includes('how did') || lowerQuestion.includes('challenge');
        
      case DialogueStage.TECHNICAL_CONCEPT:
        return lowerQuestion.includes('technical') || lowerQuestion.includes('technology') || lowerQuestion.includes('how would');
        
      case DialogueStage.BEHAVIORAL:
        return lowerQuestion.includes('time when') || lowerQuestion.includes('situation') || lowerQuestion.includes('team');
        
      case DialogueStage.WRAP_UP:
        return lowerQuestion.includes('questions for') || lowerQuestion.includes('anything else') || lowerQuestion.includes('next steps');
        
      default:
        return true; // Allow any question for unknown stages
    }
  }
  
  /**
   * Build conversation history for context
   */
  buildConversationHistory(conversationState) {
    const history = [];
    const questions = conversationState.questionsAsked;
    const answers = conversationState.answersReceived;
    
    for (let i = 0; i < questions.length; i++) {
      const question = questions[i];
      const answer = answers.find(a => a.questionOrder === question.order);
      
      history.push({
        questionOrder: question.order,
        question: question.text,
        answer: answer ? answer.text : null,
        stage: question.stage,
        timestamp: question.timestamp
      });
    }
    
    return history;
  }
  
  /**
   * Get allowed topics based on mentioned entities
   */
  getAllowedTopics(conversationState) {
    const allowedTopics = [
      ...conversationState.mentionedProjects.map(p => p.name),
      ...conversationState.mentionedSkills.map(s => s.name),
      ...conversationState.mentionedTechnologies.map(t => t.name),
      ...conversationState.mentionedExperience.map(e => e.name)
    ];
    
    // If no topics mentioned yet, allow general inquiry
    if (allowedTopics.length === 0) {
      return ['general_inquiry', 'background', 'experience', 'projects', 'skills'];
    }
    
    return allowedTopics;
  }
  
  /**
   * Get forbidden assumptions
   */
  getForbiddenAssumptions(conversationState) {
    const summary = conversationState.getContextSummary();
    const forbidden = [];
    
    // Don't assume projects if none mentioned
    if (summary.mentionedProjects.length === 0) {
      forbidden.push('specific_projects', 'project_details');
    }
    
    // Don't assume technologies if none mentioned
    if (summary.mentionedSkills.length === 0 && summary.mentionedTechnologies.length === 0) {
      forbidden.push('specific_technologies', 'technical_implementation');
    }
    
    return forbidden;
  }
  
  /**
   * Analyze interview flow quality
   */
  analyzeInterviewFlow(conversationState) {
    const history = this.buildConversationHistory(conversationState);
    const stageTransitions = this.getStageTransitions(history);
    
    return {
      totalQuestions: history.length,
      stageTransitions,
      flowQuality: this.calculateFlowQuality(history),
      coherenceScore: this.calculateCoherenceScore(history),
      entityProgression: this.analyzeEntityProgression(conversationState)
    };
  }
  
  /**
   * Calculate quality metrics for evaluation
   */
  calculateQualityMetrics(conversationState) {
    const answers = conversationState.answersReceived;
    
    if (answers.length === 0) {
      return {
        avgAnswerLength: 0,
        responseRate: 0,
        engagementScore: 0,
        clarificationRate: 0
      };
    }
    
    const totalLength = answers.reduce((sum, answer) => sum + answer.length, 0);
    const avgLength = totalLength / answers.length;
    
    const shortAnswers = answers.filter(a => a.length < 50).length;
    const longAnswers = answers.filter(a => a.length > 200).length;
    
    return {
      avgAnswerLength: Math.round(avgLength),
      responseRate: (answers.length / conversationState.questionsAsked.length) * 100,
      engagementScore: Math.round(((longAnswers / answers.length) * 100)),
      clarificationRate: Math.round(((shortAnswers / answers.length) * 100)),
      detailLevel: avgLength > 150 ? 'HIGH' : avgLength > 75 ? 'MEDIUM' : 'LOW'
    };
  }
  
  /**
   * Enhance assessment with conversation context
   */
  enhanceAssessmentWithContext(assessment, evaluationContext) {
    // Add context-aware insights to the assessment
    const contextInsights = {
      interviewFlow: evaluationContext.interviewFlow,
      entityCoverage: this.calculateEntityCoverage(evaluationContext.conversationState),
      stageProgression: evaluationContext.stageProgression,
      qualityMetrics: evaluationContext.qualityMetrics
    };
    
    return {
      ...assessment,
      contextInsights,
      // Enhance feedback with flow analysis
      enhanced_feedback: this.generateEnhancedFeedback(assessment, contextInsights)
    };
  }
  
  /**
   * Calculate entity coverage for assessment
   */
  calculateEntityCoverage(conversationState) {
    return {
      projectsCovered: conversationState.mentionedProjects.length,
      skillsCovered: conversationState.mentionedSkills.length,
      technologiesCovered: conversationState.mentionedTechnologies.length,
      experienceCovered: conversationState.mentionedExperience.length,
      totalEntities: conversationState.mentionedProjects.length + 
                   conversationState.mentionedSkills.length + 
                   conversationState.mentionedTechnologies.length + 
                   conversationState.mentionedExperience.length
    };
  }
  
  /**
   * Generate enhanced feedback with context
   */
  generateEnhancedFeedback(assessment, contextInsights) {
    let enhancedFeedback = assessment.feedback_text || '';
    
    // Add flow quality insights
    if (contextInsights.interviewFlow.coherenceScore < 0.7) {
      enhancedFeedback += '\n\nInterview Flow: Consider providing more connected and coherent responses that build on previous questions.';
    }
    
    // Add entity coverage insights
    if (contextInsights.entityCoverage.totalEntities < 3) {
      enhancedFeedback += '\n\nContent Depth: Try to mention more specific projects, technologies, and experiences to demonstrate your background.';
    }
    
    return enhancedFeedback;
  }
  
  /**
   * Helper methods for flow analysis
   */
  getStageTransitions(history) {
    const transitions = [];
    let currentStage = null;
    
    history.forEach(item => {
      if (item.stage !== currentStage) {
        transitions.push({
          from: currentStage,
          to: item.stage,
          questionOrder: item.questionOrder
        });
        currentStage = item.stage;
      }
    });
    
    return transitions;
  }
  
  calculateFlowQuality(history) {
    // Simple flow quality based on stage progression
    const stages = history.map(h => h.stage);
    const uniqueStages = [...new Set(stages)];
    
    // More stages covered = better flow
    return Math.min(uniqueStages.length / 5, 1.0); // Normalize to 0-1
  }
  
  calculateCoherenceScore(history) {
    // Simple coherence based on answer lengths and question progression
    const answers = history.filter(h => h.answer).map(h => h.answer);
    if (answers.length === 0) return 0;
    
    const avgLength = answers.reduce((sum, a) => sum + a.length, 0) / answers.length;
    const lengthScore = Math.min(avgLength / 200, 1.0); // Normalize
    
    return lengthScore;
  }
  
  analyzeEntityProgression(conversationState) {
    return {
      projectsIntroduced: conversationState.mentionedProjects.length,
      skillsIntroduced: conversationState.mentionedSkills.length,
      technologiesIntroduced: conversationState.mentionedTechnologies.length,
      progressionQuality: conversationState.mentionedProjects.length > 0 ? 'GOOD' : 'NEEDS_IMPROVEMENT'
    };
  }
}

// Singleton instance
let dialogueControllerInstance = null;

function getDialogueController() {
  if (!dialogueControllerInstance) {
    dialogueControllerInstance = new DialogueController();
  }
  return dialogueControllerInstance;
}

module.exports = { DialogueController, getDialogueController };