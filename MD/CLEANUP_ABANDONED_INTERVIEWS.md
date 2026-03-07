# Cleanup Abandoned Interviews

## Problem
"in_progress" interviews that were never completed were cluttering the database and showing in the dashboard history.

## Solution Implemented

### 1. Dashboard Filter (Already Applied)
- Dashboard now only shows `status = 'completed'` interviews
- "in_progress" interviews are hidden from history

### 2. Auto-Cleanup on New Interview (Already Applied)
- When a user starts a new interview, any abandoned "in_progress" interviews for that user are automatically deleted
- This prevents accumulation of abandoned interviews

### 3. One-Time Database Cleanup (Run This Once)

To remove all existing abandoned "in_progress" interviews from the database:

```bash
cd server
node scripts/cleanupAbandonedInterviews.js
```

This script will:
- Find all interviews with `status = 'in_progress'`
- Delete their assessments (if any)
- Delete their Q&A pairs
- Delete the interview sessions
- Show a summary of what was deleted

## What Happens Now

### When User Abandons Interview
- Interview stays in database with `status = 'in_progress'`
- NOT shown in dashboard history
- Automatically deleted when user starts a new interview

### When User Switches Tabs and Chooses "Leave"
- Interview is immediately deleted via `/terminate` endpoint
- Nothing stored in database

### When User Completes Interview
- Status changes to `completed`
- Shows in dashboard history with scores

## Run the Cleanup

```bash
# Navigate to server directory
cd server

# Run the cleanup script
node scripts/cleanupAbandonedInterviews.js
```

Expected output:
```
🧹 Starting cleanup of abandoned interviews...
📊 Found X abandoned interview(s)
   Deleting interview 123 (user: 456, started: 2024-01-01)
   Deleting interview 124 (user: 789, started: 2024-01-02)
✅ Successfully deleted X abandoned interview(s)
🎉 Database cleanup complete!
```

## Files Modified

1. `server/controllers/dashboardController.js` - Filter to show only completed interviews
2. `server/controllers/interviewController.js` - Auto-cleanup on new interview start
3. `server/scripts/cleanupAbandonedInterviews.js` - One-time cleanup script (NEW)
