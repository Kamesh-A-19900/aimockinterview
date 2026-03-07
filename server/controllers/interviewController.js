const { query } = require('../config/database');
const { RouterAgent } = require('../agents/routerAgent');
const { InterviewerAgent } = require('../agents/interviewerAgent');
const { ResearcherAgent } = require('../agents/researcherAgent');
const { EvaluatorAgent } = require('../agents/evaluatorAgent');
const { ContextManager } = require('../services/contextManager');
const { TopicTracker } = require('../services/topicTracker');

// Initialize agents (singleton pattern)
let interviewerAgent, researcherAgent, evaluatorAgent, routerAgent;

function getAgents() {
  if (!interviewerAgent) {
    interviewerAgent = new InterviewerAgent();
    researcherAgent = new ResearcherAgent();
    evaluatorAgent = new EvaluatorAgent();
    routerAgent = new RouterAgent(interviewerAgent, researcherAgent, evaluatorAgent);
  }
  return { interviewerAgent, researcherAgent, evaluatorAgent, routerAgent };
}

// Store context managers and topic trackers per session (in-memory)
const contextManagers = new Map();
const topicTrackers = new Map();

/**
 * Start a new interview session
 */
exports.startInterview = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { resumeId } = req.body;

    if (!resumeId) {
      return res.status(400).json({
        success: false,
        message: 'Resume ID is required'
      });
    }

    // Clean up any abandoned "in_progress" interviews for this user
    const abandonedResult = await query(
      `SELECT id FROM interview_sessions 
       WHERE user_id = $1 AND status = 'in_progress'`,
      [userId]
    );

    if (abandonedResult.rows.length > 0) {
      console.log(`🧹 Cleaning up ${abandonedResult.rows.length} abandoned interview(s) for user ${userId}`);
      
      for (const session of abandonedResult.rows) {
        // Delete assessments (if any)
        await query('DELETE FROM assessments WHERE session_id = $1', [session.id]);
        // Delete Q&A pairs
        await query('DELETE FROM qa_pairs WHERE session_id = $1', [session.id]);
        // Delete session
        await query('DELETE FROM interview_sessions WHERE id = $1', [session.id]);
        // Clean up context manager if exists
        contextManagers.delete(session.id);
      }
      
      console.log(`✅ Cleaned up abandoned interviews`);
    }

    // Verify resume belongs to user
    const resumeResult = await query(
      'SELECT id, extracted_data FROM resumes WHERE id = $1 AND user_id = $2',
      [resumeId, userId]
    );

    if (resumeResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Resume not found'
      });
    }

    const resumeData = resumeResult.rows[0].extracted_data;

    // Create interview session
    const sessionResult = await query(
      `INSERT INTO interview_sessions (user_id, resume_id, session_type, status, started_at)
       VALUES ($1, $2, 'resume', 'in_progress', NOW())
       RETURNING id, started_at`,
      [userId, resumeId]
    );

    const sessionId = sessionResult.rows[0].id;

    // Initialize context manager for this session
    const contextManager = new ContextManager(sessionId);
    contextManagers.set(sessionId, contextManager);
    
    // Initialize topic tracker for this session
    const topicTracker = new TopicTracker(sessionId, resumeData);
    topicTrackers.set(sessionId, topicTracker);
    console.log('✅ Topic Tracker initialized for session:', sessionId);

    // Generate first question using Interviewer Agent
    let firstQuestion;
    try {
      const { interviewerAgent } = getAgents();
      firstQuestion = await interviewerAgent.generateOpeningQuestion(resumeData);
      console.log('✅ Multi-Agent: Generated opening question with Interviewer Agent (8B)');
    } catch (error) {
      console.error('❌ Interviewer Agent error:', error.message);
      firstQuestion = `Tell me about your experience with ${resumeData.skills?.[0] || 'your main technical skill'}.`;
    }

    // Store first question
    await query(
      `INSERT INTO qa_pairs (session_id, question, question_order, created_at)
       VALUES ($1, $2, 1, NOW())`,
      [sessionId, firstQuestion]
    );

    res.json({
      success: true,
      session: {
        id: sessionId,
        startedAt: sessionResult.rows[0].started_at,
        question: firstQuestion,
        questionNumber: 1
      }
    });
  } catch (error) {
    console.error('Start interview error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to start interview'
    });
  }
};

