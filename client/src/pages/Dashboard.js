import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import './Dashboard.css';

function Dashboard() {
  const [user, setUser] = useState(null);
  const [interviews, setInterviews] = useState([]);
  const [stats, setStats] = useState({
    totalInterviews: 0,
    averageScore: 0,
    bestScore: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Filter states
  const [filterType, setFilterType] = useState('all'); // all, resume, practice
  const [filterScore, setFilterScore] = useState('all'); // all, excellent, good, needs-improvement
  const [sortBy, setSortBy] = useState('newest'); // newest, oldest, highest-score, lowest-score

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/dashboard', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (data.success) {
        setUser(data.user);
        setInterviews(data.interviews);
        setStats(data.stats);
      } else {
        setError(data.message || 'Failed to load dashboard');
      }
    } catch (err) {
      console.error('Dashboard error:', err);
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Filter and sort interviews
  const getFilteredInterviews = () => {
    let filtered = [...interviews];

    // Filter by type
    if (filterType !== 'all') {
      filtered = filtered.filter(interview => 
        interview.type.toLowerCase().includes(filterType)
      );
    }

    // Filter by score
    if (filterScore !== 'all') {
      filtered = filtered.filter(interview => {
        const score = interview.score;
        if (filterScore === 'excellent') return score >= 80;
        if (filterScore === 'good') return score >= 60 && score < 80;
        if (filterScore === 'needs-improvement') return score < 60;
        return true;
      });
    }

    // Sort interviews
    filtered.sort((a, b) => {
      if (sortBy === 'newest') {
        return new Date(b.date) - new Date(a.date);
      } else if (sortBy === 'oldest') {
        return new Date(a.date) - new Date(b.date);
      } else if (sortBy === 'highest-score') {
        return b.score - a.score;
      } else if (sortBy === 'lowest-score') {
        return a.score - b.score;
      }
      return 0;
    });

    return filtered;
  };

  const filteredInterviews = getFilteredInterviews();

  return (
    <div className="dashboard-page">
      <div className="container">
        {error && <div className="alert alert-error">{error}</div>}
        
        <div className="dashboard-header">
          <div>
            <h1>Welcome back, {user?.name || 'User'}! 👋</h1>
            <p>Track your progress and continue improving your interview skills</p>
          </div>
          <div className="dashboard-actions">
            <Link to="/interview" className="btn btn-primary">
              📝 Start Interview
            </Link>
            <Link to="/practice" className="btn btn-secondary">
              Practice Mode
            </Link>
          </div>
        </div>

        <div className="dashboard-stats">
          <div className="stat-card">
            <div className="stat-icon">📊</div>
            <div className="stat-content">
              <h3>Total Interviews</h3>
              <p className="stat-value">{stats.totalInterviews}</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">⭐</div>
            <div className="stat-content">
              <h3>Average Score</h3>
              <p className="stat-value">{stats.averageScore}</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">🎯</div>
            <div className="stat-content">
              <h3>Best Score</h3>
              <p className="stat-value">{stats.bestScore}</p>
            </div>
          </div>
        </div>

        <div className="dashboard-content">
          <div className="section-header">
            <h2>Recent Interviews</h2>
          </div>

          {/* Filters Section */}
          <div className="filters-section">
            <div className="filter-group">
              <label>Type:</label>
              <select 
                value={filterType} 
                onChange={(e) => setFilterType(e.target.value)}
                className="filter-select"
              >
                <option value="all">All Types</option>
                <option value="resume">Resume-Based</option>
                <option value="practice">Practice</option>
              </select>
            </div>

            <div className="filter-group">
              <label>Score:</label>
              <select 
                value={filterScore} 
                onChange={(e) => setFilterScore(e.target.value)}
                className="filter-select"
              >
                <option value="all">All Scores</option>
                <option value="excellent">Excellent (80+)</option>
                <option value="good">Good (60-79)</option>
                <option value="needs-improvement">Needs Improvement (&lt;60)</option>
              </select>
            </div>

            <div className="filter-group">
              <label>Sort By:</label>
              <select 
                value={sortBy} 
                onChange={(e) => setSortBy(e.target.value)}
                className="filter-select"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="highest-score">Highest Score</option>
                <option value="lowest-score">Lowest Score</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div className="spinner"></div>
          ) : filteredInterviews.length > 0 ? (
            <div className="interviews-list">
              {filteredInterviews.map((interview) => (
                <div key={interview.id} className="interview-card">
                  <div className="interview-info">
                    <h3>{interview.type}</h3>
                    <p className="interview-date">{new Date(interview.date).toLocaleDateString()}</p>
                  </div>
                  <div className="interview-score">
                    <div className="score-circle" style={{
                      background: `conic-gradient(var(--primary) ${interview.score * 3.6}deg, var(--border) 0deg)`
                    }}>
                      <div className="score-inner">
                        {interview.score}
                      </div>
                    </div>
                  </div>
                  <button 
                    className="btn btn-secondary btn-small"
                    onClick={() => window.location.href = `/results/${interview.id}`}
                  >
                    View Details
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-icon">📝</div>
              <h3>{interviews.length === 0 ? 'No interviews yet' : 'No interviews match your filters'}</h3>
              <p>{interviews.length === 0 ? 'Start your first interview to see your progress here' : 'Try adjusting your filters to see more results'}</p>
              {interviews.length === 0 && (
                <Link to="/interview" className="btn btn-primary">
                  Start Interview
                </Link>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
