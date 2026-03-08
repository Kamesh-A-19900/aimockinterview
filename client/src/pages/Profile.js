import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Profile.css';

function Profile() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const [formData, setFormData] = useState({
    name: '',
    email: ''
  });
  
  const [profilePicture, setProfilePicture] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);

  useEffect(() => {
    fetchUserProfile();
  }, []);

  const fetchUserProfile = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/auth/profile', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (data.success) {
        setUser(data.user);
        setFormData({
          name: data.user.name || '',
          email: data.user.email || ''
        });
        // Set profile picture if exists
        if (data.user.profile_picture) {
          setPreviewUrl(data.user.profile_picture);
        }
      } else {
        setError(data.message || 'Failed to load profile');
      }
    } catch (error) {
      console.error('Fetch profile error:', error);
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError('');
    setSuccess('');
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      setError('Image size must be less than 2MB');
      return;
    }

    // Read file and convert to base64
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result;
      setProfilePicture(base64String);
      setPreviewUrl(base64String);
      setError('');
    };
    reader.onerror = () => {
      setError('Failed to read image file');
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = () => {
    setProfilePicture('');
    setPreviewUrl(null);
    // Reset file input
    const fileInput = document.getElementById('photo-upload');
    if (fileInput) fileInput.value = '';
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const token = localStorage.getItem('token');
      
      const updateData = {
        name: formData.name,
        email: formData.email
      };

      // Include profile picture if changed
      if (profilePicture !== null) {
        updateData.profilePicture = profilePicture;
      }

      const response = await fetch('http://localhost:5000/api/auth/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(updateData)
      });

      const data = await response.json();

      if (data.success) {
        setSuccess('Profile updated successfully!');
        setUser(data.user);
        setProfilePicture(null); // Reset after successful update
        // Update localStorage
        localStorage.setItem('user', JSON.stringify(data.user));
      } else {
        setError(data.message || 'Failed to update profile');
      }
    } catch (error) {
      console.error('Update profile error:', error);
      setError('Network error. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // Get initials for profile picture
  const getInitials = (name) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (loading) {
    return (
      <div className="profile-page">
        <div className="container">
          <div className="loading-message">
            <p>Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="profile-page">
      <div className="container">
        <div className="profile-header">
          <h1>My Profile</h1>
          <button className="btn btn-secondary" onClick={() => navigate('/dashboard')}>
            Back to Dashboard
          </button>
        </div>

        {error && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        <div className="profile-content">
          {/* Profile Picture & Info */}
          <div className="profile-section profile-card">
            <div className="profile-picture-section">
              <div className="profile-picture-container">
                {previewUrl ? (
                  <img src={previewUrl} alt="Profile" className="profile-picture-large-img" />
                ) : (
                  <div className="profile-picture-large">
                    {getInitials(user?.name)}
                  </div>
                )}
                <div className="profile-picture-actions">
                  <label htmlFor="photo-upload" className="btn btn-secondary btn-small">
                    📷 Change Photo
                  </label>
                  <input
                    type="file"
                    id="photo-upload"
                    accept="image/*"
                    onChange={handlePhotoChange}
                    style={{ display: 'none' }}
                  />
                  {previewUrl && (
                    <button 
                      type="button" 
                      className="btn btn-danger btn-small"
                      onClick={handleRemovePhoto}
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
              <div className="profile-info-text">
                <h2>{user?.name || 'User'}</h2>
                <p className="profile-email">{user?.email}</p>
                <p className="profile-member-since">
                  Member since {user?.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : 'N/A'}
                </p>
              </div>
            </div>
          </div>

          {/* Edit Profile Information */}
          <div className="profile-section">
            <h2>Edit Profile</h2>
            <form onSubmit={handleUpdateProfile}>
              <div className="form-group">
                <label htmlFor="name">Full Name</label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="email">Email Address</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                />
              </div>

              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Profile;
