import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './Home.css';

function Home() {
  const navigate = useNavigate();
  
  // Check if user is logged in
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
    <div className="home">
      {/* Hero Section */}
      <section className="hero gradient-bg">
        <div className="container">
          <div className="hero-content">
            <h1 className="hero-title">
              Ace Your Next Interview with
              <span className="hero-highlight"> AI-Powered Practice</span>
            </h1>
            <p className="hero-subtitle">
              Get personalized mock interviews, real-time feedback, and comprehensive assessments 
              to boost your confidence and land your dream job.
            </p>
            <div className="hero-buttons">
              <button onClick={handleStartTrial} className="btn btn-large btn-white">
                {isLoggedIn ? 'Go to Dashboard' : 'Start Free Trial'}
              </button>
              <Link to="/practice" className="btn btn-large btn-outline">
                Try Practice Mode
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features">
        <div className="container">
          <h2 className="section-title">Why Choose MockInterviewAI?</h2>
          <div className="features-grid">
            <div className="feature-card slide-in">
              <div className="feature-icon">📄</div>
              <h3>Resume-Based Questions</h3>
              <p>Upload your resume and get personalized questions tailored to your experience and skills.</p>
            </div>
            <div className="feature-card slide-in" style={{animationDelay: '0.1s'}}>
              <div className="feature-icon">🤖</div>
              <h3>AI-Powered Feedback</h3>
              <p>Get instant, detailed feedback on communication, technical accuracy, and confidence.</p>
            </div>
            <div className="feature-card slide-in" style={{animationDelay: '0.2s'}}>
              <div className="feature-icon">🎯</div>
              <h3>Role-Specific Practice</h3>
              <p>Practice for specific roles like Software Engineer, Data Scientist, Product Manager, and more.</p>
            </div>
            <div className="feature-card slide-in" style={{animationDelay: '0.3s'}}>
              <div className="feature-icon">📊</div>
              <h3>Performance Analytics</h3>
              <p>Track your progress over time with detailed performance metrics and improvement suggestions.</p>
            </div>
            <div className="feature-card slide-in" style={{animationDelay: '0.4s'}}>
              <div className="feature-icon">💬</div>
              <h3>Natural Conversations</h3>
              <p>Experience realistic interview conversations with adaptive follow-up questions.</p>
            </div>
            <div className="feature-card slide-in" style={{animationDelay: '0.5s'}}>
              <div className="feature-icon">⚡</div>
              <h3>Instant Results</h3>
              <p>Get comprehensive assessment reports immediately after completing your interview.</p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="how-it-works">
        <div className="container">
          <h2 className="section-title">How It Works</h2>
          <div className="steps">
            <div className="step">
              <div className="step-number">1</div>
              <h3>Upload Your Resume</h3>
              <p>Upload your resume in PDF format and our AI will analyze your background.</p>
            </div>
            <div className="step-arrow">→</div>
            <div className="step">
              <div className="step-number">2</div>
              <h3>Start Interview</h3>
              <p>Choose between resume-based or role-specific practice interviews.</p>
            </div>
            <div className="step-arrow">→</div>
            <div className="step">
              <div className="step-number">3</div>
              <h3>Get Feedback</h3>
              <p>Receive detailed feedback on your performance across multiple dimensions.</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta gradient-bg">
        <div className="container">
          <div className="cta-content">
            <h2>Ready to Ace Your Interview?</h2>
            <p>Join thousands of job seekers who have improved their interview skills with MockInterviewAI.</p>
            <button onClick={handleStartTrial} className="btn btn-large btn-white">
              {isLoggedIn ? 'Go to Dashboard' : 'Get Started Now'}
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="container">
          <p>&copy; 2024 MockInterviewAI. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

export default Home;
