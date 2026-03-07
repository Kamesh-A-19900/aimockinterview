import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Practice.css';

function Practice() {
  const navigate = useNavigate();
  const [step, setStep] = useState('selection'); // selection, interview, results
  const [selectedRole, setSelectedRole] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [currentAnswer, setCurrentAnswer] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [evaluation, setEvaluation] = useState(null);

  // Toast notification function
  const showToast = (message, type = 'info') => {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => document.body.removeChild(toast), 300);
    }, 3000);
  };

  const roles = [
    {
      id: 'software-engineer',
      name: 'Software Engineer',
      icon: '💻',
      description: 'General software engineering questions covering algorithms, system design, and coding',
      questions: 5
    },
    {
      id: 'data-scientist',
      name: 'Data Scientist',
      icon: '📊',
      description: 'Data science and machine learning focused questions',
      questions: 5
    },
    {
      id: 'product-manager',
      name: 'Product Manager',
      icon: '📱',
      description: 'Product management and strategy questions',
      questions: 5
    },
    {
      id: 'frontend-developer',
      name: 'Frontend Developer',
      icon: '🎨',
      description: 'Frontend development and UI/UX questions',
      questions: 5
    },
    {
      id: 'backend-developer',
      name: 'Backend Developer',
      icon: '⚙️',
      description: 'Backend development and API design questions',
      questions: 5
    },
    {
      id: 'devops-engineer',
      name: 'DevOps Engineer',
      icon: '🔧',
      description: 'DevOps, CI/CD, and infrastructure questions',
      questions: 5
    }
  ];

  // Simple cleanup on unmount
  useEffect(() => {
    return () => {
      // Cleanup if needed
    };
  }, []);

  const handleStartPractice = async (role) => {
    setSelectedRole(role);
    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      
      if (!token) {
        setError('Please sign in to start practice interview');
        navigate('/signin');
        return;
      }

      const response = await fetch('http://localhost:5000/api/practice/start', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ roleId: role.id })
      });

      const data = await response.json();

      if (data.success) {
        setSessionId(data.session.id);
        setMessages([{
          type: 'ai',
          text: data.session.question
        }]);
        setStep('interview');
      } else {
        setError(data.message || 'Failed to start practice interview');
      }
    } catch (error) {
      console.error('Start practice error:', error);
      setError('Network error. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSendAnswer = async () => {
    if (!currentAnswer.trim() || loading) return;

    const userMessage = currentAnswer.trim();
    setCurrentAnswer('');
    setLoading(true);
    setError('');

    // Add user message to chat
    setMessages(prev => [...prev, {
      type: 'user',
      text: userMessage
    }]);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/practice/${sessionId}/answer`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ answer: userMessage })
      });

      const data = await response.json();

      if (data.success) {
        if (data.completed) {
          // All questions answered - auto-complete and show evaluation
          await autoCompleteInterview();
        } else {
          // Add next question
          setMessages(prev => [...prev, {
            type: 'ai',
            text: data.question
          }]);
        }
      } else {
        setError(data.message || 'Failed to get next question');
      }
    } catch (error) {
      console.error('Submit answer error:', error);
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const autoCompleteInterview = async () => {
    if (!sessionId) return;

    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/practice/${sessionId}/complete`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (data.success) {
        setEvaluation(data.evaluation);
        setStep('results');
      } else {
        setError(data.message || 'Failed to complete interview');
      }
    } catch (error) {
      console.error('Complete interview error:', error);
      setError('Failed to complete interview. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteInterview = async () => {
    if (!sessionId || loading) return;

    const confirmed = window.confirm('Are you sure you want to complete this practice interview and get your evaluation?');
    if (!confirmed) return;

    await autoCompleteInterview();
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

  return (
    <div className="practice-page">
      <div className="container">
        {error && <div className="alert alert-error">{error}</div>}

        {step === 'selection' && (
          <>
            <div className="practice-header">
              <h1>Practice Interviews</h1>
              <p>Choose a role to practice interview questions without uploading a resume</p>
            </div>

            <div className="roles-grid">
              {roles.map((role, index) => (
                <div 
                  key={role.id} 
                  className="role-card slide-in"
                  style={{animationDelay: `${index * 0.1}s`}}
                >
                  <div className="role-icon">{role.icon}</div>
                  <h3>{role.name}</h3>
                  <p>{role.description}</p>
                  <div className="role-meta">
                    <span className="question-count">📝 {role.questions} questions</span>
                  </div>
                  <button 
                    className="btn btn-primary btn-block"
                    onClick={() => handleStartPractice(role)}
                    disabled={loading}
                  >
                    {loading && selectedRole?.id === role.id ? 'Starting...' : 'Start Practice'}
                  </button>
                </div>
              ))}
            </div>

            <div className="practice-info">
              <div className="info-card">
                <h3>💡 How Practice Mode Works</h3>
                <ul>
                  <li>No resume required - jump right in</li>
                  <li>5 easy questions per role</li>
                  <li>Answer at your own pace</li>
                  <li>Complete anytime - even after 1 question</li>
                  <li>Get instant feedback and suggestions</li>
                  <li>Session erased after completion (not saved)</li>
                </ul>
              </div>
            </div>
          </>
        )}

        {step === 'interview' && (
          <div className="interview-section">
            <div className="interview-header">
              <div>
                <h1>Practice Interview: {selectedRole?.name}</h1>
                <p className="subtitle">Answer the questions to the best of your ability</p>
              </div>
              <div className="interview-controls">
                <button 
                  onClick={handleCompleteInterview} 
                  className="btn btn-secondary"
                  disabled={loading || messages.length < 2}
                  title={messages.length < 2 ? 'Answer at least 1 question before completing' : 'Complete interview'}
                >
                  Complete Interview
                </button>
              </div>
            </div>

            <div className="chat-container">
              {messages.map((msg, index) => (
                <div key={index} className={`message ${msg.type}-message`}>
                  <div className="message-avatar">
                    {msg.type === 'ai' ? '🤖' : '👤'}
                  </div>
                  <div className="message-content">
                    <p>{msg.text}</p>
                  </div>
                </div>
              ))}

              {loading && (
                <div className="message ai-message">
                  <div className="message-avatar">🤖</div>
                  <div className="message-content">
                    <p className="typing">Thinking...</p>
                  </div>
                </div>
              )}

              <div className="message-input-container">
                <textarea
                  className="message-input"
                  placeholder="Type your answer here..."
                  rows="4"
                  value={currentAnswer}
                  onChange={(e) => setCurrentAnswer(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendAnswer();
                    }
                  }}
                  disabled={loading}
                ></textarea>
                <button 
                  className="btn btn-primary" 
                  onClick={handleSendAnswer}
                  disabled={loading || !currentAnswer.trim()}
                >
                  {loading ? 'Sending...' : 'Send Answer'}
                </button>
              </div>
            </div>
          </div>
        )}

        {step === 'results' && evaluation && (
          <div className="results-section">
            {/* Header */}
            <div className="results-header">
              <div>
                <h1>🎉 Practice Complete!</h1>
                <p className="interview-meta">
                  {selectedRole?.name} • {evaluation.questionsAnswered} questions answered
                </p>
              </div>
              <div className="header-actions">
                <button className="btn btn-primary" onClick={() => navigate('/practice')}>
                  Practice Again
                </button>
                <button className="btn btn-secondary" onClick={() => navigate('/dashboard')}>
                  Dashboard
                </button>
              </div>
            </div>

            {/* Overall Score */}
            <div className="score-section slide-in">
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
                      stroke={getScoreColor(evaluation.overallScore)}
                      strokeWidth="20"
                      strokeDasharray={`${evaluation.overallScore * 5.65} 565`}
                      strokeLinecap="round"
                      transform="rotate(-90 100 100)"
                    />
                  </svg>
                  <div className="score-text">
                    <div className="score-number">{evaluation.overallScore}</div>
                    <div className="score-label">{getScoreLabel(evaluation.overallScore)}</div>
                  </div>
                </div>
              </div>

              {/* Category Scores */}
              <div className="category-scores">
                <div className="score-item">
                  <div className="score-item-header">
                    <span className="score-item-icon">💬</span>
                    <span className="score-item-name">Communication</span>
                    <span className="score-item-value">{evaluation.scores.communication}</span>
                  </div>
                  <div className="score-bar">
                    <div 
                      className="score-bar-fill" 
                      style={{
                        width: `${evaluation.scores.communication}%`,
                        backgroundColor: getScoreColor(evaluation.scores.communication)
                      }}
                    ></div>
                  </div>
                </div>

                <div className="score-item">
                  <div className="score-item-header">
                    <span className="score-item-icon">🧠</span>
                    <span className="score-item-name">Technical Knowledge</span>
                    <span className="score-item-value">{evaluation.scores.technical}</span>
                  </div>
                  <div className="score-bar">
                    <div 
                      className="score-bar-fill" 
                      style={{
                        width: `${evaluation.scores.technical}%`,
                        backgroundColor: getScoreColor(evaluation.scores.technical)
                      }}
                    ></div>
                  </div>
                </div>

                <div className="score-item">
                  <div className="score-item-header">
                    <span className="score-item-icon">✨</span>
                    <span className="score-item-name">Clarity</span>
                    <span className="score-item-value">{evaluation.scores.clarity}</span>
                  </div>
                  <div className="score-bar">
                    <div 
                      className="score-bar-fill" 
                      style={{
                        width: `${evaluation.scores.clarity}%`,
                        backgroundColor: getScoreColor(evaluation.scores.clarity)
                      }}
                    ></div>
                  </div>
                </div>

                <div className="score-item">
                  <div className="score-item-header">
                    <span className="score-item-icon">💪</span>
                    <span className="score-item-name">Confidence</span>
                    <span className="score-item-value">{evaluation.scores.confidence}</span>
                  </div>
                  <div className="score-bar">
                    <div 
                      className="score-bar-fill" 
                      style={{
                        width: `${evaluation.scores.confidence}%`,
                        backgroundColor: getScoreColor(evaluation.scores.confidence)
                      }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>

            {/* AI Feedback */}
            <div className="feedback-section slide-in" style={{animationDelay: '0.1s'}}>
              <h2>📝 AI Evaluation</h2>
              <div className="feedback-card">
                <div className="feedback-content">
                  {evaluation.feedback}
                </div>
              </div>
            </div>

            {/* Suggestions */}
            <div className="suggestions-section slide-in" style={{animationDelay: '0.2s'}}>
              <h2>💡 Suggestions for Improvement</h2>
              <div className="suggestions-list">
                {evaluation.suggestions.map((suggestion, index) => (
                  <div key={index} className="suggestion-item">
                    <div className="suggestion-number">{index + 1}</div>
                    <div className="suggestion-text">{suggestion}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Next Steps */}
            <div className="next-steps-section slide-in" style={{animationDelay: '0.3s'}}>
              <h2>🚀 Next Steps</h2>
              <div className="next-steps-grid">
                <div className="next-step-card">
                  <div className="step-icon">🔄</div>
                  <h3>Practice More</h3>
                  <p>Try another role to broaden your skills</p>
                  <button className="btn btn-secondary" onClick={() => {
                    setStep('selection');
                    setMessages([]);
                    setEvaluation(null);
                    setSessionId(null);
                  }}>
                    Start New Practice
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
                  <h3>View Dashboard</h3>
                  <p>Track your interview history</p>
                  <button className="btn btn-secondary" onClick={() => navigate('/dashboard')}>
                    Go to Dashboard
                  </button>
                </div>
              </div>
            </div>

            <div className="practice-note slide-in" style={{animationDelay: '0.4s'}}>
              <p>ℹ️ This practice session has been erased and will not appear in your dashboard.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Practice;
