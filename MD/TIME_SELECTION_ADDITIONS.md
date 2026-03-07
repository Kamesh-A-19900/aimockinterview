# Time Selection Feature - Manual Additions Needed

## ✅ Already Done:
- Added CSS styles for time selection and timer
- Added timer management functions
- Added time state variables

## 📝 What You Need to Add to Interview.js:

### 1. Add Time Selection UI (in upload section, after upload-info div):

```jsx
<div className="time-selection">
  <h4>⏱️ Select Interview Duration:</h4>
  <div className="time-options">
    <button 
      className={`time-option ${timeLimit === 30 ? 'active' : ''}`}
      onClick={() => setTimeLimit(30)}
    >
      <div className="time-value">30</div>
      <div className="time-label">Minutes</div>
    </button>
    <button 
      className={`time-option ${timeLimit === 60 ? 'active' : ''}`}
      onClick={() => setTimeLimit(60)}
    >
      <div className="time-value">60</div>
      <div className="time-label">Minutes</div>
    </button>
    <button 
      className={`time-option ${timeLimit === 120 ? 'active' : ''}`}
      onClick={() => setTimeLimit(120)}
    >
      <div className="time-value">120</div>
      <div className="time-label">Minutes</div>
    </button>
  </div>
</div>
```

### 2. Update Interview Header (replace existing interview-header div):

```jsx
<div className="interview-header">
  <div>
    <h1>Interview in Progress</h1>
    <p className="subtitle">Answer the questions to the best of your ability</p>
  </div>
  <div className="interview-controls">
    {timeRemaining !== null && (
      <div className="timer" style={{ color: getTimeColor() }}>
        <span className="timer-icon">⏱️</span>
        <span className="timer-value">{formatTime(timeRemaining)}</span>
      </div>
    )}
    <button 
      onClick={handleCompleteInterview} 
      className="btn btn-secondary"
      disabled={loading || messages.length < 4}
    >
      Complete Interview
    </button>
  </div>
</div>
```

## ✅ Features Included:
- 3 time options: 30min, 1hr, 2hr
- Live countdown timer
- Color changes (green → orange → red)
- Warnings at 5min and 1min
- Auto-complete when time runs out
- Timer clears on manual completion

---

## Alternative: I can create a complete new Interview.js file

Would you like me to:
1. Create a complete new Interview.js with all features? (Recommended)
2. Or you manually add the above code snippets?

Let me know and I'll proceed!
