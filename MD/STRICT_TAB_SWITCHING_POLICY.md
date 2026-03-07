# Strict Tab Switching Policy - Zero Tolerance

## Overview
Implemented a **zero-tolerance policy** for tab switching during interviews. Any attempt to switch tabs (Alt+Tab, Ctrl+Tab, or clicking away) will immediately terminate the interview and permanently delete it from the database.

---

## ⚠️ Policy Details

### What Triggers Termination:
1. **Alt+Tab** - Switching to another application
2. **Ctrl+Tab** - Switching to another browser tab
3. **Clicking outside browser** - Clicking on another window
4. **Minimizing browser** - Minimizing the interview window
5. **Any action that hides the page** - Detected by `document.hidden`

### Consequences:
1. ✅ Interview **immediately terminated**
2. ✅ Interview **permanently deleted** from database
3. ✅ Interview **will NOT appear** in dashboard
4. ✅ No assessment generated
5. ✅ No partial credit given
6. ✅ User redirected to dashboard with alert

---

## 🔒 Implementation Details

### Frontend (Client-Side)

#### Detection Mechanism:
```javascript
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    // Tab switched - terminate immediately
  }
});
```

#### Termination Flow:
1. Detect `document.hidden` event
2. Set `isTerminating` flag to prevent duplicate calls
3. Clear interview timer
4. Show termination alert to user
5. Call backend DELETE endpoint
6. Exit fullscreen mode
7. Redirect to dashboard after 1 second

#### User Warnings:
- **Before starting:** Confirmation dialog explaining rules
- **During interview:** Prominent warning banner at top
- **On violation:** Alert explaining termination

### Backend (Server-Side)

#### New Endpoint:
```
DELETE /api/interview/:id/terminate
```

#### Deletion Process:
1. Verify session belongs to user
2. Delete assessments (if any)
3. Delete all Q&A pairs
4. Delete interview session
5. Log termination event
6. Return success response

#### Database Cleanup:
```sql
DELETE FROM assessments WHERE session_id = ?
DELETE FROM qa_pairs WHERE session_id = ?
DELETE FROM interview_sessions WHERE id = ?
```

---

## 📋 User Experience Flow

### Before Interview:
1. User uploads resume or selects practice role
2. **Confirmation dialog appears** with strict rules:
   - Fullscreen mode required
   - Copy/Paste disabled
   - Right-click disabled
   - **Tab switching = immediate termination**
   - Interview will NOT be saved if violated
3. User must click "OK" to proceed
4. User can click "Cancel" to abort

### During Interview:
1. Interview enters fullscreen automatically
2. **Warning banner displayed** at top:
   - "⛔ STRICT MODE ACTIVE"
   - "WARNING: Switching tabs will IMMEDIATELY TERMINATE and DELETE this interview!"
3. User answers questions normally
4. If user switches tabs:
   - **Immediate termination**
   - Alert: "TAB SWITCHING DETECTED! Your interview has been terminated..."
   - Redirect to dashboard
   - Interview deleted from database

### After Violation:
1. User sees termination alert
2. User redirected to dashboard
3. Terminated interview does NOT appear in history
4. User can start a new interview
5. No record of terminated interview exists

---

## 🎯 Benefits

### For Interview Integrity:
- ✅ Prevents cheating by searching questions online
- ✅ Prevents referencing external materials
- ✅ Ensures authentic, real-time responses
- ✅ Creates fair evaluation environment
- ✅ Mimics real interview conditions

### For Employers:
- ✅ Confidence in candidate authenticity
- ✅ Reliable assessment results
- ✅ No contaminated data from cheating attempts
- ✅ Professional interview standards
- ✅ Reduced false positives

### For System:
- ✅ Clean database (no incomplete/invalid interviews)
- ✅ Clear audit trail (termination logged)
- ✅ Reduced storage (terminated interviews deleted)
- ✅ Better data quality
- ✅ Simplified analytics

---

## 🧪 Testing Checklist

### Tab Switching Detection:
- [ ] Alt+Tab to another application → Interview terminated
- [ ] Ctrl+Tab to another browser tab → Interview terminated
- [ ] Click on another window → Interview terminated
- [ ] Minimize browser → Interview terminated
- [ ] Switch to another virtual desktop → Interview terminated

### Termination Process:
- [ ] Alert message displays correctly
- [ ] Timer stops immediately
- [ ] Fullscreen exits
- [ ] Backend DELETE endpoint called
- [ ] Interview deleted from database
- [ ] User redirected to dashboard
- [ ] Interview does NOT appear in dashboard

### User Warnings:
- [ ] Confirmation dialog shows before starting
- [ ] User can cancel and not start interview
- [ ] Warning banner visible during interview
- [ ] Termination alert explains what happened
- [ ] Messages are clear and professional

### Edge Cases:
- [ ] Multiple rapid tab switches (only one termination call)
- [ ] Network failure during termination (graceful handling)
- [ ] User closes browser during termination (cleanup still happens)
- [ ] Termination during answer submission (no data corruption)
- [ ] Termination with timer at 0 (no conflicts)

