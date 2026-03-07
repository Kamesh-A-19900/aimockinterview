const { getGroqService } = require('../services/groqService');

/**
 * PRACTICE MODE - IN-MEMORY ONLY
 * 
 * - No database storage
 * - Static easy questions
 * - Simple evaluation at end
 * - Erase after completion
 * - Does NOT appear in dashboard
 */

// In-memory storage for practice sessions
const practiceSessions = new Map();

// Static easy questions for each role
const PRACTICE_QUESTIONS = {
  'software-engineer': [
    "Tell me about yourself and your experience in software development.",
    "What programming languages are you most comfortable with and why?",
    "Describe a challenging bug you fixed recently.",
    "How do you approach learning a new technology?",
    "What's your experience with version control systems like Git?"
  ],
  'frontend-developer': [
    "Tell me about your experience with frontend development.",
    "What's your favorite frontend framework and why?",
    "How do you ensure your websites are responsive?",
    "Describe a UI/UX challenge you solved.",
    "What tools do you use for debugging frontend issues?"
  ],
  'backend-developer': [
    "Tell me about your backend development experience.",
    "What databases have you worked with?",
    "How do you design RESTful APIs?",
    "Describe your experience with authentication and security.",
    "What's your approach to handling errors in backend systems?"
  ],
  'data-scientist': [
    "Tell me about your experience in data science.",
    "What machine learning algorithms are you familiar with?",
    "How do you handle missing data in datasets?",
    "Describe a data analysis project you worked on.",
    "What tools do you use for data visualization?"
  ],
  'product-manager': [
    "Tell me about your product management experience.",
    "How do you prioritize features in a product roadmap?",
    "Describe a time you had to make a difficult product decision.",
    "How do you gather and incorporate user feedback?",
    "What metrics do you use to measure product success?"
  ],
  'devops-engineer': [
    "Tell me about your DevOps experience.",
    "What CI/CD tools have you worked with?",
    "How do you approach infrastructure as code?",
    "Describe your experience with containerization.",
    "What's your strategy for monitoring and alerting?"
  ]
};

/**
 * Start practice interview (in-memory only)
 */
exports.startPractice = async (req, res) => {
  try {
    const { roleId } = req.body;

    if (!roleId) {
      return res.status(400).json({
        success: false,
        message: 'Role ID is required'
      });
    }

    // Get questions for role
    const questions = PRACTICE_QUESTIONS[roleId];
    if (!questions) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role ID'
      });
    }

    // Create in-memory session
    const sessionId = `practice_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    practiceSessions.set(sessionId, {
      roleId,
      questions,
      answers: [],
      currentQuestionIndex: 0,
      startedAt: new Date()
    });

    // Auto-cleanup after 2 hours
    setTimeout(() => {
      practiceSessions.delete(sessionId);
      console.log(`🗑️  Auto-cleaned practice session: ${sessionId}`);
    }, 2 * 60 * 60 * 1000);

    res.json({
      success: true,
      session: {
        id: sessionId,
        question: questions[0],
        questionNumber: 1,
        totalQuestions: questions.length
      }
    });
  } catch (error) {
    console.error('Start practice error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to start practice interview'
    });
  }
};

/**
 * Submit answer and get next question (in-memory only)
 */
exports.submitAnswer = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { answer } = req.body;

    if (!answer || answer.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Answer is required'
      });
    }

    // Get session from memory
    const session = practiceSessions.get(sessionId);
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Practice session not found or expired'
      });
    }

    // Store answer
    session.answers.push({
      question: session.questions[session.currentQuestionIndex],
      answer: answer.trim(),
      timestamp: new Date()
    });

    // Move to next question
    session.currentQuestionIndex++;

    // Check if more questions
    if (session.currentQuestionIndex < session.questions.length) {
      const nextQuestion = session.questions[session.currentQuestionIndex];
      
      res.json({
        success: true,
        question: nextQuestion,
        questionNumber: session.currentQuestionIndex + 1,
        totalQuestions: session.questions.length
      });
    } else {
      // No more questions
      res.json({
        success: true,
        completed: true,
        message: 'All questions answered. Ready for evaluation.'
      });
    }
  } catch (error) {
    console.error('Submit answer error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit answer'
    });
  }
};

/**
 * Complete practice and get evaluation (then erase)
 */
exports.completePractice = async (req, res) => {
  try {
    const { sessionId } = req.params;

    // Get session from memory
    const session = practiceSessions.get(sessionId);
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Practice session not found or expired'
      });
    }

    if (session.answers.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No answers to evaluate'
      });
    }

    // Evaluate with Groq
    const groq = getGroqService();
    
    const evaluationPrompt = `
You are an interview evaluator. Analyze these practice interview answers:

${session.answers.map((qa, i) => `
Q${i + 1}: ${qa.question}
A${i + 1}: ${qa.answer}
`).join('\n')}

Provide:
1. Overall score (0-100)
2. Scores for: Communication, Technical Knowledge, Clarity, Confidence (each 0-100)
3. Brief feedback (2-3 sentences)
4. 3 specific suggestions for improvement

Output JSON:
{
  "overall_score": number,
  "communication_score": number,
  "technical_score": number,
  "clarity_score": number,
  "confidence_score": number,
  "feedback": string,
  "suggestions": [string, string, string]
}
    `.trim();

    const response = await groq.client.chat.completions.create({
      model: 'llama-3.1-8b-instant', // Fast and cheap for practice
      messages: [{ role: 'user', content: evaluationPrompt }],
      temperature: 0.3
    });

    const content = response.choices[0].message.content;
    
    // Parse JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in evaluation response');
    }
    
    const evaluation = JSON.parse(jsonMatch[0]);

    // Delete session from memory (erase all data)
    practiceSessions.delete(sessionId);
    console.log(`🗑️  Erased practice session: ${sessionId}`);

    res.json({
      success: true,
      evaluation: {
        overallScore: evaluation.overall_score,
        scores: {
          communication: evaluation.communication_score,
          technical: evaluation.technical_score,
          clarity: evaluation.clarity_score,
          confidence: evaluation.confidence_score
        },
        feedback: evaluation.feedback,
        suggestions: evaluation.suggestions,
        questionsAnswered: session.answers.length
      },
      message: 'Practice session completed and erased'
    });
  } catch (error) {
    console.error('Complete practice error:', error);
    
    // Still delete session even if evaluation fails
    practiceSessions.delete(req.params.sessionId);
    
    res.status(500).json({
      success: false,
      message: 'Failed to evaluate practice interview'
    });
  }
};

/**
 * Get practice session stats (for debugging)
 */
exports.getStats = async (req, res) => {
  res.json({
    success: true,
    stats: {
      activeSessions: practiceSessions.size,
      sessions: Array.from(practiceSessions.keys())
    }
  });
};

module.exports = exports;
