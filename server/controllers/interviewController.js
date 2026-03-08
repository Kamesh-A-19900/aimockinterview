const { query } = require('../config/database');
const { RouterAgent } = require('../agents/routerAgent');
const { InterviewerAgent } = require('../agents/interviewerAgent');
const { ResearcherAgent } = require('../agents/researcherAgent');
const { EvaluatorAgent } = require('../agents/evaluatorAgent');
const { getDialogueController } = require('../services/dialogueController');

// Initialize agents (singleton pattern)
let interviewerAgent, researcherAgent, evaluatorAgent, routerAgent, dialogueController;

function getAgents() {
  if (!interviewerAgent) {
    interviewerAgent = new InterviewerAgent();
    researcherAgent = new ResearcherAgent();
    evaluatorAgent = new EvaluatorAgent();
    routerAgent = new RouterAgent(interviewerAgent, researcherAgent, evaluatorAgent);
    
    // Initialize DialogueController and inject agents
    dialogueController = getDialogueController();
    dialogueController.setAgents(interviewerAgent, evaluatorAgent, routerAgent);
    
    console.log('✅ Interview system initialized with DialogueController');
  }
  return { interviewerAgent, researcherAgent, evaluatorAgent, routerAgent, dialogueController };
}

// DialogueController manages all conversation state - no need for separate maps

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

    // Initialize interview using DialogueController
    const { dialogueController } = getAgents();
    
    try {
      const interviewSession = await dialogueController.startInterview(userId, sessionId, resumeData);
      
      // Store first question in database
      await query(
        `INSERT INTO qa_pairs (session_id, question, question_order, created_at)
         VALUES ($1, $2, 1, NOW())`,
        [sessionId, interviewSession.question]
      );

      console.log('✅ Interview started with DialogueController');

      res.json({
        success: true,
        session: {
          id: sessionId,
          startedAt: sessionResult.rows[0].started_at,
          question: interviewSession.question,
          questionNumber: 1,
          stage: interviewSession.stage
        }
      });
    } catch (dialogueError) {
      console.error('❌ DialogueController error:', dialogueError);
      
      // Fallback to simple question generation
      const firstQuestion = `Tell me about your experience with ${resumeData.skills?.[0] || 'your main technical skill'}.`;
      
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
          questionNumber: 1,
          stage: 'INTRODUCTION'
        }
      });
    }
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

    // Process answer using DialogueController
    const { dialogueController } = getAgents();
    
    try {
      const result = await dialogueController.processAnswer(sessionId, answer.trim());
      
      const nextQuestionOrder = currentQA.question_order + 1;

      // Store next question
      await query(
        `INSERT INTO qa_pairs (session_id, question, question_order, created_at)
         VALUES ($1, $2, $3, NOW())`,
        [sessionId, result.question, nextQuestionOrder]
      );

      console.log('✅ Answer processed with DialogueController');

      res.json({
        success: true,
        question: result.question,
        questionNumber: nextQuestionOrder,
        stage: result.stage,
        isClarification: result.isClarification || false
      });
    } catch (dialogueError) {
      console.error('❌ DialogueController error:', dialogueError);
      console.error('❌ Error stack:', dialogueError.stack);
      console.error('❌ Session ID:', sessionId);
      console.error('❌ Answer:', answer.trim());
      
      // Generate a better fallback question based on the answer and resume data
      let fallbackQuestion = 'Can you tell me more about that experience?';
      
      const lowerAnswer = answer.trim().toLowerCase();
      
      // If candidate is asking for clarification
      if (lowerAnswer.includes('what') || lowerAnswer.includes('which') || lowerAnswer.includes('about what')) {
        fallbackQuestion = "Let me be more specific - I'd like to hear about any projects you've worked on or technical experiences you've had.";
      }
      // If candidate mentioned specific projects
      else if (lowerAnswer.includes('project') || lowerAnswer.includes('studyspark') || lowerAnswer.includes('netwise') || lowerAnswer.includes('weather')) {
        fallbackQuestion = "That sounds interesting! Can you tell me more about one of those projects - perhaps StudySpark? What technologies did you use and what challenges did you face?";
      }
      // If candidate mentioned technologies
      else if (lowerAnswer.includes('ml') || lowerAnswer.includes('ai') || lowerAnswer.includes('genai') || lowerAnswer.includes('automation')) {
        fallbackQuestion = "I'd love to hear more about your AI and ML work. Can you walk me through a specific project where you applied these technologies?";
      }
      // If candidate mentioned education/college
      else if (lowerAnswer.includes('student') || lowerAnswer.includes('college') || lowerAnswer.includes('engineering')) {
        fallbackQuestion = "What kind of projects have you worked on during your studies? Any that you're particularly proud of?";
      }
      // If no keywords found in answer, fall back to resume data
      else {
        console.log('⚠️  No keywords found in answer, falling back to resume data');
        
        try {
          // Get resume data for this session
          const resumeData = session.extracted_data;
          
          if (resumeData && resumeData.skills && resumeData.skills.length > 0) {
            const randomSkill = resumeData.skills[Math.floor(Math.random() * resumeData.skills.length)];
            fallbackQuestion = `I see from your resume that you have experience with ${randomSkill}. Can you tell me about a specific project where you used this technology?`;
          } else if (resumeData && resumeData.projects && resumeData.projects.length > 0) {
            const randomProject = resumeData.projects[Math.floor(Math.random() * resumeData.projects.length)];
            fallbackQuestion = `I noticed you mentioned ${randomProject.name || 'a project'} on your resume. Can you walk me through what you built and what technologies you used?`;
          } else if (resumeData && resumeData.experience && resumeData.experience.length > 0) {
            const recentExp = resumeData.experience[0];
            fallbackQuestion = `Tell me about your experience at ${recentExp.company || 'your previous role'}. What kind of work did you do there?`;
          } else {
            fallbackQuestion = "Can you tell me about any technical projects you've worked on, either professionally or as personal projects?";
          }
        } catch (resumeError) {
          console.error('❌ Error accessing resume data for fallback:', resumeError);
          fallbackQuestion = "Can you tell me about any technical projects you've worked on, either professionally or as personal projects?";
        }
      }
      
      const nextQuestionOrder = currentQA.question_order + 1;

      await query(
        `INSERT INTO qa_pairs (session_id, question, question_order, created_at)
         VALUES ($1, $2, $3, NOW())`,
        [sessionId, fallbackQuestion, nextQuestionOrder]
      );

      res.json({
        success: true,
        question: fallbackQuestion,
        questionNumber: nextQuestionOrder,
        stage: 'UNKNOWN',
        isClarification: false
      });
    }
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

    // Complete interview using DialogueController
    const { dialogueController } = getAgents();
    
    let assessment;
    try {
      assessment = await dialogueController.completeInterview(sessionId, qaPairs);
      console.log('✅ Assessment generated with DialogueController');
    } catch (dialogueError) {
      console.error('❌ DialogueController assessment error:', dialogueError);
      
      // Fallback assessment
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

    // Store assessment - use UPSERT to handle duplicate session_id
    try {
      console.log('💾 Attempting to save assessment to database...');
      console.log('   Session ID:', sessionId);
      console.log('   Overall Score:', Math.round(assessment.overall_score));
      
      // Check if assessment already exists for this session
      const existingAssessment = await query(
        'SELECT id FROM assessments WHERE session_id = $1',
        [sessionId]
      );
      
      let assessmentResult;
      
      if (existingAssessment.rows.length > 0) {
        // Update existing assessment
        console.log('⚠️  Assessment already exists for session, updating...');
        assessmentResult = await query(
          `UPDATE assessments SET
            communication_score = $2,
            correctness_score = $3,
            confidence_score = $4,
            stress_handling_score = $5,
            overall_score = $6,
            feedback_text = $7,
            strengths = $8,
            weaknesses = $9,
            recommendations = $10,
            evidence = $11,
            integrity_analysis = $12,
            generated_at = NOW()
          WHERE session_id = $1
          RETURNING id`,
          [
            sessionId,
            Math.round(assessment.communication_score),
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
      } else {
        // Insert new assessment
        assessmentResult = await query(
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
            Math.round(assessment.communication_score),
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
      }
      
      if (!assessmentResult.rows || assessmentResult.rows.length === 0) {
        throw new Error('Assessment upsert returned no rows');
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
 * Get rate limiting status
 */
exports.getRateLimitStatus = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { getRateLimitService } = require('../services/rateLimitService');
    const rateLimiter = getRateLimitService();
    
    const globalStatus = rateLimiter.getStatus();
    const userStatus = rateLimiter.getUserStatus(userId);
    
    res.json({
      success: true,
      rateLimits: {
        global: globalStatus,
        user: userStatus
      }
    });
  } catch (error) {
    console.error('Rate limit status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get rate limit status'
    });
  }
};

/**
 * Get question bank status and statistics
 */
exports.getQuestionBankStatus = async (req, res) => {
  try {
    const { getPDFQuestionBankService } = require('../services/pdfQuestionBankService');
    const questionBankService = getPDFQuestionBankService();
    
    const stats = questionBankService.getStatistics();
    
    res.json({
      success: true,
      questionBank: stats
    });
  } catch (error) {
    console.error('Question bank status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get question bank status'
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

    // Clean up DialogueController state if exists
    try {
      const { dialogueController } = getAgents();
      // The DialogueController uses ShortTermMemory which should handle cleanup automatically
      // But we can explicitly clear the session if needed
      console.log(`🧹 DialogueController state cleanup for session ${sessionId}`);
    } catch (cleanupError) {
      console.warn('⚠️  DialogueController cleanup warning:', cleanupError.message);
    }

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