### Database Integrity:
- [ ] All related records deleted (assessments, Q&A, session)
- [ ] No orphaned records remain
- [ ] Foreign key constraints respected
- [ ] Deletion logged in console
- [ ] No errors in database

---

## 📊 Technical Specifications

### Frontend Files Modified:
- `client/src/pages/Interview.js`
  - Added `isTerminating` state
  - Added `tabSwitchCount` state (for future analytics)
  - Modified `visibilitychange` handler
  - Added confirmation dialog
  - Updated warning banner

- `client/src/pages/Practice.js`
  - Same modifications as Interview.js
  - Consistent behavior across both modes

### Backend Files Modified:
- `server/controllers/interviewController.js`
  - Added `terminateInterview` function
  - Handles DELETE request
  - Deletes all related records
  - Logs termination event

- `server/routes/interview.js`
  - Added DELETE route: `/:id/terminate`
  - Protected with authentication middleware
  - Maps to `terminateInterview` controller

### API Endpoint:
```
DELETE /api/interview/:id/terminate
Authorization: Bearer <token>

Response:
{
  "success": true,
  "message": "Interview terminated and deleted due to policy violation"
}
```

---

## 🔐 Security Considerations

### Why This Approach:
1. **Client-side detection** - Fast, immediate response
2. **Server-side deletion** - Ensures data integrity
3. **Authentication required** - Prevents unauthorized deletions
4. **User verification** - Only owner can terminate their interview
5. **Audit logging** - Console logs track terminations

### Potential Bypasses (and mitigations):
1. **Disable JavaScript** → Interview won't load at all
2. **Browser DevTools** → F12 and Ctrl+Shift+I blocked
3. **Multiple monitors** → Fullscreen still required, tab switching still detected
4. **Virtual machines** → Tab switching still detected
5. **Screen sharing** → Not detectable (acceptable risk)

### Privacy Considerations:
- ✅ No webcam/microphone access required
- ✅ No screen recording
- ✅ No keystroke logging
- ✅ Only tab visibility monitored
- ✅ User explicitly warned and consents

---

## 📈 Analytics & Monitoring

### Metrics to Track:
1. **Termination rate** - % of interviews terminated
2. **Termination timing** - When in interview terminations occur
3. **User behavior** - Do users retry after termination?
4. **False positives** - Legitimate terminations (browser crashes, etc.)
5. **Completion rate** - % of interviews completed successfully

### Logging:
```javascript
console.log(`⛔ Terminating interview ${sessionId} due to tab switching violation`);
console.log(`✅ Interview ${sessionId} deleted successfully`);
```

### Future Enhancements:
1. Store termination events in separate table (for analytics)
2. Track termination reasons (tab switch, time up, user quit)
3. Generate reports on interview integrity
4. Alert admins of suspicious patterns
5. Implement cooldown period after termination

---

## 💡 User Education

### Before Interview:
- Clear rules in confirmation dialog
- Explanation of consequences
- Opportunity to cancel and prepare

### During Interview:
- Prominent warning banner
- Visual reminder of strict mode
- No ambiguity about rules

### After Violation:
- Clear explanation of what happened
- No blame or judgment
- Opportunity to try again
- Encouragement to follow rules

---

## 🎓 Best Practices

### For Users:
1. **Close all other applications** before starting
2. **Disable notifications** (email, Slack, etc.)
3. **Use a quiet environment** with no interruptions
4. **Read the rules carefully** before starting
5. **Focus solely on the interview** - no multitasking

### For Administrators:
1. **Monitor termination rates** - High rates may indicate UX issues
2. **Review user feedback** - Are rules too strict?
3. **Test regularly** - Ensure detection works correctly
4. **Document clearly** - Users should know what to expect
5. **Be consistent** - Apply rules fairly to all users

---

## 🚀 Deployment Notes

### Pre-Deployment:
- [ ] Test on all major browsers
- [ ] Test on different operating systems
- [ ] Verify database deletion works correctly
- [ ] Ensure no data corruption possible
- [ ] Test with slow network connections

### Post-Deployment:
- [ ] Monitor error logs for issues
- [ ] Track termination rates
- [ ] Collect user feedback
- [ ] Adjust rules if needed
- [ ] Document any issues found

### Rollback Plan:
If issues arise:
1. Revert to warning-only mode (no termination)
2. Fix issues in development
3. Re-test thoroughly
4. Re-deploy with fixes

---

## ✅ Status

**Implementation:** COMPLETE

**Testing:** Ready for testing

**Documentation:** Complete

**Deployment:** Ready for production

---

## 📝 Summary

This strict tab switching policy ensures interview integrity by immediately terminating and deleting any interview where the user switches tabs. The policy is clearly communicated to users before they start, enforced during the interview, and explained after any violation. This creates a fair, professional interview environment that mimics real-world interview conditions and ensures authentic candidate evaluation.

**Zero tolerance. Zero exceptions. Zero compromises.**
