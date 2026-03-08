import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './Navbar.css';

function Navbar() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userName, setUserName] = useState('User');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('token');
    setIsAuthenticated(!!token);
    
    // Get user name from localStorage
    const user = localStorage.getItem('user');
    if (user) {
      try {
        const userData = JSON.parse(user);
        setUserName(userData.name || 'User');
      } catch (e) {
        setUserName('User');
      }
    }
  }, []);

  const handleLogout = () => {
    if(window.confirm("Are you sure you want to log out?")) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setIsAuthenticated(false);
      navigate('/');
    }
  };

  const getInitials = (name) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <nav className="navbar">
      <Link to="/" className="navbar-logo">
        <img src="/logo.png" alt="MockInterviewAI" className="navbar-logo-image" />
        <span className="navbar-logo-text">
          MockInterview<span style={{color: 'var(--brand)'}}>AI</span>
        </span>
      </Link>

      <div className="navbar-links">
        {isAuthenticated && (
          <>
            <Link to="/dashboard" className="navbar-link">Dashboard</Link>
            <Link to="/interview" className="navbar-link">Interview</Link>
            <Link to="/practice" className="navbar-link">Practice</Link>
          </>
        )}
      </div>

      <div className="navbar-actions">
        {isAuthenticated ? (
          <div className="navbar-user-container" style={{ position: 'relative' }}>
            <div className="navbar-user" onClick={() => setIsDropdownOpen(!isDropdownOpen)}>
              <div className="navbar-avatar">
                {getInitials(userName)}
              </div>
              <span className="navbar-username">{userName}</span>
              <span className="navbar-dropdown-arrow" style={{ fontSize: '10px', marginLeft: '2px', color: 'var(--text-muted)' }}>▼</span>
            </div>
            
            {isDropdownOpen && (
              <>
                {/* Invisible overlay to close dropdown when clicking outside */}
                <div 
                  style={{position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 99}} 
                  onClick={() => setIsDropdownOpen(false)}
                />
                
                <div className="navbar-dropdown">
                  <div className="navbar-dropdown-header">
                    <div className="dropdown-name">{userName}</div>
                    <div className="dropdown-email">{JSON.parse(localStorage.getItem('user'))?.email || 'user@example.com'}</div>
                  </div>
                  <div className="navbar-dropdown-divider"></div>
                  <Link to="/profile" className="navbar-dropdown-item" onClick={() => setIsDropdownOpen(false)}>
                    <span className="dropdown-item-icon">👤</span> Edit Profile
                  </Link>
                  <Link to="/settings" className="navbar-dropdown-item" onClick={() => setIsDropdownOpen(false)}>
                    <span className="dropdown-item-icon">⚙️</span> Settings
                  </Link>
                  <div className="navbar-dropdown-divider"></div>
                  <button className="navbar-dropdown-item logout-btn" onClick={() => { setIsDropdownOpen(false); handleLogout(); }}>
                    <span className="dropdown-item-icon">🚪</span> Log Out
                  </button>
                </div>
              </>
            )}
          </div>
        ) : (
          <>
            <Link to="/signin" className="navbar-link">Sign In</Link>
            <Link to="/signup" className="btn-primary">Get Started</Link>
          </>
        )}
      </div>
    </nav>
  );
}

export default Navbar;
