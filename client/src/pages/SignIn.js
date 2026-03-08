import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './Auth.css';

function SignIn() {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (data.success) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        navigate('/dashboard');
        window.location.reload(); // Refresh to update navbar
      } else {
        setError(data.message || 'Login failed');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const errorId = error ? "signin-error" : undefined;

  return (
    <div className="auth-page">
      <div className="auth-left">
        <div className="auth-left-glow"></div>
        <Link to="/" className="auth-brand">
          <div className="auth-brand-icon">🎯</div>
          MockInterview<span style={{color: 'var(--brand)'}}>AI</span>
        </Link>
        <div className="auth-testimonial">
          <p className="auth-testimonial-quote">
            "I landed my SWE role at a top startup after 2 weeks of practicing here. The AI doesn't let you get away with vague answers."
          </p>
          <div className="auth-testimonial-author">
            <div className="auth-testimonial-avatar">AM</div>
            <div>
              <p className="auth-testimonial-name">Arjun M.</p>
              <p className="auth-testimonial-role">Software Engineer — got the offer</p>
            </div>
          </div>
        </div>
      </div>

      <div className="auth-right">
        <div className="auth-form-container">
          <h1 className="auth-form-title">Welcome Back</h1>
          <p className="auth-form-subtitle">Sign in to continue your interview practice</p>

          {error && <div id="signin-error" className="alert alert-error" role="alert">{error}</div>}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="email" className="form-label">Email</label>
              <input
                id="email"
                type="email"
                name="email"
                className="input"
                placeholder="your@email.com"
                value={formData.email}
                onChange={handleChange}
                aria-describedby={errorId}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="password" className="form-label">Password</label>
              <input
                id="password"
                type="password"
                name="password"
                className="input"
                placeholder="Enter your password"
                value={formData.password}
                onChange={handleChange}
                aria-describedby={errorId}
                required
              />
            </div>

            <button type="submit" className="btn-primary" style={{width: '100%', marginTop: '8px'}} disabled={loading}>
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <p className="auth-footer-text">
            Don't have an account? <Link to="/signup" className="auth-link">Sign Up</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default SignIn;