/**
 * Submit answer and get next question
 */
exports.submitAnswer = async (req, res) => {
  try {
    const userId = req.user.userId;
    const sessionId = req.params.id;
    const { answer } = req.body;

    if (!answer || answer.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Answer is required'
      });
    }

    // Verify session belongs to user
    const sessionResult = await query(
      `SELECT s.id, s.resume_id, s.status, r.extracted_data
       FROM interview_sessions s
       LEFT JOIN resumes r ON s.resume_id = r.id
       WHERE s.id = $1 AND s.user_id = $2`,
      [sessionId, userId]
    );

    if (sessionResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Interview session not found'
      });
    }

    const session = sessionResult.rows[0];

    if (session.status !== 'in_progress') {
      return res.status(400).json({
        success: false,
        message: 'Interview session is not active'
      });
    }

    // Get current question
    const currentQAResult = await query(
      `SELECT id, question, question_order
       FROM qa_pairs
       WHERE session_id = $1 AND answer IS NULL
       ORDER BY question_order DESC
       LIMIT 1`,
      [sessionId]
    );

    if (currentQAResult.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No pending question found'
      });
    }

    const currentQA = currentQAResult.rows[0];

    // Update with answer
    await query(
      'UPDATE qa_pairs SET answer = $1 WHERE id = $2',
      [answer.trim(), currentQA.id]
    );
    
    // Get or create topic tracker for this session
    let topicTracker = topicTrackers.get(sessionId);
    if (!topicTracker) {
      topicTracker = new TopicTracker(sessionId, session.extracted_data);
      topicTrackers.set(sessionId, topicTracker);
    }
    
    // Record Q&A in topic tracker
    topicTracker.recordQA(currentQA.question, answer.trim());
    
    // Check if should move to new topic
    const shouldTransition = topicTracker.shouldMoveToNewTopic(answer.trim());
    let nextTopic = null;
    
    if (shouldTransition) {
      nextTopic = topicTracker.getNextTopic();
      if (nextTopic) {
        topicTracker.setCurrentTopic(nextTopic);
        console.log(`🔄 Transitioning to new topic: ${nextTopic.type} - ${nextTopic.name}`);
      }
    }
    
    // Log coverage stats
    const coverage = topicTracker.getCoverageStats();
    console.log(`📊 Coverage: ${coverage.overall.percentage}% (${coverage.overall.covered}/${coverage.overall.total} topics)`);
    
    // Log quality metrics
    const metrics = topicTracker.getQualityMetrics();
    console.log(`📈 Quality: Avg length ${metrics.avgAnswerLength}, Vague ${metrics.vagueAnswerRate}%, Detailed ${metrics.detailedAnswerRate}%`);

    // Get all previous Q&A for context
    const previousQAResult = await query(
      `SELECT question, answer, question_order
       FROM qa_pairs
       WHERE session_id = $1 AND answer IS NOT NULL
       ORDER BY question_order ASC`,
      [sessionId]
    );

    const previousQA = previousQAResult.rows;

    // Get or create context manager for this session
    let contextManager = contextManagers.get(sessionId);
    if (!contextManager) {
      contextManager = new ContextManager(sessionId);
      contextManagers.set(sessionId, contextManager);
      
      // Rebuild context from previous Q&A
      for (const qa of previousQA) {
        await contextManager.addMessage(qa.question, qa.answer);
      }
    } else {
      // Add the latest Q&A to context
      await contextManager.addMessage(currentQA.question, answer.trim());
    }

    // Get compressed context
    const context = contextManager.getContext();
    console.log(`📊 Context: ${context.tokenEstimate} tokens (compressed)`);

    // Route to appropriate agent based on last answer
    const { routerAgent, interviewerAgent } = getAgents();
    const selectedAgent = routerAgent.route('generate_question', {
      lastAnswer: answer.trim()
    });

    // Log routing decision
    if (selectedAgent === interviewerAgent) {
      console.log('💬 Router: Using Interviewer Agent (8B) - conversational');
    } else {
      console.log('🔬 Router: Using Researcher Agent (120B) - technical deep-dive');
    }

    // Generate next question using selected agent
    let nextQuestion;
    try {
      const trackerState = topicTracker.getState();
      
      const result = await selectedAgent.generateQuestion({
        lastAnswer: answer.trim(),
        summary: context.summary,
        resumeData: session.extracted_data,
        questionCount: previousQA.length + 1,
        topicContext: {
          currentTopic: trackerState.currentTopic,
          nextTopic: nextTopic,
          coverage: trackerState.coverage,
          shouldTransition: shouldTransition
        }
      });
      
      // Handle both string and object responses
      nextQuestion = typeof result === 'string' ? result : result.question;
      console.log('✅ Multi-Agent: Generated next question');
    } catch (error) {
      console.error('❌ Agent error:', error.message);
      // Fallback question
      nextQuestion = 'Can you tell me more about that experience?';
    }

    const nextQuestionOrder = currentQA.question_order + 1;

    // Store next question
    await query(
      `INSERT INTO qa_pairs (session_id, question, question_order, created_at)
       VALUES ($1, $2, $3, NOW())`,
      [sessionId, nextQuestion, nextQuestionOrder]
    );

    res.json({
      success: true,
      question: nextQuestion,
      questionNumber: nextQuestionOrder
    });
  } catch (error) {
    console.error('Submit answer error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process answer'
    });
  }
};

