import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './InterviewTypeSelection.css';

function InterviewTypeSelection() {
  const navigate = useNavigate();
  const [selectedType, setSelectedType] = useState(null);

  const interviewTypes = [
    {
      id: 'practice',
      name: 'Practice Interview',
      icon: '🎯',
      description: 'Quick practice with 5 static questions per role',
      features: ['No resume needed', '5 questions', 'Instant feedback', 'Multiple roles'],
      duration: '10-15 minutes',
      difficulty: 'Beginner Friendly',
      active: true,
      route: '/practice'
    },
    {
      id: 'resume',
      name: 'Resume-Based Interview',
      icon: '📄',
      description: 'Personalized interview based on your resume and experience',
      features: ['Resume upload', 'Project questions', 'STAR method', 'AI-powered'],
      duration: '30-120 minutes',
      difficulty: 'Intermediate',
      active: true,
      route: '/interview'
    },
    {
      id: 'coding',
      name: 'Coding Interview',
      icon: '💻',
      description: 'Technical coding assessment with algorithm problems',
      features: ['8 languages', 'Progressive difficulty', 'Code optimization', 'Complexity analysis'],
      duration: '30-90 minutes',
      difficulty: 'Technical',
      active: false,
      comingSoon: true
    },
    {
      id: 'stress',
      name: 'Stress Interview',
      icon: '⚡',
      description: 'High-pressure interview to test composure and adaptability',
      features: ['Rapid-fire questions', 'Ethical dilemmas', 'Pressure scenarios', 'Composure testing'],
      duration: '20-40 minutes',
      difficulty: 'Advanced',
      active: false,
      comingSoon: true
    },
    {
      id: 'aptitude',
      name: 'Aptitude Test',
      icon: '🧠',
      description: 'Logical reasoning and quantitative aptitude assessment',
      features: ['Logical reasoning', 'Quantitative aptitude', 'Verbal reasoning', 'Timed questions'],
      duration: '45-60 minutes',
      difficulty: 'Intermediate',
      active: false,
      comingSoon: true
    }
  ];

  const handleSelectType = (type) => {
    if (!type.active) return;
    setSelectedType(type.id);
  };

  const handleStartInterview = () => {
    const selected = interviewTypes.find(t => t.id === selectedType);
    if (selected && selected.active) {
      navigate(selected.route);
    }
  };

  return (
    <div className="interview-type-selection-page">
      <div className="container">
        <div className="selection-header fade-in">
          <h1>Choose Your Interview Type</h1>
          <p className="subtitle">Select the type of interview you want to practice</p>
        </div>

        <div className="interview-types-grid">
          {interviewTypes.map((type, index) => (
            <div
              key={type.id}
              className={`interview-type-card ${selectedType === type.id ? 'selected' : ''} ${!type.active ? 'disabled' : ''} fade-in`}
              style={{ animationDelay: `${index * 0.1}s` }}
              onClick={() => handleSelectType(type)}
            >
              {type.comingSoon && (
                <div className="coming-soon-badge">Coming Soon</div>
              )}
              
              <div className="card-icon">{type.icon}</div>
              
              <h3>{type.name}</h3>
              
              <p className="card-description">{type.description}</p>
              
              <div className="card-meta">
                <div className="meta-item">
                  <span className="meta-icon">⏱️</span>
                  <span>{type.duration}</span>
                </div>
                <div className="meta-item">
                  <span className="meta-icon">📊</span>
                  <span>{type.difficulty}</span>
                </div>
              </div>
              
              <div className="card-features">
                {type.features.map((feature, idx) => (
                  <div key={idx} className="feature-item">
                    <span className="feature-check">✓</span>
                    <span>{feature}</span>
                  </div>
                ))}
              </div>
              
              {type.active && (
                <div className="card-action">
                  <button 
                    className={`btn ${selectedType === type.id ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelectType(type);
                    }}
                  >
                    {selectedType === type.id ? 'Selected ✓' : 'Select'}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

        {selectedType && (
          <div className="selection-footer fade-in">
            <button 
              className="btn btn-primary btn-large"
              onClick={handleStartInterview}
            >
              Start {interviewTypes.find(t => t.id === selectedType)?.name} →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default InterviewTypeSelection;
