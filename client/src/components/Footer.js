import React from 'react';
import { Link } from 'react-router-dom';
import './Footer.css';

function Footer() {
  return (
    <footer className="footer">
      <div className="footer-inner">
        <div className="footer-brand">
          <div className="footer-brand-name">
            MockInterview<span style={{color: 'var(--brand)'}}>AI</span>
          </div>
          <p className="footer-brand-desc">
            AI-powered mock interview platform helping job seekers ace their interviews with personalized feedback and comprehensive assessments.
          </p>
        </div>

        <div>
          <h4 className="footer-col-title">Product</h4>
          <ul className="footer-links">
            <li><Link to="/interview">Resume Interview</Link></li>
            <li><Link to="/practice">Practice Mode</Link></li>
            <li><Link to="/dashboard">Dashboard</Link></li>
            <li><Link to="/">Pricing</Link></li>
          </ul>
        </div>

        <div>
           <h4 className="footer-col-title">Company</h4>
           <ul className="footer-links">
             <li><Link to="/">About Us</Link></li>
             <li><Link to="/">Careers</Link></li>
             <li><Link to="/">Blog</Link></li>
             <li><Link to="/">Partners</Link></li>
           </ul>
        </div>

        <div>
           <h4 className="footer-col-title">Resources</h4>
           <ul className="footer-links">
             <li><Link to="/">Help Center</Link></li>
             <li><Link to="/">Documentation</Link></li>
             <li><Link to="/">API Reference</Link></li>
             <li><Link to="/">Community</Link></li>
           </ul>
        </div>
      </div>

      <div className="footer-bottom">
        <span className="footer-copyright">&copy; {new Date().getFullYear()} MockInterviewAI. All rights reserved.</span>
        <div style={{display: 'flex', gap: '16px'}}>
          <Link to="/" style={{fontSize: '12px', color: 'var(--text-muted)', textDecoration: 'none'}}>Privacy Policy</Link>
          <Link to="/" style={{fontSize: '12px', color: 'var(--text-muted)', textDecoration: 'none'}}>Terms of Service</Link>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
