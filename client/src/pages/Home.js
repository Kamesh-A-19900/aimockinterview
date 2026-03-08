import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './Home.css';
import logoImage from '../assets/logo.png';

function Home() {
  const navigate = useNavigate();
  const isLoggedIn = !!localStorage.getItem('token');
  
  const handleStartTrial = (e) => {
    e.preventDefault();
    if (isLoggedIn) {
      navigate('/dashboard');
    } else {
      navigate('/signup');
    }
  };

  return (
    <div className="home-page">
      {/* Hero Section */}
      <section className="hero">
        <div className="hero-glow-1"></div>
        <div className="hero-content">
          <div className="hero-logo">
            <img 
              src={logoImage} 
              alt="MockInterviewAI" 
              className="logo-image"
              onError={(e) => {
                console.error('Logo failed to load:', e);
                e.target.style.display = 'none';
              }}
              onLoad={() => console.log('Logo loaded successfully')}
            />
          </div>
          <span className="hero-badge">
            <span className="hero-badge-dot" />
            AI-Powered Interview Training
          </span>
          <h1 className="hero-headline">
            Ace your next interview<br />
            with <span className="hero-headline-highlight">real AI pressure</span>
          </h1>
          <p className="hero-subtext">
            Practice with an AI that actually challenges you — personalized questions from your resume, deep technical probing, and honest scoring.
          </p>
          <div className="hero-actions">
            <button onClick={handleStartTrial} className="btn-primary">
              {isLoggedIn ? 'Go to Dashboard' : 'Start Free Trial'}
            </button>
            <Link to="/practice" className="btn-secondary">
              Try Practice Mode
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features-section">
        <div className="section-label">Features</div>
        <h2 className="section-title">Everything you need to succeed</h2>
        <p className="section-subtitle">Comprehensive tools that adapt to your specific interview needs and provide meaningful feedback.</p>
        
        <div className="features-grid">
          <div className="feature-cell">
            <div className="feature-icon-wrap">📄</div>
            <h3 className="feature-title">Resume-Based Questions</h3>
            <p className="feature-desc">Upload your resume and get personalized questions tailored to your experience and skills.</p>
          </div>
          <div className="feature-cell">
            <div className="feature-icon-wrap">🤖</div>
            <h3 className="feature-title">AI-Powered Feedback</h3>
            <p className="feature-desc">Get instant, detailed feedback on communication, technical accuracy, and confidence.</p>
          </div>
          <div className="feature-cell">
            <div className="feature-icon-wrap">🎯</div>
            <h3 className="feature-title">Role-Specific Practice</h3>
            <p className="feature-desc">Practice for specific roles like Software Engineer, Data Scientist, Product Manager, and more.</p>
          </div>
          <div className="feature-cell">
            <div className="feature-icon-wrap">💬</div>
            <h3 className="feature-title">Natural Conversations</h3>
            <p className="feature-desc">Experience realistic interview conversations with adaptive follow-up questions.</p>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="how-section">
        <div className="section-label">How It Works</div>
        <h2 className="section-title">From practice to hired</h2>
        <div className="steps-row">
          <div className="step-item">
            <div className="step-number">1</div>
            <h3 className="step-title">Upload Profile</h3>
            <p className="step-desc">Provide your resume to get context-specific questions.</p>
          </div>
          <div className="step-item">
            <div className="step-number">2</div>
            <h3 className="step-title">Start Practice</h3>
            <p className="step-desc">Experience adaptive AI in a text-based interview simulation.</p>
          </div>
          <div className="step-item">
            <div className="step-number">3</div>
            <h3 className="step-title">Review Feedback</h3>
            <p className="step-desc">Get deep insights and suggested improvements for next time.</p>
          </div>
        </div>
      </section>

      {/* CTA Banner */}
      <section className="cta-banner">
        <h2 className="section-title" style={{margin: '0 0 24px'}}>Ready to Ace Your Interview?</h2>
        <button onClick={handleStartTrial} className="btn-primary">
          {isLoggedIn ? 'Go to Dashboard' : 'Get Started Now'}
        </button>
      </section>
    </div>
  );
}

export default Home;
