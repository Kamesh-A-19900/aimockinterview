import React, { useState, useEffect, useRef } from 'react';
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

  const chatEndRef = useRef(null);

  const roles = [
    { id: 'software-engineer',  name: 'Software Engineer',  icon: '⚙️', accent: '#6c63ff', difficulty: 'Medium', description: 'General software engineering questions covering algorithms, system design, and coding', questions: 5 },
    { id: 'frontend-developer', name: 'Frontend Developer', icon: '🎨', accent: '#ec4899', difficulty: 'Medium', description: 'Frontend development and UI/UX questions', questions: 5 },
    { id: 'backend-developer',  name: 'Backend Developer',  icon: '🛠️', accent: '#3b82f6', difficulty: 'Hard', description: 'Backend development and API design questions', questions: 5 },
    { id: 'data-scientist',     name: 'Data Scientist',     icon: '📊', accent: '#10b981', difficulty: 'Hard', description: 'Data science and machine learning focused questions', questions: 5 },
    { id: 'product-manager',    name: 'Product Manager',    icon: '🎯', accent: '#f59e0b', difficulty: 'Medium', description: 'Product management and strategy questions', questions: 5 },
    { id: 'devops-engineer',    name: 'DevOps Engineer',    icon: '🚀', accent: '#8b5cf6', difficulty: 'Hard', description: 'DevOps, CI/CD, and infrastructure questions', questions: 5 },
  ];

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, loading]);

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
        setMessages([{ type: 'ai', text: data.session.question }]);
        setStep('interview');
      } else {
        setError(data.message || 'Failed to start practice interview');
        setSelectedRole(null);
      }
    } catch (error) {
      console.error('Start practice error:', error);
      setError('Network error. Please try again.');
      setSelectedRole(null);
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

    setMessages(prev => [...prev, { type: 'user', text: userMessage }]);

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
          await autoCompleteInterview();
        } else {
          setMessages(prev => [...prev, { type: 'ai', text: data.question }]);
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

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      e.preventDefault();
      handleSendAnswer();
    }
  };

  return (
    <div className="practice-page">
      <div className="practice-inner">
        {error && <div className="alert alert-error" style={{marginBottom: '24px'}}>{error}</div>}

        {step === 'selection' && (
          <>
            <div className="practice-header">
              <h1 className="practice-title">Practice Interviews</h1>
              <p className="practice-subtitle">Choose a role to practice interview questions without uploading a resume</p>
            </div>

            <div className="roles-grid">
              {roles.map((role) => {
                const isSelected = selectedRole?.id === role.id;
                return (
                  <div 
                    key={role.id} 
                    className={`role-card ${isSelected ? 'selected' : ''}`}
                    style={{ '--card-accent': role.accent }}
                    onClick={() => handleStartPractice(role)}
                  >
                    {isSelected && <div className="selected-check">✓</div>}
                    <div className="role-card-top">
                      <div className="role-icon-wrap">{role.icon}</div>
                      <div className="role-difficulty">{role.difficulty}</div>
                    </div>
                    <div className="role-card-title">{role.name}</div>
                    <div className="role-card-desc">{role.description}</div>
                    <div className="role-card-tags">
                      <span className="role-tag">{role.questions} questions</span>
                    </div>
                  </div>
                );
              })}
            </div>
            
            <div style={{textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px'}}>
              <p>Click a role to immediately start your practice session.</p>
            </div>
          </>
        )}

        {step === 'interview' && (
          <div className="interview-container">
            <div className="interview-topbar">
              <div className="interview-topbar-title">Practice: {selectedRole?.name}</div>
              <button 
                onClick={handleCompleteInterview} 
                className="btn-secondary"
                disabled={loading || messages.length < 2}
              >
                Complete Early
              </button>
            </div>

            <div className="interview-chat">
              {messages.map((msg, index) => (
                <div key={index} className={msg.type === 'ai' ? 'message-ai' : 'message-user'}>
                  {msg.type === 'ai' && <div className="message-ai-avatar">🤖</div>}
                  <div className={msg.type === 'ai' ? 'message-ai-bubble' : 'message-user-bubble'}>
                    {msg.text}
                  </div>
                </div>
              ))}
              
              {loading && messages.length > 0 && messages[messages.length-1].type === 'user' && (
                <div className="message-ai">
                  <div className="message-ai-avatar">🤖</div>
                  <div className="message-ai-bubble">
                    <div className="thinking-dots">
                      <div className="thinking-dot"></div>
                      <div className="thinking-dot"></div>
                      <div className="thinking-dot"></div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            <div className="interview-input-bar">
              <textarea
                className="interview-textarea"
                placeholder="Type your answer here... (Ctrl+Enter to submit)"
                value={currentAnswer}
                onChange={(e) => setCurrentAnswer(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={loading}
              />
              <button 
                className="interview-submit-btn" 
                onClick={handleSendAnswer}
                disabled={loading || !currentAnswer.trim()}
                title="Send (Ctrl+Enter)"
              >
                ➤
              </button>
            </div>
          </div>
        )}

        {step === 'results' && evaluation && (
          <div className="results-card">
            <h2>Practice Complete</h2>
            <div className="results-score">{evaluation.overallScore}/100</div>
            
            <div className="results-feedback">
              {evaluation.feedback}
            </div>

            <div style={{marginTop: '32px', display: 'flex', gap: '16px', justifyContent: 'center'}}>
              <button className="btn-primary" onClick={() => {
                setStep('selection');
                setMessages([]);
                setEvaluation(null);
                setSessionId(null);
                setSelectedRole(null);
              }}>
                Practice Again
              </button>
              <button className="btn-secondary" onClick={() => navigate('/dashboard')}>
                Dashboard
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Practice;
