import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Interview.css';

function Interview() {
  const navigate = useNavigate();
  const [step, setStep] = useState('type-selection'); // type-selection, upload, guidelines, interview, results
  const [interviewType, setInterviewType] = useState(null); // resume, stress, aptitude
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [resumeData, setResumeData] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [currentAnswer, setCurrentAnswer] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [timeLimit, setTimeLimit] = useState(30); // minutes
  const [timeRemaining, setTimeRemaining] = useState(null);
  const [timerInterval, setTimerInterval] = useState(null);
  const [tabSwitchCount, setTabSwitchCount] = useState(0);
  const [isTerminating, setIsTerminating] = useState(false);
  const [guidelinesAccepted, setGuidelinesAccepted] = useState(false);

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

  // Security features during interview (NO FULLSCREEN)
  useEffect(() => {
    if (step === 'interview') {
      // Add interview-active class to body to hide navbar/footer
      document.body.classList.add('interview-active');

      // Warn before leaving page
      const handleBeforeUnload = (e) => {
        e.preventDefault();
        e.returnValue = 'Interview in progress. Are you sure you want to leave?';
        return e.returnValue;
      };

      // Prevent browser back button
      const handlePopState = (e) => {
        if (window.confirm('Interview in progress. Are you sure you want to leave?')) {
          return true;
        } else {
          window.history.pushState(null, '', window.location.pathname);
          e.preventDefault();
          return false;
        }
      };

      // Prevent copy/paste and keyboard shortcuts
      const handleKeyDown = (e) => {
        // Prevent Ctrl+C, Ctrl+V, Ctrl+X, Ctrl+A
        if ((e.ctrlKey || e.metaKey) && ['c', 'v', 'x', 'a'].includes(e.key.toLowerCase())) {
          e.preventDefault();
          return false;
        }
        // Prevent F12, Ctrl+Shift+I (DevTools)
        if (e.key === 'F12' || ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'I')) {
          e.preventDefault();
          return false;
        }
      };

      // Prevent right-click context menu
      const handleContextMenu = (e) => {
        e.preventDefault();
        return false;
      };

      // Prevent copy event
      const handleCopy = (e) => {
        e.preventDefault();
        return false;
      };

      // Prevent paste event
      const handlePaste = (e) => {
        // Allow paste only in textarea
        if (e.target.tagName !== 'TEXTAREA') {
          e.preventDefault();
          return false;
        }
      };

      // Prevent cut event
      const handleCut = (e) => {
        e.preventDefault();
        return false;
      };

      // Add event listeners
      window.addEventListener('beforeunload', handleBeforeUnload);
      window.history.pushState(null, '', window.location.pathname);
      window.addEventListener('popstate', handlePopState);
      document.addEventListener('keydown', handleKeyDown);
      document.addEventListener('contextmenu', handleContextMenu);
      document.addEventListener('copy', handleCopy);
      document.addEventListener('paste', handlePaste);
      document.addEventListener('cut', handleCut);

      // Cleanup
      return () => {
        // Remove interview-active class from body
        document.body.classList.remove('interview-active');
        
        window.removeEventListener('beforeunload', handleBeforeUnload);
        window.removeEventListener('popstate', handlePopState);
        document.removeEventListener('keydown', handleKeyDown);
        document.removeEventListener('contextmenu', handleContextMenu);
        document.removeEventListener('copy', handleCopy);
        document.removeEventListener('paste', handlePaste);
        document.removeEventListener('cut', handleCut);
      };
    }
  }, [step]);

  // Detect tab visibility change - WARNING FIRST
  useEffect(() => {
    if (step === 'interview' && !isTerminating) {
      const handleVisibilityChange = async () => {
        if (document.hidden) {
          // User switched tabs - show warning dialog
          const userChoice = window.confirm(
            '⚠️ TAB SWITCHING DETECTED!\n\n' +
            'You switched away from the interview tab. This is against interview rules.\n\n' +
            'Click "OK" to CONTINUE the interview\n' +
            'Click "Cancel" to LEAVE and terminate the interview\n\n' +
            'Note: If you leave, your interview will be deleted and not saved.'
          );

          if (!userChoice) {
            // User chose to leave - terminate interview
            setIsTerminating(true);
            
            // Remove interview-active class from body
            document.body.classList.remove('interview-active');
            
            // Clear timer
            if (timerInterval) {
              clearInterval(timerInterval);
            }

            // Show toast notification
            showToast('Interview terminated. Redirecting to dashboard...', 'info');

            // Call backend to delete the interview
            try {
              const token = localStorage.getItem('token');
              await fetch(`http://localhost:5000/api/interview/${sessionId}/terminate`, {
                method: 'DELETE',
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json'
                }
              });
            } catch (error) {
              console.error('Failed to delete interview:', error);
            }

            // Redirect to dashboard
            setTimeout(() => {
              navigate('/dashboard');
            }, 1500);
          } else {
            // User chose to continue - just show a warning
            showToast('⚠️ Warning: Please stay on this tab during the interview', 'warning');
          }
        }
      };

      document.addEventListener('visibilitychange', handleVisibilityChange);

      return () => {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      };
    }
  }, [step, sessionId, timerInterval, navigate, isTerminating]);

  // Timer management
  useEffect(() => {
    if (step === 'interview' && timeRemaining !== null) {
      const interval = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            clearInterval(interval);
            handleTimeUp();
            return 0;
          }
          
          // Warnings at specific times
          if (prev === 300) { // 5 minutes
            alert('⏰ 5 minutes remaining!');
          } else if (prev === 60) { // 1 minute
            alert('⏰ 1 minute remaining!');
          }
          
          return prev - 1;
        });
      }, 1000);

      setTimerInterval(interval);

      return () => {
        if (interval) clearInterval(interval);
      };
    }
  }, [step, timeRemaining]);

  const handleTimeUp = async () => {
    alert('⏰ Time is up! Your interview will be completed automatically.');
    await handleCompleteInterview();
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getTimeColor = () => {
    if (!timeRemaining) return '#48bb78';
    const percentage = (timeRemaining / (timeLimit * 60)) * 100;
    if (percentage > 50) return '#48bb78'; // green
    if (percentage > 25) return '#ed8936'; // orange
    return '#f56565'; // red
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile && selectedFile.type === 'application/pdf') {
      setFile(selectedFile);
    } else {
      alert('Please select a PDF file');
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    setError('');
    const formData = new FormData();
    formData.append('resume', file);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/resume/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const data = await response.json();

      if (data.success) {
        setResumeData(data.resume);
        // Go to guidelines step instead of starting interview directly
        setStep('guidelines');
      } else {
        setError(data.message || 'Upload failed');
      }
    } catch (error) {
      setError('Network error. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleAcceptGuidelines = async () => {
    if (!guidelinesAccepted) {
      setError('Please accept the guidelines to proceed');
      return;
    }
    // Start interview session
    await startInterview(resumeData.id);
  };

  const handleBackToUpload = () => {
    setStep('upload');
    setGuidelinesAccepted(false);
    setError('');
  };

  const startInterview = async (resumeId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/interview/start', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ resumeId })
      });

      const data = await response.json();

      if (data.success) {
        setSessionId(data.session.id);
        // Store session ID in localStorage for VoiceRecorder
        localStorage.setItem('currentSessionId', data.session.id);
        setMessages([{
          type: 'ai',
          text: data.session.question
        }]);
        setTimeRemaining(timeLimit * 60); // Convert minutes to seconds
        setStep('interview');
      } else {
        setError(data.message || 'Failed to start interview');
      }
    } catch (error) {
      setError('Failed to start interview. Please try again.');
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
      
      const response = await fetch(`http://localhost:5000/api/interview/${sessionId}/answer`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ answer: userMessage })
      });

      const data = await response.json();

      if (data.success) {
        // Add AI response
        setMessages(prev => [...prev, {
          type: 'ai',
          text: data.question
        }]);
      } else {
        setError(data.message || 'Failed to get response');
      }
    } catch (error) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteInterview = async () => {
    if (!sessionId) return;

    // Clear timer
    if (timerInterval) {
      clearInterval(timerInterval);
    }

    // Remove interview-active class from body
    document.body.classList.remove('interview-active');

    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      
      const response = await fetch(`http://localhost:5000/api/interview/${sessionId}/complete`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (data.success) {
        // Redirect to dashboard to see results
        navigate('/dashboard');
      } else {
        setError(data.message || 'Failed to complete interview');
      }
    } catch (error) {
      setError('Failed to complete interview. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Interview type selection handlers
  const handleSelectType = (type) => {
    console.log('Selected interview type:', type);
    setInterviewType(type);
    setError('');
    
    // Directly proceed to next step when card is clicked
    if (type === 'resume') {
      console.log('Going to resume upload step');
      setStep('upload');
    } else if (type === 'stress') {
      setError('Stress interviews coming soon!');
    } else if (type === 'aptitude') {
      setError('Aptitude tests coming soon!');
    }
  };

  return (
    <div className={`interview-page ${step === 'interview' ? 'interview-active' : ''}`}>
      {error && <div className="alert alert-error" style={{ maxWidth: '1400px', margin: '0 auto 20px' }}>{error}</div>}
      
      {step === 'type-selection' && (
        <div className="container">
          <div className="type-selection-section">
            <h1>Choose Your Interview Type</h1>
            <p className="subtitle">Select the type of interview you want to practice</p>

            <div className="interview-types-grid">
              <div
                className={`interview-type-card ${interviewType === 'resume' ? 'selected' : ''}`}
                onClick={() => handleSelectType('resume')}
              >
                <div className="card-icon">📄</div>
                <h3>Resume-Based Interview</h3>
                <p className="card-description">Personalized interview based on your resume and experience</p>
                <div className="card-meta">
                  <div className="meta-item"><span className="meta-icon">⏱️</span><span>30-120 minutes</span></div>
                  <div className="meta-item"><span className="meta-icon">📊</span><span>Intermediate</span></div>
                </div>
                <div className="card-features">
                  <div className="feature-item"><span className="feature-check">✓</span><span>Resume upload</span></div>
                  <div className="feature-item"><span className="feature-check">✓</span><span>Project questions</span></div>
                  <div className="feature-item"><span className="feature-check">✓</span><span>STAR method</span></div>
                  <div className="feature-item"><span className="feature-check">✓</span><span>AI-powered</span></div>
                </div>
              </div>

              <div className="interview-type-card disabled">
                <div className="coming-soon-badge">Coming Soon</div>
                <div className="card-icon">💻</div>
                <h3>Coding Interview</h3>
                <p className="card-description">Technical coding assessment with algorithm problems</p>
                <div className="card-meta">
                  <div className="meta-item"><span className="meta-icon">⏱️</span><span>30-90 minutes</span></div>
                  <div className="meta-item"><span className="meta-icon">📊</span><span>Technical</span></div>
                </div>
                <div className="card-features">
                  <div className="feature-item"><span className="feature-check">✓</span><span>8 languages</span></div>
                  <div className="feature-item"><span className="feature-check">✓</span><span>Progressive difficulty</span></div>
                  <div className="feature-item"><span className="feature-check">✓</span><span>Code optimization</span></div>
                  <div className="feature-item"><span className="feature-check">✓</span><span>Complexity analysis</span></div>
                </div>
              </div>

              <div className="interview-type-card disabled">
                <div className="coming-soon-badge">Coming Soon</div>
                <div className="card-icon">⚡</div>
                <h3>Stress Interview</h3>
                <p className="card-description">High-pressure interview to test composure and adaptability</p>
                <div className="card-meta">
                  <div className="meta-item"><span className="meta-icon">⏱️</span><span>20-40 minutes</span></div>
                  <div className="meta-item"><span className="meta-icon">📊</span><span>Advanced</span></div>
                </div>
                <div className="card-features">
                  <div className="feature-item"><span className="feature-check">✓</span><span>Rapid-fire questions</span></div>
                  <div className="feature-item"><span className="feature-check">✓</span><span>Ethical dilemmas</span></div>
                  <div className="feature-item"><span className="feature-check">✓</span><span>Pressure scenarios</span></div>
                  <div className="feature-item"><span className="feature-check">✓</span><span>Composure testing</span></div>
                </div>
              </div>

              <div className="interview-type-card disabled">
                <div className="coming-soon-badge">Coming Soon</div>
                <div className="card-icon">🧠</div>
                <h3>Aptitude Test</h3>
                <p className="card-description">Logical reasoning and quantitative aptitude assessment</p>
                <div className="card-meta">
                  <div className="meta-item"><span className="meta-icon">⏱️</span><span>45-60 minutes</span></div>
                  <div className="meta-item"><span className="meta-icon">📊</span><span>Intermediate</span></div>
                </div>
                <div className="card-features">
                  <div className="feature-item"><span className="feature-check">✓</span><span>Logical reasoning</span></div>
                  <div className="feature-item"><span className="feature-check">✓</span><span>Quantitative aptitude</span></div>
                  <div className="feature-item"><span className="feature-check">✓</span><span>Verbal reasoning</span></div>
                  <div className="feature-item"><span className="feature-check">✓</span><span>Timed questions</span></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {step === 'upload' && (
        <div className="container-small">
          <div className="upload-section">
            <h1>Upload Your Resume</h1>
            <p className="subtitle">Upload your resume to get personalized interview questions</p>

            <div className="upload-card">
              <div className="upload-icon">📄</div>
              <h3>Drag and drop your resume here</h3>
              <p>or click to browse (PDF only, max 3 pages)</p>
              
              <input
                type="file"
                accept=".pdf"
                onChange={handleFileChange}
                className="file-input"
                id="resume-upload"
              />
              <label htmlFor="resume-upload" className="btn btn-secondary">
                Choose File
              </label>

              {file && (
                <div className="file-selected">
                  <p>✓ {file.name}</p>
                  <button 
                    onClick={handleUpload} 
                    className="btn btn-primary"
                    disabled={uploading}
                  >
                    {uploading ? 'Processing...' : 'Continue'}
                  </button>
                </div>
              )}
            </div>

            <div className="upload-info">
              <h4>Requirements:</h4>
              <ul>
                <li>PDF format only</li>
                <li>Maximum 3 pages</li>
                <li>Clear, readable text</li>
                <li>Must contain resume content (experience, education, skills)</li>
              </ul>
            </div>

            <div className="time-selection">
              <h4>⏱️ Select Interview Duration:</h4>
              <div className="time-options">
                <button 
                  className={`time-option ${timeLimit === 30 ? 'active' : ''}`}
                  onClick={() => setTimeLimit(30)}
                >
                  <div className="time-value">30</div>
                  <div className="time-label">Minutes</div>
                </button>
                <button 
                  className={`time-option ${timeLimit === 60 ? 'active' : ''}`}
                  onClick={() => setTimeLimit(60)}
                >
                  <div className="time-value">60</div>
                  <div className="time-label">Minutes</div>
                </button>
                <button 
                  className={`time-option ${timeLimit === 120 ? 'active' : ''}`}
                  onClick={() => setTimeLimit(120)}
                >
                  <div className="time-value">120</div>
                  <div className="time-label">Minutes</div>
                </button>
              </div>
            </div>

            <div className="upload-actions">
              <button 
                onClick={() => setStep('type-selection')} 
                className="btn btn-secondary"
              >
                ← Back
              </button>
            </div>
          </div>
        </div>
      )}

      {step === 'guidelines' && (
        <div className="container-small">
          <div className="guidelines-section">
            <h1>📋 Interview Guidelines</h1>
            <p className="subtitle">Please read and accept the following guidelines before starting your interview</p>

            <div className="guidelines-card">
              <div className="guideline-item-large">
                <span className="guideline-icon-large">✅</span>
                <div>
                  <h3>Be Specific and Detailed</h3>
                  <p>Provide detailed answers with concrete examples, metrics, and specific technologies. Use the STAR method (Situation, Task, Action, Result) for behavioral questions.</p>
                </div>
              </div>

              <div className="guideline-item-large">
                <span className="guideline-icon-large">⏱️</span>
                <div>
                  <h3>Time Management</h3>
                  <p>You have selected {timeLimit} minutes for this interview. Keep track of time and pace your responses accordingly. The timer will be visible during the interview.</p>
                </div>
              </div>

              <div className="guideline-item-large">
                <span className="guideline-icon-large">🎯</span>
                <div>
                  <h3>Stay Focused</h3>
                  <p>Answer questions directly and stay on topic. Provide relevant information that addresses what is being asked.</p>
                </div>
              </div>

              <div className="guideline-item-large">
                <span className="guideline-icon-large">🔒</span>
                <div>
                  <h3>Security Features</h3>
                  <p>Copy/paste and right-click are disabled during the interview to maintain integrity. You can only type your answers.</p>
                </div>
              </div>

              <div className="guideline-item-large warning">
                <span className="guideline-icon-large">⚠️</span>
                <div>
                  <h3>Tab Switching Policy</h3>
                  <p><strong>Important:</strong> If you switch tabs or windows during the interview, you will receive a warning. If you choose to leave, your interview will be terminated and deleted without being saved.</p>
                </div>
              </div>

              <div className="guideline-item-large">
                <span className="guideline-icon-large">💡</span>
                <div>
                  <h3>Best Practices</h3>
                  <p>Think before you answer, be honest about your experience, and don't hesitate to ask for clarification if needed.</p>
                </div>
              </div>
            </div>

            <div className="guidelines-acceptance">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={guidelinesAccepted}
                  onChange={(e) => setGuidelinesAccepted(e.target.checked)}
                />
                <span>I have read and accept the interview guidelines</span>
              </label>
            </div>

            <div className="guidelines-actions">
              <button 
                onClick={handleBackToUpload} 
                className="btn btn-secondary"
              >
                ← Back
              </button>
              <button 
                onClick={handleAcceptGuidelines} 
                className="btn btn-primary"
                disabled={!guidelinesAccepted}
              >
                Proceed to Interview →
              </button>
            </div>
          </div>
        </div>
      )}

      {step === 'interview' && (
        <div className="container-fullscreen">
          <div className="interview-section">
            <div className="interview-header">
              <div>
                <h1>Interview in Progress</h1>
                <p className="subtitle">Answer the questions to the best of your ability</p>
              </div>
              <div className="interview-controls">
                {timeRemaining !== null && (
                  <div className="timer" style={{ color: getTimeColor() }}>
                    <span className="timer-icon">⏱️</span>
                    <span className="timer-value">{formatTime(timeRemaining)}</span>
                  </div>
                )}
                <button 
                  onClick={handleCompleteInterview} 
                  className="btn btn-secondary"
                  disabled={loading || messages.length < 4}
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
        </div>
      )}
    </div>
  );
}

export default Interview;
