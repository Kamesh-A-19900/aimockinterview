import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Settings.css';

function Settings() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Theme state
  const [theme, setTheme] = useState('light');
  
  // Password change state
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  useEffect(() => {
    // Load theme from localStorage
    const savedTheme = localStorage.getItem('theme') || 'light';
    setTheme(savedTheme);
    document.documentElement.setAttribute('data-theme', savedTheme);
  }, []);

  const handleThemeChange = (newTheme) => {
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
    setSuccess(`Theme changed to ${newTheme} mode`);
    setTimeout(() => setSuccess(''), 3000);
  };

  const handlePasswordChange = (e) => {
    setPasswordData({
      ...passwordData,
      [e.target.name]: e.target.value
    });
    setError('');
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/auth/change-password', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword
        })
      });

      const data = await response.json();

      if (data.success) {
        setSuccess('Password changed successfully!');
        setPasswordData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });
        setShowPasswordChange(false);
      } else {
        setError(data.message || 'Failed to change password');
      }
    } catch (error) {
      console.error('Change password error:', error);
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    const confirmed = window.confirm(
      'Are you sure you want to delete your account? This action cannot be undone. All your interview data will be permanently deleted.'
    );

    if (!confirmed) return;

    const doubleConfirm = window.prompt(
      'Type "DELETE" to confirm account deletion:'
    );

    if (doubleConfirm !== 'DELETE') {
      setError('Account deletion cancelled');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/auth/delete-account', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (data.success) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/');
      } else {
        setError(data.message || 'Failed to delete account');
      }
    } catch (error) {
      console.error('Delete account error:', error);
      setError('Network error. Please try again.');
    }
  };

  return (
    <div className="settings-page">
      <div className="container">
        <div className="settings-header">
          <h1>Settings</h1>
          <button className="btn btn-secondary" onClick={() => navigate('/dashboard')}>
            Back to Dashboard
          </button>
        </div>

        {error && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        <div className="settings-content">
          {/* Appearance Settings */}
          <div className="settings-section">
            <h2>Appearance</h2>
            <p className="section-description">Customize how the app looks on your device</p>
            
            <div className="setting-item">
              <div className="setting-info">
                <div className="setting-label">Theme</div>
                <div className="setting-description">Choose your preferred color scheme</div>
              </div>
              <div className="theme-selector">
                <button 
                  className={`theme-option ${theme === 'light' ? 'active' : ''}`}
                  onClick={() => handleThemeChange('light')}
                >
                  <span className="theme-icon">☀️</span>
                  Light
                </button>
                <button 
                  className={`theme-option ${theme === 'dark' ? 'active' : ''}`}
                  onClick={() => handleThemeChange('dark')}
                >
                  <span className="theme-icon">🌙</span>
                  Dark
                </button>
              </div>
            </div>
          </div>

          {/* Security Settings */}
          <div className="settings-section">
            <h2>Security</h2>
            <p className="section-description">Manage your password and account security</p>
            
            {!showPasswordChange ? (
              <div className="setting-item">
                <div className="setting-info">
                  <div className="setting-label">Password</div>
                  <div className="setting-description">Change your account password</div>
                </div>
                <button 
                  className="btn btn-secondary"
                  onClick={() => setShowPasswordChange(true)}
                >
                  Change Password
                </button>
              </div>
            ) : (
              <div className="password-change-form">
                <form onSubmit={handlePasswordSubmit}>
                  <div className="form-group">
                    <label htmlFor="currentPassword">Current Password</label>
                    <input
                      type="password"
                      id="currentPassword"
                      name="currentPassword"
                      value={passwordData.currentPassword}
                      onChange={handlePasswordChange}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="newPassword">New Password</label>
                    <input
                      type="password"
                      id="newPassword"
                      name="newPassword"
                      value={passwordData.newPassword}
                      onChange={handlePasswordChange}
                      required
                      minLength="6"
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="confirmPassword">Confirm New Password</label>
                    <input
                      type="password"
                      id="confirmPassword"
                      name="confirmPassword"
                      value={passwordData.confirmPassword}
                      onChange={handlePasswordChange}
                      required
                      minLength="6"
                    />
                  </div>

                  <div className="form-actions">
                    <button type="submit" className="btn btn-primary" disabled={loading}>
                      {loading ? 'Changing...' : 'Save Password'}
                    </button>
                    <button 
                      type="button" 
                      className="btn btn-secondary"
                      onClick={() => {
                        setShowPasswordChange(false);
                        setPasswordData({
                          currentPassword: '',
                          newPassword: '',
                          confirmPassword: ''
                        });
                        setError('');
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>

          {/* Notifications Settings */}
          <div className="settings-section">
            <h2>Notifications</h2>
            <p className="section-description">Manage your notification preferences</p>
            
            <div className="setting-item">
              <div className="setting-info">
                <div className="setting-label">Email Notifications</div>
                <div className="setting-description">Receive email updates about your interviews</div>
              </div>
              <label className="toggle-switch">
                <input type="checkbox" defaultChecked />
                <span className="toggle-slider"></span>
              </label>
            </div>

            <div className="setting-item">
              <div className="setting-info">
                <div className="setting-label">Interview Reminders</div>
                <div className="setting-description">Get reminded about scheduled interviews</div>
              </div>
              <label className="toggle-switch">
                <input type="checkbox" defaultChecked />
                <span className="toggle-slider"></span>
              </label>
            </div>
          </div>

          {/* Danger Zone */}
          <div className="settings-section danger-zone">
            <h2>Danger Zone</h2>
            <p className="section-description">Irreversible actions that affect your account</p>
            
            <div className="setting-item">
              <div className="setting-info">
                <div className="setting-label">Delete Account</div>
                <div className="setting-description">
                  Permanently delete your account and all associated data
                </div>
              </div>
              <button className="btn btn-danger" onClick={handleDeleteAccount}>
                Delete Account
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Settings;
