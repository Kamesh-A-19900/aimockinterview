import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import './Results.css';

function Results() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [interview, setInterview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [animationTrigger, setAnimationTrigger] = useState(false);

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
        // Trigger animation briefly after rendering
        setTimeout(() => setAnimationTrigger(true), 100);
      } else {
        // Fallback for testing layouts if db fetch fails
        // Providing dummy data ensures we can test frontend changes without backend perfection
        setInterview(null);
        setError(data.message || 'Failed to load interview details');
      }
    } catch (error) {
      console.error('Fetch interview error:', error);
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };



  if (loading) {
    return (
      <div className="results-page">
        <div className="results-inner loading-view">
          <p>Analyzing...</p>
        </div>
      </div>
    );
  }

  if (error || !interview) {
    return (
      <div className="results-page">
        <div className="results-inner">
          <div className="alert alert-error" style={{textAlign: 'center', padding: '40px'}}>
            <div style={{fontSize: '48px', marginBottom: '16px'}}>⚠️</div>
            <h2 style={{marginBottom: '8px'}}>Failed to Load Results</h2>
            <p style={{marginBottom: '24px', color: 'var(--text-secondary)'}}>{error || 'Interview not found'}</p>
            <button className="btn-primary" onClick={() => navigate('/dashboard')}>
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  const assessment = interview.assessment;
  const hasAssessment = assessment && assessment.overallScore !== null;
  const circumference = 2 * Math.PI * 60; // r=60
  // Offset formula: circumference - (score / 100) * circumference
  const overallScoreOffset = animationTrigger ? circumference - (assessment.overallScore / 100) * circumference : circumference;

  const getScoreColor = (score) => {
    if (score >= 80) return 'var(--accent-green)';
    if (score >= 60) return 'var(--accent-amber)';
    return 'var(--accent-red)';
  };

  const getScoreLabel = (score) => {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Fair';
    return 'Needs Work';
  };

  return (
    <div className="results-page">
      <div className="results-inner">
        {/* Header */}
        <div className="results-header">
          <div className="results-header-left">
            <h1>Interview Results</h1>
            <p className="results-meta">
              {interview.type === 'resume' ? '📄 Resume-Based' : '🎯 Practice'} Interview
              {' • '}
              {new Date(interview.startedAt).toLocaleDateString()}
            </p>
          </div>
          <div className="results-actions">
            <button className="btn-primary" onClick={() => navigate('/dashboard')}>
              Dashboard
            </button>
          </div>
        </div>

        {hasAssessment ? (
          <>
            {/* Top Scores */}
            <div className="score-overview">
              <div className="score-card">
                <h2>Overall Score</h2>
                <div className="score-circle-wrapper">
                  <svg className="score-circle-svg" viewBox="0 0 160 160">
                    <circle className="score-circle-bg" cx="80" cy="80" r="60" />
                    <circle 
                      className="score-circle-fill" 
                      cx="80" cy="80" r="60" 
                      style={{
                        strokeDasharray: `${circumference} ${circumference}`,
                        strokeDashoffset: overallScoreOffset,
                        stroke: getScoreColor(assessment.overallScore)
                      }}
                    />
                  </svg>
                  <div className="score-circle-text">
                    <div className="score-circle-number">{assessment.overallScore}</div>
                    <div className="score-circle-label">{getScoreLabel(assessment.overallScore)}</div>
                  </div>
                </div>
              </div>

              <div className="dimension-scores">
                {[
                  { label: 'Communication', icon: '💬', value: assessment.scores.communication },
                  { label: 'Correctness', icon: '✅', value: assessment.scores.correctness },
                  { label: 'Confidence', icon: '💪', value: assessment.scores.confidence },
                  { label: 'Stress Handling', icon: '🎯', value: assessment.scores.stressHandling }
                ].map((dim, idx) => (
                  <div key={idx} className="dimension-item">
                    <div className="dimension-item-header">
                      <div className="dimension-name">{dim.icon} {dim.label}</div>
                      <div className="dimension-value">{dim.value}/100</div>
                    </div>
                    <div className="dimension-bar-track">
                      <div 
                        className="dimension-bar-fill" 
                        style={{
                          width: animationTrigger ? `${dim.value}%` : '0%',
                          backgroundColor: getScoreColor(dim.value)
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Strengths / Weaknesses */}
            <div className="feedback-grid">
              <div className="feedback-card">
                <div className="feedback-card-header strengths">
                  <span style={{fontSize: '24px'}}>🌟</span> Strengths
                </div>
                <ul className="feedback-list strengths">
                  {assessment.scores.communication >= 70 && <li>Clear and articulate communication</li>}
                  {assessment.scores.correctness >= 70 && <li>Strong technical knowledge in key areas</li>}
                  {assessment.scores.confidence >= 70 && <li>Highly confident in responses</li>}
                  {assessment.scores.stressHandling >= 70 && <li>Handles pressure exceptionally well</li>}
                  {Object.values(assessment.scores).every(s => s < 70) && <li>Completed the interview - solid baseline!</li>}
                </ul>
              </div>
              <div className="feedback-card">
                <div className="feedback-card-header weaknesses">
                  <span style={{fontSize: '24px'}}>🎯</span> Areas for Improvement
                </div>
                <ul className="feedback-list weaknesses">
                  {assessment.scores.communication < 70 && <li>Work on structuring thoughts more clearly using STAR</li>}
                  {assessment.scores.correctness < 70 && <li>Deepen technical grasp of core concepts</li>}
                  {assessment.scores.confidence < 70 && <li>Build confidence through more mock interviews</li>}
                  {assessment.scores.stressHandling < 70 && <li>Practice maintaining composure under pressure</li>}
                </ul>
              </div>
            </div>

            {/* AI Evaluation */}
            <div className="evaluation-card">
              <h2 style={{marginBottom: '20px', fontSize: '20px'}}>📝 AI Evaluation Summary</h2>
              <div className="evaluation-content">{assessment.feedback}</div>
            </div>
          </>
        ) : (
          <div className="alert alert-warning" style={{marginBottom: '40px'}}>
             Interview incomplete or assessment pending. Let's finish the interview first!
          </div>
        )}

        {/* Transcript */}
        <div className="transcript-section">
          <h2>Transcript</h2>
          <div className="qa-list">
            {interview.qaPairs.map((qa, idx) => (
              <div key={idx} className="qa-item">
                <div className="qa-question">
                  <div className="qa-label">Question {idx + 1}</div>
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

      </div>
    </div>
  );
}

export default Results;
