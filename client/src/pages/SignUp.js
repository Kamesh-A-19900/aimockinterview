import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './Auth.css';

function SignUp() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
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

    // Validate passwords match
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    // Validate password length
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('http://localhost:5000/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          password: formData.password
        })
      });

      const data = await response.json();

      if (data.success) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        navigate('/dashboard');
        window.location.reload(); // Refresh to update navbar
      } else {
        setError(data.message || 'Registration failed');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const errorId = error ? "signup-error" : undefined;

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
            "The personalized feedback helped me identify blind spots I didn't even know I had. Worth every minute of practice."
          </p>
          <div className="auth-testimonial-author">
            <div className="auth-testimonial-avatar">SJ</div>
            <div>
              <p className="auth-testimonial-name">Sarah J.</p>
              <p className="auth-testimonial-role">Product Manager</p>
            </div>
          </div>
        </div>
      </div>

      <div className="auth-right">
        <div className="auth-form-container">
          <h1 className="auth-form-title">Create Account</h1>
          <p className="auth-form-subtitle">Start your interview practice journey today</p>

          {error && <div id="signup-error" className="alert alert-error" role="alert">{error}</div>}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="name" className="form-label">Full Name</label>
              <input
                id="name"
                type="text"
                name="name"
                className="input"
                placeholder="John Doe"
                value={formData.name}
                onChange={handleChange}
                aria-describedby={errorId}
                required
              />
            </div>

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
                placeholder="At least 6 characters"
                value={formData.password}
                onChange={handleChange}
                aria-describedby={errorId}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword" className="form-label">Confirm Password</label>
              <input
                id="confirmPassword"
                type="password"
                name="confirmPassword"
                className="input"
                placeholder="Re-enter your password"
                value={formData.confirmPassword}
                onChange={handleChange}
                aria-describedby={errorId}
                required
              />
            </div>

            <button type="submit" className="btn-primary" style={{width: '100%', marginTop: '8px'}} disabled={loading}>
              {loading ? 'Creating account...' : 'Sign Up'}
            </button>
          </form>

          <p className="auth-footer-text">
            Already have an account? <Link to="/signin" className="auth-link">Sign In</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default SignUp;
