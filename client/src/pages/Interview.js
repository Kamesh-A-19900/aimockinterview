import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import './Interview.css';

function Interview() {
  const navigate = useNavigate();
  const [step, setStep] = useState('type-selection'); 
  const [interviewType, setInterviewType] = useState(null); 
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [resumeData, setResumeData] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [currentAnswer, setCurrentAnswer] = useState('');
  const [startingInterview, setStartingInterview] = useState(false);
  const [submittingAnswer, setSubmittingAnswer] = useState(false);
  const [completingInterview, setCompletingInterview] = useState(false);
  const [error, setError] = useState('');
  const [timeLimit, setTimeLimit] = useState(15); 
  const [timeRemaining, setTimeRemaining] = useState(null);
  const [timerInterval, setTimerInterval] = useState(null);
  const [isTerminating, setIsTerminating] = useState(false);
  const [guidelinesAccepted, setGuidelinesAccepted] = useState(false);
  const [fullscreenFailed, setFullscreenFailed] = useState(false);

  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
    // Auto-focus textarea when AI finishes responding or when interview starts
    if (!submittingAnswer && step === 'interview' && textareaRef.current) {
      // Use a longer timeout to ensure DOM is fully updated
      setTimeout(() => {
        if (textareaRef.current && !document.activeElement?.classList.contains('interview-textarea')) {
          textareaRef.current.focus();
        }
      }, 200);
    }
  }, [messages, submittingAnswer, step]);

  const handleTerminateInterview = async () => {
    if (isTerminating) return; // Prevent multiple calls
    
    setIsTerminating(true);
    if (timerInterval) clearInterval(timerInterval);
    
    // Show terminating message
    setMessages(prev => [...prev, { type: 'system', text: 'Terminating interview...' }]);
    
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      }
    } catch (err) {}

    try {
      const token = localStorage.getItem('token');
      await fetch(`http://localhost:5000/api/interview/${sessionId}/terminate`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
    } catch (error) {}
    
    // Show terminated message briefly before navigating
    setMessages(prev => [...prev, { type: 'system', text: 'Interview terminated.' }]);
    
    // Force navigation after a short delay
    setTimeout(() => {
      navigate('/dashboard', { replace: true });
    }, 1000);
  };

  useEffect(() => {
    if (step === 'interview') {
      const handleBeforeUnload = (e) => {
        e.preventDefault();
        e.returnValue = 'Interview in progress. Are you sure you want to leave?';
        return e.returnValue;
      };

      const handlePopState = (e) => {
        if (window.confirm('Interview in progress. Are you sure you want to leave?')) {
          return true;
        } else {
          window.history.pushState(null, '', window.location.pathname);
          e.preventDefault();
          return false;
        }
      };

      const handleKeyDown = (e) => {
        // Block copy/paste/cut shortcuts
        if ((e.ctrlKey || e.metaKey) && ['c', 'v', 'x', 'a'].includes(e.key.toLowerCase())) {
          e.preventDefault();
          return false;
        }
        // Block F12 and developer tools
        if (e.key === 'F12' || ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'I')) {
          e.preventDefault();
          return false;
        }
        // Block Alt+Tab and Ctrl+Tab functionality
        if ((e.altKey && e.key === 'Tab') || (e.ctrlKey && e.key === 'Tab')) {
          e.preventDefault();
          return false;
        }
        // ESC key terminates interview without warning
        if (e.key === 'Escape') {
          e.preventDefault();
          e.stopPropagation();
          console.log('ESC pressed - terminating interview');
          // Inline termination logic to avoid dependency issues
          if (!isTerminating) {
            setIsTerminating(true);
            if (timerInterval) clearInterval(timerInterval);
            
            // Show terminating message
            setMessages(prev => [...prev, { type: 'system', text: 'Terminating interview...' }]);
            
            setTimeout(async () => {
              try {
                if (document.fullscreenElement) {
                  await document.exitFullscreen();
                }
              } catch (err) {}

              try {
                const token = localStorage.getItem('token');
                const currentSessionId = localStorage.getItem('currentSessionId');
                if (currentSessionId) {
                  await fetch(`http://localhost:5000/api/interview/${currentSessionId}/terminate`, {
                    method: 'DELETE',
                    headers: {
                      'Authorization': `Bearer ${token}`,
                      'Content-Type': 'application/json'
                    }
                  });
                }
              } catch (error) {}
              
              // Show terminated message briefly before navigating
              setMessages(prev => [...prev, { type: 'system', text: 'Interview terminated.' }]);
              
              // Force navigation
              setTimeout(() => {
                window.location.href = '/dashboard';
              }, 1000);
            }, 100);
          }
          return false;
        }
      };

      // Handle fullscreen changes (when user presses ESC to exit fullscreen)
      const handleFullscreenChange = () => {
        if (!document.fullscreenElement) {
          // User exited fullscreen - no warning needed
          setFullscreenFailed(false);
        } else {
          setFullscreenFailed(false);
        }
      };

      const handleContextMenu = (e) => { e.preventDefault(); return false; };
      const handleCopy = (e) => { e.preventDefault(); return false; };
      const handlePaste = (e) => { if (e.target.tagName !== 'TEXTAREA') { e.preventDefault(); return false; } };
      const handleCut = (e) => { e.preventDefault(); return false; };

      window.addEventListener('beforeunload', handleBeforeUnload);
      window.history.pushState(null, '', window.location.pathname);
      window.addEventListener('popstate', handlePopState);
      document.addEventListener('keydown', handleKeyDown);
      document.addEventListener('fullscreenchange', handleFullscreenChange);
      document.addEventListener('contextmenu', handleContextMenu);
      document.addEventListener('copy', handleCopy);
      document.addEventListener('paste', handlePaste);
      document.addEventListener('cut', handleCut);

      return () => {
        window.removeEventListener('beforeunload', handleBeforeUnload);
        window.removeEventListener('popstate', handlePopState);
        document.removeEventListener('keydown', handleKeyDown);
        document.removeEventListener('fullscreenchange', handleFullscreenChange);
        document.removeEventListener('contextmenu', handleContextMenu);
        document.removeEventListener('copy', handleCopy);
        document.removeEventListener('paste', handlePaste);
        document.removeEventListener('cut', handleCut);
      };
    }
  }, [step, handleTerminateInterview]);

  useEffect(() => {
    if (step === 'interview' && timeRemaining !== null && timeRemaining > 0) {
      console.log('Starting timer with', timeRemaining, 'seconds');
      const interval = setInterval(() => {
        setTimeRemaining(prev => {
          console.log('Timer tick:', prev);
          if (prev <= 1) {
            clearInterval(interval);
            console.log('Time up! Completing interview');
            // Call handleCompleteInterview directly without dependency issues
            setTimeout(async () => {
              alert('⏰ Time is up! Your interview will be completed automatically.');
              // Inline the completion logic to avoid dependency issues
              try {
                if (document.fullscreenElement) {
                  await document.exitFullscreen();
                }
              } catch (err) {}

              try {
                const token = localStorage.getItem('token');
                const currentSessionId = localStorage.getItem('currentSessionId');
                if (currentSessionId) {
                  const response = await fetch(`http://localhost:5000/api/interview/${currentSessionId}/complete`, {
                    method: 'POST',
                    headers: {
                      'Authorization': `Bearer ${token}`,
                      'Content-Type': 'application/json'
                    }
                  });
                  const data = await response.json();
                  if (data.success) {
                    window.location.href = '/dashboard';
                  }
                }
              } catch (error) {
                console.error('Failed to complete interview:', error);
                window.location.href = '/dashboard';
              }
            }, 100);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      setTimerInterval(interval);
      return () => {
        console.log('Cleaning up timer interval');
        clearInterval(interval);
      };
    }
  }, [step, timeRemaining]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile && selectedFile.type === 'application/pdf') {
       if (selectedFile.size > 5 * 1024 * 1024) {
         setError('File too large. Max 5MB allowed.');
         return;
       }
       setFile(selectedFile);
       setError('');
    } else {
      setError('Please select a PDF file');
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError("Please select a file to upload.");
      return;
    }
    setUploading(true);
    setError('');
    const formData = new FormData();
    formData.append('resume', file);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/resume/upload', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      const data = await response.json();
      if (data.success) {
        setResumeData(data.resume);
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

  const attemptFullscreen = async () => {
    try {
      if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
        setFullscreenFailed(false);
      }
    } catch (err) {
      console.warn("Fullscreen failed or blocked:", err);
      setFullscreenFailed(true);
    }
  };

  const handleAcceptGuidelines = async () => {
    if (!guidelinesAccepted) {
      setError('Please accept the guidelines to proceed');
      return;
    }
    
    setStartingInterview(true);
    await attemptFullscreen();
    await startInterview(resumeData.id);
    setStartingInterview(false);
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
        localStorage.setItem('currentSessionId', data.session.id);
        setMessages([{ type: 'ai', text: data.session.question }]);
        const timerSeconds = timeLimit * 60;
        console.log('Setting timer to', timerSeconds, 'seconds');
        setTimeRemaining(timerSeconds);
        setStep('interview');
        
        // Auto-focus textarea when interview starts - improved timing
        setTimeout(() => {
          if (textareaRef.current) {
            textareaRef.current.focus();
            textareaRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 800);
      } else {
        setError(data.message || 'Failed to start interview');
      }
    } catch (error) {
      setError('Failed to start interview. Please try again.');
    }
  };

  const handleSendAnswer = async () => {
    if (!currentAnswer.trim() || submittingAnswer) return;
    const userMessage = currentAnswer.trim();
    setCurrentAnswer('');
    setSubmittingAnswer(true);
    setError('');

    setMessages(prev => [...prev, { type: 'user', text: userMessage }]);

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
        setMessages(prev => [...prev, { type: 'ai', text: data.question }]);
      } else {
        setError(data.message || 'Failed to get response');
      }
    } catch (error) {
      setError('Network error. Please try again.');
    } finally {
      setSubmittingAnswer(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSendAnswer();
    }
  };

  const handleCompleteInterview = async () => {
    if (!sessionId) return;
    if (timerInterval) clearInterval(timerInterval);
    
    setCompletingInterview(true);
    
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      }
    } catch (err) {}

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
        navigate('/dashboard');
      } else {
        setError(data.message || 'Failed to complete interview');
      }
    } catch (error) {
      setError('Failed to complete interview. Please try again.');
    } finally {
      setCompletingInterview(false);
    }
  };

  return (
    <div className={`interview-page ${step === 'interview' ? 'fullscreen-mode' : ''}`}>
      <div className="interview-inner" style={{...(step === 'interview' && { maxWidth: '1400px', margin: '0', zIndex: 9999, position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'var(--bg-base)', padding: '0 24px', paddingTop: fullscreenFailed ? '80px' : '0' })}}>
        
        {step === 'interview' && (
          <div className="interview-fullscreen-banner">
            <h2>MockInterview<span style={{color: 'var(--brand)'}}>AI</span> Session</h2>
            <div style={{display: 'flex', alignItems: 'center', gap: '16px'}}>
               <span className="interview-timer" style={{color: timeRemaining < 60 ? 'var(--accent-red)' : 'var(--text-primary)'}}>
                 {timeRemaining !== null ? formatTime(timeRemaining) : '--:--'}
               </span>
               <button 
                 onClick={handleCompleteInterview} 
                 className="btn-secondary" 
                 style={{padding: '6px 16px', fontSize: '13px'}}
                 disabled={completingInterview}
               >
                 {completingInterview ? 'Ending...' : 'End'}
               </button>
            </div>
          </div>
        )}

        {error && step !== 'interview' && <div className="alert alert-error">{error}</div>}

        {step === 'type-selection' && (
          <div>
            <div className="interview-header">
              <h1 className="interview-title">Choose Interview Type</h1>
              <p className="interview-subtitle">Select the context format you want to practice</p>
            </div>

            <div className="selection-grid">
              <div
                className={`type-card ${interviewType === 'resume' ? 'selected' : ''}`}
                onClick={() => { setInterviewType('resume'); setStep('upload'); }}
              >
                <div className="type-card-icon">📄</div>
                <div className="type-card-title">Resume-Based</div>
                <div className="type-card-desc">Personalized AI interrogation based on your uploaded resume and experience track record.</div>
              </div>

              <div className="type-card disabled">
                <div className="type-card-badge">Soon</div>
                <div className="type-card-icon">💻</div>
                <div className="type-card-title">Coding Challenge</div>
                <div className="type-card-desc">Technical scenarios involving algorithms and data structures.</div>
              </div>

              <div className="type-card disabled">
                <div className="type-card-badge">Soon</div>
                <div className="type-card-icon">⚡</div>
                <div className="type-card-title">Stress Test</div>
                <div className="type-card-desc">Rapid fire high-pressure scenarios to test emotional composure.</div>
              </div>
            </div>
          </div>
        )}

        {step === 'upload' && (
          <div>
            <div className="interview-header">
              <h1 className="interview-title">Upload Resume</h1>
              <p className="interview-subtitle">Provide your PDF resume for AI parsing</p>
            </div>

            <div className="generic-card">
              <input type="file" accept=".pdf" id="resume-upload" style={{display: 'none'}} onChange={handleFileChange} />
              <label htmlFor="resume-upload">
                <div className="upload-zone" style={{ borderColor: file ? 'var(--brand)' : '' }}>
                  <div className="upload-zone-icon">📄</div>
                  <div className="upload-zone-text">
                    {file ? file.name : 'Click to browse. PDF only (max 5MB)'}
                  </div>
                </div>
              </label>
              
              <div style={{marginTop: '24px'}}>
                <h3 style={{fontSize: '15px', marginBottom: '8px'}}>Interview Duration</h3>
                <div style={{
                  padding: '12px 16px',
                  backgroundColor: '#f8f9fa',
                  border: '2px solid #007bff',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#007bff'
                }}>
                  ⏱️ 15 minutes
                </div>
              </div>

              <div style={{marginTop: '32px', display: 'flex', gap: '12px'}}>
                <button className="btn-secondary" onClick={() => setStep('type-selection')}>Back</button>
                <button className="btn-primary" onClick={handleUpload} disabled={uploading || !file}>
                  {uploading ? 'Processing...' : 'Continue'}
                </button>
              </div>
            </div>
          </div>
        )}

        {step === 'guidelines' && (
          <div>
            <div className="interview-header">
              <h1 className="interview-title">Guidelines</h1>
              <p className="interview-subtitle">Review before starting the timer</p>
            </div>

            <div className="generic-card">
              <div className="guideline-item">
                 <div className="guideline-icon">⏱️</div>
                 <div>
                   <div className="guideline-title">Time Management</div>
                   <div className="guideline-desc">You selected {timeLimit} minutes. Monitor your timer closely.</div>
                 </div>
              </div>
              <div className="guideline-item">
                 <div className="guideline-icon">✍️</div>
                 <div>
                   <div className="guideline-title">Language Quality</div>
                   <div className="guideline-desc">Use proper spelling and grammar in your responses. Clear, well-written answers help our AI provide better questions and more accurate evaluations.</div>
                 </div>
              </div>
              <div className="guideline-item">
                 <div className="guideline-icon">🔒</div>
                 <div>
                   <div className="guideline-title">Anti-Cheating Active</div>
                   <div className="guideline-desc">Copy/paste functionality is disabled. Press ESC to terminate interview.</div>
                 </div>
              </div>
              <div className="guideline-item" style={{borderBottom: 'none'}}>
                 <div className="guideline-icon">🪟</div>
                 <div>
                   <div className="guideline-title">Fullscreen Mode</div>
                   <div className="guideline-desc">The interview runs in fullscreen to block out distractions.</div>
                 </div>
              </div>

              <label className="checkbox-label" style={{marginTop: '24px'}}>
                <input type="checkbox" checked={guidelinesAccepted} onChange={e => setGuidelinesAccepted(e.target.checked)} />
                <span>I agree to these conditions</span>
              </label>

              <div style={{display: 'flex', gap: '12px'}}>
                <button className="btn-secondary" onClick={() => setStep('upload')}>Back</button>
                <button 
                  className="btn-primary" 
                  onClick={handleAcceptGuidelines} 
                  disabled={!guidelinesAccepted || startingInterview}
                >
                  {startingInterview ? 'Starting...' : 'Start Interview'}
                </button>
              </div>
            </div>
          </div>
        )}

        {step === 'interview' && error && (
          <div className="alert alert-error" style={{marginTop: '20px'}}>
            {error}
          </div>
        )}

        {step === 'interview' && (
          <div className="interview-chat-wrapper">
             <div className="interview-messages">
               {messages.map((msg, i) => (
                 <div key={i} className={
                   msg.type === 'ai' ? 'message-ai' : 
                   msg.type === 'system' ? 'message-system' : 
                   'message-user'
                 }>
                    {msg.type === 'ai' && <div className="message-ai-avatar">🤖</div>}
                    {msg.type === 'system' && <div className="message-system-avatar">⚠️</div>}
                    <div className={
                      msg.type === 'ai' ? 'message-ai-bubble' : 
                      msg.type === 'system' ? 'message-system-bubble' : 
                      'message-user-bubble'
                    }>
                      {msg.text}
                    </div>
                 </div>
               ))}
               
               {submittingAnswer && messages.length > 0 && messages[messages.length-1].type === 'user' && (
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
               <div ref={messagesEndRef} />
             </div>

             <div className="interview-input-bar">
               <textarea 
                 ref={textareaRef}
                 className="interview-textarea"
                 placeholder="Type your answer... (Press Ctrl+Enter to submit)"
                 value={currentAnswer}
                 onChange={e => setCurrentAnswer(e.target.value)}
                 onKeyDown={handleKeyDown}
                 disabled={submittingAnswer}
                 autoFocus
               />
               <button 
                 className="interview-submit-btn"
                 onClick={handleSendAnswer}
                 disabled={submittingAnswer || !currentAnswer.trim()}
                 title="Send (Ctrl+Enter)"
               >
                 {submittingAnswer ? '...' : '➤'}
               </button>
             </div>
          </div>
        )}

      </div>
    </div>
  );
}

export default Interview;