/**
 * Complete interview and generate assessment
 */
exports.completeInterview = async (req, res) => {
  try {
    const userId = req.user.userId;
    const sessionId = req.params.id;

    // Verify session belongs to user
    const sessionResult = await query(
      'SELECT id, status FROM interview_sessions WHERE id = $1 AND user_id = $2',
      [sessionId, userId]
    );

    if (sessionResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Interview session not found'
      });
    }

    if (sessionResult.rows[0].status !== 'in_progress') {
      return res.status(400).json({
        success: false,
        message: 'Interview session is not active'
      });
    }

    // Get all Q&A pairs
    const qaPairsResult = await query(
      `SELECT question, answer, question_order
       FROM qa_pairs
       WHERE session_id = $1 AND answer IS NOT NULL
       ORDER BY question_order ASC`,
      [sessionId]
    );

    const qaPairs = qaPairsResult.rows;

    if (qaPairs.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No answered questions found'
      });
    }

    // Generate assessment using Evaluator Agent
    let assessment;
    try {
      const { evaluatorAgent } = getAgents();
      console.log('🎯 Multi-Agent: Using Evaluator Agent (70B) for assessment');
      assessment = await evaluatorAgent.evaluate(qaPairs, userId); // Pass userId for privacy
      console.log('✅ Multi-Agent: Assessment complete');
      console.log('   Overall Score:', assessment.overall_score);
      console.log('   Integrity Status:', assessment.integrityAnalysis?.status || 'N/A');
    } catch (error) {
      console.error('❌ Evaluator Agent error:', error.message);
      console.error('   Stack:', error.stack);
      
      // Fallback assessment - ensure it always has all required fields
      const avgAnswerLength = qaPairs.reduce((sum, qa) => sum + (qa.answer?.length || 0), 0) / qaPairs.length;
      const baseScore = Math.min(Math.floor(avgAnswerLength / 10) + 50, 85);
      
      assessment = {
        communication_score: baseScore,
        correctness_score: baseScore,
        confidence_score: baseScore,
        stress_handling_score: baseScore,
        overall_score: baseScore,
        feedback_text: `You completed ${qaPairs.length} interview questions. Your responses showed engagement with the process.`,
        strengths: [
          'Completed the interview session',
          'Provided responses to questions'
        ],
        weaknesses: [
          'Some responses could be more detailed',
          'Consider providing more specific examples'
        ],
        recommendations: [
          'Practice the STAR method for behavioral questions',
          'Prepare specific examples from your experience',
          'Focus on clear and structured communication'
        ],
        evidence: {
          communication: { quote: 'Based on overall responses', reasoning: 'Fallback evaluation' },
          correctness: { quote: 'Based on overall responses', reasoning: 'Fallback evaluation' },
          confidence: { quote: 'Based on overall responses', reasoning: 'Fallback evaluation' },
          stress_handling: { quote: 'Based on overall responses', reasoning: 'Fallback evaluation' }
        },
        integrityAnalysis: {
          status: 'unknown',
          recommendation: 'Assessment generated with fallback due to evaluation error',
          criticalIssues: 0,
          warningIssues: 0,
          integrityScore: 50
        }
      };
      
      console.log('⚠️  Using fallback assessment with score:', baseScore);
    }

    // Ensure all required fields exist with defaults
    assessment.strengths = assessment.strengths || [];
    assessment.weaknesses = assessment.weaknesses || [];
    assessment.recommendations = assessment.recommendations || [];
    assessment.evidence = assessment.evidence || {};
    assessment.integrityAnalysis = assessment.integrityAnalysis || {};

    // Clean up context manager for this session
    contextManagers.delete(sessionId);
    topicTrackers.delete(sessionId);

    // Store assessment - wrap in try-catch to handle any DB errors
    // CRITICAL: Only mark session as completed if assessment saves successfully
    try {
      console.log('💾 Attempting to save assessment to database...');
      console.log('   Session ID:', sessionId);
      console.log('   Overall Score:', Math.round(assessment.overall_score));
      
      const assessmentResult = await query(
        `INSERT INTO assessments (
          session_id, 
          communication_score, 
          correctness_score, 
          confidence_score, 
          stress_handling_score, 
          overall_score,
          feedback_text,
          strengths,
          weaknesses,
          recommendations,
          evidence,
          integrity_analysis,
          generated_at,
          created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())
        RETURNING id`,
        [
          sessionId,
          Math.round(assessment.communication_score), // Round to integer
          Math.round(assessment.correctness_score),
          Math.round(assessment.confidence_score),
          Math.round(assessment.stress_handling_score),
          Math.round(assessment.overall_score),
          assessment.feedback_text,
          JSON.stringify(assessment.strengths),
          JSON.stringify(assessment.weaknesses),
          JSON.stringify(assessment.recommendations),
          JSON.stringify(assessment.evidence),
          JSON.stringify(assessment.integrityAnalysis)
        ]
      );
      
      if (!assessmentResult.rows || assessmentResult.rows.length === 0) {
        throw new Error('Assessment insert returned no rows');
      }
      
      console.log('✅ Assessment saved to database with ID:', assessmentResult.rows[0].id);
      
      // Only update session status AFTER assessment is successfully saved
      await query(
        'UPDATE interview_sessions SET status = $1, completed_at = NOW() WHERE id = $2',
        ['completed', sessionId]
      );
      
      console.log('✅ Interview session marked as completed');
    } catch (dbError) {
      console.error('❌ Failed to save assessment to database:', dbError);
      console.error('   Error code:', dbError.code);
      console.error('   Error detail:', dbError.detail);
      console.error('   Error message:', dbError.message);
      
      // Don't update session status - leave it as 'in_progress'
      // This way the user can retry or we can debug
      throw new Error('Failed to save assessment: ' + dbError.message);
    }

    res.json({
      success: true,
      assessment: {
        overallScore: Math.round(assessment.overall_score),
        scores: {
          communication: Math.round(assessment.communication_score),
          correctness: Math.round(assessment.correctness_score),
          confidence: Math.round(assessment.confidence_score),
          stressHandling: Math.round(assessment.stress_handling_score)
        },
        feedback: assessment.feedback_text,
        strengths: assessment.strengths,
        weaknesses: assessment.weaknesses,
        recommendations: assessment.recommendations
      }
    });
  } catch (error) {
    console.error('❌ Complete interview error:', error);
    console.error('   Error details:', {
      message: error.message,
      code: error.code,
      stack: error.stack
    });
    
    res.status(500).json({
      success: false,
      message: 'Failed to complete interview: ' + error.message
    });
  }
};

