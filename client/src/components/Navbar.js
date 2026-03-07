import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './Navbar.css';

function Navbar() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [userName, setUserName] = useState('User');
  const [userProfilePicture, setUserProfilePicture] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('token');
    setIsAuthenticated(!!token);
    
    // Get user name and profile picture from localStorage
    const user = localStorage.getItem('user');
    if (user) {
      try {
        const userData = JSON.parse(user);
        setUserName(userData.name || 'User');
        setUserProfilePicture(userData.profile_picture || null);
      } catch (e) {
        setUserName('User');
        setUserProfilePicture(null);
      }
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setIsAuthenticated(false);
    setIsProfileDropdownOpen(false);
    navigate('/');
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const toggleProfileDropdown = () => {
    setIsProfileDropdownOpen(!isProfileDropdownOpen);
  };

  const closeDropdown = () => {
    setIsProfileDropdownOpen(false);
  };

  // Get initials for profile icon
  const getInitials = (name) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <nav className="navbar">
      <div className="container">
        <div className="navbar-content">
          <Link to="/" className="navbar-brand">
            <span className="brand-icon">🎯</span>
            <span className="brand-text">MockInterview<span className="brand-highlight">AI</span></span>
          </Link>

          <button className="mobile-menu-btn" onClick={toggleMobileMenu}>
            <span></span>
            <span></span>
            <span></span>
          </button>

          <div className={`navbar-menu ${isMobileMenuOpen ? 'active' : ''}`}>
            {isAuthenticated ? (
              <>
                <Link to="/dashboard" className="nav-link">Dashboard</Link>
                <Link to="/interview" className="nav-link">Interview</Link>
                <Link to="/practice" className="nav-link">Practice</Link>
                
                {/* Profile Dropdown */}
                <div className="profile-dropdown-container">
                  <button 
                    className="profile-icon-btn" 
                    onClick={toggleProfileDropdown}
                    aria-label="Profile menu"
                  >
                    {userProfilePicture ? (
                      <img src={userProfilePicture} alt="Profile" className="profile-icon-img" />
                    ) : (
                      <div className="profile-icon">
                        {getInitials(userName)}
                      </div>
                    )}
                  </button>
                  
                  {isProfileDropdownOpen && (
                    <>
                      <div className="dropdown-overlay" onClick={closeDropdown}></div>
                      <div className="profile-dropdown">
                        <div className="dropdown-header">
                          <div className="dropdown-user-info">
                            {userProfilePicture ? (
                              <img src={userProfilePicture} alt="Profile" className="dropdown-profile-icon-img" />
                            ) : (
                              <div className="dropdown-profile-icon">
                                {getInitials(userName)}
                              </div>
                            )}
                            <div className="dropdown-user-details">
                              <div className="dropdown-user-name">{userName}</div>
                            </div>
                          </div>
                        </div>
                        <div className="dropdown-divider"></div>
                        <Link to="/profile" className="dropdown-item" onClick={closeDropdown}>
                          <span className="dropdown-icon">👤</span>
                          Profile
                        </Link>
                        <Link to="/settings" className="dropdown-item" onClick={closeDropdown}>
                          <span className="dropdown-icon">⚙️</span>
                          Settings
                        </Link>
                        <div className="dropdown-divider"></div>
                        <button className="dropdown-item" onClick={handleLogout}>
                          <span className="dropdown-icon">🚪</span>
                          Logout
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </>
            ) : (
              <>
                <Link to="/signin" className="nav-link">Sign In</Link>
                <Link to="/signup" className="btn btn-primary btn-small">
                  Get Started
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
