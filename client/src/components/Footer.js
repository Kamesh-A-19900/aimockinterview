import React from 'react';
import { Link } from 'react-router-dom';
import './Footer.css';

function Footer() {
  return (
    <footer className="footer">
      <div className="footer-content">
        <div className="container">
          <div className="footer-grid">
            {/* Brand Section */}
            <div className="footer-section">
              <div className="footer-brand">
                <span className="brand-icon">🎯</span>
                <span className="brand-text">MockInterview<span className="brand-highlight">AI</span></span>
              </div>
              <p className="footer-description">
                AI-powered mock interview platform helping job seekers ace their interviews with personalized feedback and comprehensive assessments.
              </p>
              <div className="social-links">
                <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="social-link">
                  <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M23 3a10.9 10.9 0 01-3.14 1.53 4.48 4.48 0 00-7.86 3v1A10.66 10.66 0 013 4s-4 9 5 13a11.64 11.64 0 01-7 2c9 5 20 0 20-11.5a4.5 4.5 0 00-.08-.83A7.72 7.72 0 0023 3z"></path>
                  </svg>
                </a>
                <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" className="social-link">
                  <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-2-2 2 2 0 00-2 2v7h-4v-7a6 6 0 016-6zM2 9h4v12H2z"></path>
                    <circle cx="4" cy="4" r="2"></circle>
                  </svg>
                </a>
                <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="social-link">
                  <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 00-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0020 4.77 5.07 5.07 0 0019.91 1S18.73.65 16 2.48a13.38 13.38 0 00-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 005 4.77a5.44 5.44 0 00-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 009 18.13V22"></path>
                  </svg>
                </a>
                <a href="https://youtube.com" target="_blank" rel="noopener noreferrer" className="social-link">
                  <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M22.54 6.42a2.78 2.78 0 00-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 00-1.94 2A29 29 0 001 11.75a29 29 0 00.46 5.33A2.78 2.78 0 003.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 001.94-2 29 29 0 00.46-5.25 29 29 0 00-.46-5.33z"></path>
                    <polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02"></polygon>
                  </svg>
                </a>
              </div>
            </div>

            {/* Product Links */}
            <div className="footer-section">
              <h4 className="footer-title">Product</h4>
              <ul className="footer-links">
                <li><Link to="/interview">Resume Interview</Link></li>
                <li><Link to="/practice">Practice Mode</Link></li>
                <li><Link to="/dashboard">Dashboard</Link></li>
                <li><a href="#pricing">Pricing</a></li>
                <li><a href="#features">Features</a></li>
              </ul>
            </div>

            {/* Company Links */}
            <div className="footer-section">
              <h4 className="footer-title">Company</h4>
              <ul className="footer-links">
                <li><a href="#about">About Us</a></li>
                <li><a href="#careers">Careers</a></li>
                <li><a href="#blog">Blog</a></li>
                <li><a href="#press">Press Kit</a></li>
                <li><a href="#partners">Partners</a></li>
              </ul>
            </div>

            {/* Resources Links */}
            <div className="footer-section">
              <h4 className="footer-title">Resources</h4>
              <ul className="footer-links">
                <li><a href="#help">Help Center</a></li>
                <li><a href="#docs">Documentation</a></li>
                <li><a href="#api">API Reference</a></li>
                <li><a href="#community">Community</a></li>
                <li><a href="#tutorials">Tutorials</a></li>
              </ul>
            </div>

            {/* Contact Section */}
            <div className="footer-section">
              <h4 className="footer-title">Contact Us</h4>
              <ul className="footer-contact">
                <li>
                  <span className="contact-icon">📧</span>
                  <a href="mailto:support@mockinterviewai.com">support@mockinterviewai.com</a>
                </li>
                <li>
                  <span className="contact-icon">📞</span>
                  <a href="tel:+1234567890">+1 (234) 567-890</a>
                </li>
                <li>
                  <span className="contact-icon">📍</span>
                  <span>123 AI Street, Tech Valley<br/>San Francisco, CA 94105</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="footer-bottom">
            <div className="footer-bottom-content">
              <p>&copy; 2024 MockInterviewAI. All rights reserved.</p>
              <div className="footer-legal">
                <a href="#privacy">Privacy Policy</a>
                <span className="separator">•</span>
                <a href="#terms">Terms of Service</a>
                <span className="separator">•</span>
                <a href="#cookies">Cookie Policy</a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