/**
 * Get interview details
 */
exports.getInterview = async (req, res) => {
  try {
    const userId = req.user.userId;
    const sessionId = req.params.id;

    // Get session details
    const sessionResult = await query(
      `SELECT s.id, s.session_type, s.status, s.started_at, s.completed_at,
              a.communication_score, a.correctness_score, a.confidence_score,
              a.stress_handling_score, a.overall_score, a.feedback_text,
              a.strengths, a.weaknesses, a.recommendations, a.evidence, a.generated_at
       FROM interview_sessions s
       LEFT JOIN assessments a ON s.id = a.session_id
       WHERE s.id = $1 AND s.user_id = $2`,
      [sessionId, userId]
    );

    if (sessionResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Interview session not found'
      });
    }

    const session = sessionResult.rows[0];

    // Get Q&A pairs
    const qaPairsResult = await query(
      `SELECT question, answer, question_order, created_at
       FROM qa_pairs
       WHERE session_id = $1
       ORDER BY question_order ASC`,
      [sessionId]
    );

    res.json({
      success: true,
      interview: {
        id: session.id,
        type: session.session_type,
        status: session.status,
        startedAt: session.started_at,
        completedAt: session.completed_at,
        qaPairs: qaPairsResult.rows,
        assessment: session.overall_score ? {
          overallScore: session.overall_score,
          scores: {
            communication: session.communication_score,
            correctness: session.correctness_score,
            confidence: session.confidence_score,
            stressHandling: session.stress_handling_score
          },
          feedback: session.feedback_text,
          strengths: session.strengths || [],
          weaknesses: session.weaknesses || [],
          recommendations: session.recommendations || [],
          evidence: session.evidence || {},
          generatedAt: session.generated_at
        } : null
      }
    });
  } catch (error) {
    console.error('Get interview error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve interview'
    });
  }
};

