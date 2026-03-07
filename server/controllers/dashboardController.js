const { query } = require('../config/database');

/**
 * Get user dashboard data
 */
exports.getDashboard = async (req, res) => {
  try {
    const userId = req.user.userId;

    // Get user info
    const userResult = await query(
      'SELECT id, name, email, created_at FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const user = userResult.rows[0];

    // Get user's resume
    const resumeResult = await query(
      'SELECT id, extracted_data, created_at FROM resumes WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1',
      [userId]
    );

    const resume = resumeResult.rows.length > 0 ? resumeResult.rows[0] : null;

    // Get interview sessions (exclude practice - they're in-memory only, and exclude in_progress)
    const interviewsResult = await query(
      `SELECT 
        s.id, 
        s.session_type, 
        s.status, 
        s.started_at, 
        s.completed_at,
        a.overall_score,
        a.communication_score,
        a.correctness_score,
        a.confidence_score,
        a.stress_handling_score,
        a.strengths,
        a.weaknesses,
        a.recommendations,
        a.generated_at
      FROM interview_sessions s
      LEFT JOIN assessments a ON s.id = a.session_id
      WHERE s.user_id = $1 AND s.session_type = 'resume' AND s.status = 'completed'
      ORDER BY s.started_at DESC
      LIMIT 10`,
      [userId]
    );

    const interviews = interviewsResult.rows;

    // Calculate stats (all interviews are already completed due to the filter)
    const totalInterviews = interviews.length;
    
    let averageScore = 0;
    let bestScore = 0;
    
    if (totalInterviews > 0) {
      const scores = interviews
        .filter(i => i.overall_score !== null)
        .map(i => i.overall_score);
      
      if (scores.length > 0) {
        averageScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
        bestScore = Math.max(...scores);
      }
    }

    res.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        memberSince: user.created_at
      },
      resume: resume ? {
        id: resume.id,
        data: resume.extracted_data,
        uploadedAt: resume.created_at
      } : null,
      interviews: interviews.map(i => ({
        id: i.id,
        type: i.session_type === 'resume' ? 'Resume-Based' : 'Practice',
        status: i.status,
        date: i.started_at,
        completedAt: i.completed_at,
        score: i.overall_score,
        scores: {
          communication: i.communication_score,
          correctness: i.correctness_score,
          confidence: i.confidence_score,
          stressHandling: i.stress_handling_score
        },
        strengths: i.strengths || [],
        weaknesses: i.weaknesses || [],
        recommendations: i.recommendations || [],
        generatedAt: i.generated_at
      })),
      stats: {
        totalInterviews,
        averageScore,
        bestScore
      }
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to load dashboard data'
    });
  }
};
