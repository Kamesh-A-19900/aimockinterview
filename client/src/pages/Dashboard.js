import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
  const [filterType, setFilterType] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [dateFilter, setDateFilter] = useState('all');

  const navigate = useNavigate();

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem('token');
      // Adding a small fake delay to show skeleton clearly if response is too fast
      await new Promise(r => setTimeout(r, 600));

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
        // Fallback dummy user for viewing redesign
        const u = JSON.parse(localStorage.getItem('user')) || {name: 'User'};
        setUser(u);
      }
    } catch (err) {
      console.error('Dashboard error:', err);
      // Fallback dummy user
      const u = JSON.parse(localStorage.getItem('user')) || {name: 'User', email: 'user@example.com'};
      setUser(u);
    } finally {
      setLoading(false);
    }
  };

  const getFilteredInterviews = () => {
    let filtered = [...interviews];
    
    // Filter by type
    if (filterType !== 'all') {
      filtered = filtered.filter(i => i.type.toLowerCase().includes(filterType));
    }
    
    // Filter by date
    if (dateFilter !== 'all') {
      const now = new Date();
      const filterDate = new Date();
      
      if (dateFilter === 'today') {
        filterDate.setHours(0, 0, 0, 0);
        filtered = filtered.filter(i => new Date(i.date) >= filterDate);
      } else if (dateFilter === 'week') {
        filterDate.setDate(now.getDate() - 7);
        filtered = filtered.filter(i => new Date(i.date) >= filterDate);
      } else if (dateFilter === 'month') {
        filterDate.setMonth(now.getMonth() - 1);
        filtered = filtered.filter(i => new Date(i.date) >= filterDate);
      }
    }
    
    // Sort
    filtered.sort((a, b) => {
      if (sortBy === 'newest') return new Date(b.date) - new Date(a.date);
      if (sortBy === 'oldest') return new Date(a.date) - new Date(b.date);
      if (sortBy === 'highest-score') return b.score - a.score;
      if (sortBy === 'lowest-score') return a.score - b.score;
      return 0;
    });
    return filtered;
  };

  const filteredInterviews = getFilteredInterviews();



  const getScoreClass = (score) => {
    if (score >= 80) return 'score-excellent';
    if (score >= 60) return 'score-good';
    return 'score-low';
  };

  return (
    <div className="dashboard-page">
      <div className="dashboard-inner">
        
        {/* Header */}
        <div className="dashboard-header">
          <div>
            {loading ? (
              <div className="skeleton" style={{width: '200px', height: '16px', marginBottom: '8px'}}></div>
            ) : (
              <p className="dashboard-greeting">Welcome back, {user?.name || 'User'}</p>
            )}
            <h1 className="dashboard-title">Dashboard</h1>
          </div>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        {/* Stats Grid */}
        <div className="stats-grid">
          {['Total Interviews', 'Avg. Score', 'Best Score'].map((label, idx) => (
            <div className="stat-card" key={idx}>
              <div className="stat-card-icon">{idx === 0 ? '📊' : idx === 1 ? '⭐' : '🏆'}</div>
              <div>
                {loading ? (
                   <div className="skeleton" style={{width: '60px', height: '32px', marginBottom: '6px'}}></div>
                ) : (
                  <div className="stat-card-value">
                    {idx === 0 ? stats.totalInterviews : 
                     idx === 1 ? stats.averageScore : 
                     stats.bestScore}
                  </div>
                )}
                <div className="stat-card-label">{label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Body Layout */}
        <div className="dashboard-body">
          {/* History */}
          <div className="history-section">
            <div className="history-header">
              <span className="history-title">Recent History</span>
              <div className="filters-container">
                <select className="filter-select" value={filterType} onChange={e => setFilterType(e.target.value)}>
                  <option value="all">All Types</option>
                  <option value="resume">Resume</option>
                </select>
                <select className="filter-select" value={dateFilter} onChange={e => setDateFilter(e.target.value)}>
                  <option value="all">All Time</option>
                  <option value="today">Today</option>
                  <option value="week">Last Week</option>
                  <option value="month">Last Month</option>
                </select>
                <select className="filter-select" value={sortBy} onChange={e => setSortBy(e.target.value)}>
                  <option value="newest">Newest</option>
                  <option value="highest-score">Best Score</option>
                </select>
              </div>
            </div>

            <div className="history-list">
              {loading ? (
                // Skeletons
                Array(3).fill(0).map((_, i) => (
                  <div className="history-item" key={i}>
                    <div className="skeleton history-item-icon"></div>
                    <div className="history-item-info">
                      <div className="skeleton" style={{width: '120px', height: '14px', marginBottom: '6px'}}></div>
                      <div className="skeleton" style={{width: '80px', height: '10px'}}></div>
                    </div>
                  </div>
                ))
              ) : filteredInterviews.length > 0 ? (
                filteredInterviews.map((interview) => (
                  <Link to={`/results/${interview.id}`} className="history-item" key={interview.id}>
                    <div className="history-item-icon">
                      {interview.type.toLowerCase().includes('resume') ? '📄' : '🎯'}
                    </div>
                    <div className="history-item-info">
                      <div className="history-item-title">{interview.type}</div>
                      <div className="history-item-meta">{new Date(interview.date).toLocaleDateString()}</div>
                    </div>
                    <div className={`history-item-score ${getScoreClass(interview.score)}`}>
                      {interview.score}
                    </div>
                  </Link>
                ))
              ) : (
                 <div style={{padding: '48px 24px', textAlign: 'center', color: 'var(--text-muted)'}}>
                   <p style={{fontSize: '24px', marginBottom: '8px'}}>📝</p>
                   <p style={{fontSize: '14px'}}>No interviews found. Pick a practice mode to start.</p>
                 </div>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

export default Dashboard;