/**
 * Terminate interview due to tab switching or fullscreen exit (delete from database)
 * Also automatically deletes interviews with 0 answered questions
 */
exports.terminateInterview = async (req, res) => {
  try {
    const userId = req.user.userId;
    const sessionId = req.params.id;

    // Verify session belongs to user
    const sessionResult = await query(
      'SELECT id, status FROM interview_sessions WHERE id = $1 AND user_id = $2',
      [sessionId, userId]
    );

    if (sessionResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Interview session not found'
      });
    }

    // Check how many questions were answered
    const answeredQuestionsResult = await query(
      'SELECT COUNT(*) as count FROM qa_pairs WHERE session_id = $1 AND answer IS NOT NULL',
      [sessionId]
    );

    const answeredCount = parseInt(answeredQuestionsResult.rows[0].count);

    if (answeredCount === 0) {
      console.log(`⛔ Terminating interview ${sessionId} - 0 questions answered (no storage waste)`);
    } else {
      console.log(`⛔ Terminating interview ${sessionId} due to policy violation (${answeredCount} questions answered)`);
    }

    // Delete all related data (cascade should handle this, but being explicit)
    // Delete assessments first (if any)
    await query('DELETE FROM assessments WHERE session_id = $1', [sessionId]);
    
    // Delete Q&A pairs
    await query('DELETE FROM qa_pairs WHERE session_id = $1', [sessionId]);
    
    // Delete the interview session
    await query('DELETE FROM interview_sessions WHERE id = $1', [sessionId]);

    // Clean up context manager if exists
    contextManagers.delete(sessionId);
    topicTrackers.delete(sessionId);

    console.log(`✅ Interview ${sessionId} deleted successfully`);

    res.json({
      success: true,
      message: 'Interview terminated and deleted due to policy violation'
    });
  } catch (error) {
    console.error('Terminate interview error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to terminate interview'
    });
  }
};
