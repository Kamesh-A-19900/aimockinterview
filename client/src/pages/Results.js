import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import './Results.css';

function Results() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [interview, setInterview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchInterviewDetails();
  }, [id]);

  const fetchInterviewDetails = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/interview/${id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (data.success) {
        setInterview(data.interview);
      } else {
        setError(data.message || 'Failed to load interview details');
      }
    } catch (error) {
      console.error('Fetch interview error:', error);
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score) => {
    if (score >= 80) return '#48bb78';
    if (score >= 60) return '#ed8936';
    return '#f56565';
  };

  const getScoreLabel = (score) => {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Fair';
    return 'Needs Improvement';
  };

  const downloadReport = () => {
    // TODO: Implement PDF download
    alert('PDF download feature coming soon!');
  };

  if (loading) {
    return (
      <div className="results-page">
        <div className="container">
          <div className="loading-spinner">
            <div className="spinner"></div>
            <p>Loading interview results...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !interview) {
    return (
      <div className="results-page">
        <div className="container">
          <div className="error-state">
            <div className="error-icon">❌</div>
            <h2>Failed to Load Results</h2>
            <p>{error || 'Interview not found'}</p>
            <button className="btn btn-primary" onClick={() => navigate('/dashboard')}>
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  const assessment = interview.assessment;
  const hasAssessment = assessment && assessment.overallScore !== null;

  return (
    <div className="results-page">
      <div className="container">
        {/* Header */}
        <div className="results-header">
          <div>
            <h1>Interview Results</h1>
            <p className="interview-meta">
              {interview.type === 'resume' ? '📄 Resume-Based' : '🎯 Practice'} Interview
              {' • '}
              {new Date(interview.startedAt).toLocaleDateString()}
            </p>
          </div>
          <div className="header-actions">
            <button className="btn btn-secondary" onClick={downloadReport}>
              📥 Download Report
            </button>
            <button className="btn btn-primary" onClick={() => navigate('/dashboard')}>
              Back to Dashboard
            </button>
          </div>
        </div>

        {hasAssessment ? (
          <>
            {/* Overall Score */}
            <div className="score-section">
              <div className="overall-score-card">
                <h2>Overall Performance</h2>
                <div className="score-circle-large">
                  <svg viewBox="0 0 200 200">
                    <circle
                      cx="100"
                      cy="100"
                      r="90"
                      fill="none"
                      stroke="#e2e8f0"
                      strokeWidth="20"
                    />
                    <circle
                      cx="100"
                      cy="100"
                      r="90"
                      fill="none"
                      stroke={getScoreColor(assessment.overallScore)}
                      strokeWidth="20"
                      strokeDasharray={`${assessment.overallScore * 5.65} 565`}
                      strokeLinecap="round"
                      transform="rotate(-90 100 100)"
                    />
                  </svg>
                  <div className="score-text">
                    <div className="score-number">{assessment.overallScore}</div>
                    <div className="score-label">{getScoreLabel(assessment.overallScore)}</div>
                  </div>
                </div>
              </div>

              {/* Category Scores */}
              <div className="category-scores">
                <div className="score-item">
                  <div className="score-item-header">
                    <span className="score-item-icon">💬</span>
                    <span className="score-item-name">Communication</span>
                    <span className="score-item-value">{assessment.scores.communication}</span>
                  </div>
                  <div className="score-bar">
                    <div 
                      className="score-bar-fill" 
                      style={{
                        width: `${assessment.scores.communication}%`,
                        backgroundColor: getScoreColor(assessment.scores.communication)
                      }}
                    ></div>
                  </div>
                </div>

                <div className="score-item">
                  <div className="score-item-header">
                    <span className="score-item-icon">✅</span>
                    <span className="score-item-name">Correctness</span>
                    <span className="score-item-value">{assessment.scores.correctness}</span>
                  </div>
                  <div className="score-bar">
                    <div 
                      className="score-bar-fill" 
                      style={{
                        width: `${assessment.scores.correctness}%`,
                        backgroundColor: getScoreColor(assessment.scores.correctness)
                      }}
                    ></div>
                  </div>
                </div>

                <div className="score-item">
                  <div className="score-item-header">
                    <span className="score-item-icon">💪</span>
                    <span className="score-item-name">Confidence</span>
                    <span className="score-item-value">{assessment.scores.confidence}</span>
                  </div>
                  <div className="score-bar">
                    <div 
                      className="score-bar-fill" 
                      style={{
                        width: `${assessment.scores.confidence}%`,
                        backgroundColor: getScoreColor(assessment.scores.confidence)
                      }}
                    ></div>
                  </div>
                </div>

                <div className="score-item">
                  <div className="score-item-header">
                    <span className="score-item-icon">🎯</span>
                    <span className="score-item-name">Stress Handling</span>
                    <span className="score-item-value">{assessment.scores.stressHandling}</span>
                  </div>
                  <div className="score-bar">
                    <div 
                      className="score-bar-fill" 
                      style={{
                        width: `${assessment.scores.stressHandling}%`,
                        backgroundColor: getScoreColor(assessment.scores.stressHandling)
                      }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>

            {/* AI Feedback */}
            <div className="feedback-section">
              <h2>📝 AI Evaluation & Suggestions</h2>
              <div className="feedback-card">
                <div className="feedback-content">
                  {assessment.feedback}
                </div>
              </div>
            </div>

            {/* Strengths & Weaknesses */}
            <div className="insights-section">
              <div className="insight-card strengths">
                <h3>💪 Strengths</h3>
                <ul>
                  {assessment.scores.communication >= 70 && (
                    <li>Clear and articulate communication</li>
                  )}
                  {assessment.scores.correctness >= 70 && (
                    <li>Strong technical knowledge</li>
                  )}
                  {assessment.scores.confidence >= 70 && (
                    <li>Confident in responses</li>
                  )}
                  {assessment.scores.stressHandling >= 70 && (
                    <li>Handles pressure well</li>
                  )}
                  {Object.values(assessment.scores).every(s => s < 70) && (
                    <li>Completed the interview - great first step!</li>
                  )}
                </ul>
              </div>

              <div className="insight-card weaknesses">
                <h3>🎯 Areas for Improvement</h3>
                <ul>
                  {assessment.scores.communication < 70 && (
                    <li>Work on communication clarity and structure</li>
                  )}
                  {assessment.scores.correctness < 70 && (
                    <li>Deepen technical knowledge in key areas</li>
                  )}
                  {assessment.scores.confidence < 70 && (
                    <li>Build confidence through more practice</li>
                  )}
                  {assessment.scores.stressHandling < 70 && (
                    <li>Practice stress management techniques</li>
                  )}
                </ul>
              </div>
            </div>
          </>
        ) : (
          <div className="no-assessment">
            <div className="info-icon">ℹ️</div>
            <h2>Interview In Progress</h2>
            <p>Complete the interview to see your detailed results and AI feedback.</p>
          </div>
        )}

        {/* Q&A Transcript */}
        <div className="transcript-section">
          <h2>📋 Interview Transcript</h2>
          <div className="transcript-list">
            {interview.qaPairs.map((qa, index) => (
              <div key={index} className="qa-item">
                <div className="qa-question">
                  <div className="qa-label">Question {qa.question_order}</div>
                  <div className="qa-text">{qa.question}</div>
                </div>
                {qa.answer && (
                  <div className="qa-answer">
                    <div className="qa-label">Your Answer</div>
                    <div className="qa-text">{qa.answer}</div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Next Steps */}
        <div className="next-steps-section">
          <h2>🚀 Next Steps</h2>
          <div className="next-steps-grid">
            <div className="next-step-card">
              <div className="step-icon">🔄</div>
              <h3>Practice More</h3>
              <p>Take another practice interview to improve your skills</p>
              <button className="btn btn-secondary" onClick={() => navigate('/practice')}>
                Start Practice
              </button>
            </div>
            <div className="next-step-card">
              <div className="step-icon">📄</div>
              <h3>Resume Interview</h3>
              <p>Upload your resume for personalized questions</p>
              <button className="btn btn-secondary" onClick={() => navigate('/interview')}>
                Upload Resume
              </button>
            </div>
            <div className="next-step-card">
              <div className="step-icon">📊</div>
              <h3>View Progress</h3>
              <p>Track your improvement over time</p>
              <button className="btn btn-secondary" onClick={() => navigate('/dashboard')}>
                View Dashboard
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Results;
