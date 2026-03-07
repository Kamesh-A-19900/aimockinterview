# Foreign Key Constraint Fix

## ✅ Issue Resolved

Fixed the foreign key constraint error: `insert or update on table "resumes" violates foreign key constraint "resumes_user_id_fkey"`

---

## 🔍 Root Cause

The error occurred when trying to insert a resume with a `user_id` that doesn't exist in the `users` table. This can happen when:

1. JWT token contains a userId for a deleted user
2. Database was reset but tokens weren't invalidated
3. User was manually deleted from database
4. Token was tampered with

---

## 🔧 Solution Implemented

### 1. Enhanced Authentication Middleware

**File**: `server/middleware/auth.js`

**Changes**:
- Added database verification of user existence
- Made middleware async to support database queries
- Added specific error messages for different JWT errors
- Stores full user details in `req.userDetails` for convenience

**Before**:
```javascript
const authenticateToken = (req, res, next) => {
  // Only verified JWT token
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  req.user = decoded;
  next();
};
```

**After**:
```javascript
const authenticateToken = async (req, res, next) => {
  // Verify JWT token
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  
  // Verify user exists in database
  const userCheck = await query(
    'SELECT id, email, name FROM users WHERE id = $1',
    [decoded.userId]
  );
  
  if (userCheck.rows.length === 0) {
    return res.status(401).json({
      success: false,
      message: 'User not found. Please login again.'
    });
  }
  
  req.user = decoded;
  req.userDetails = userCheck.rows[0];
  next();
};
```

### 2. Enhanced Resume Controller

**File**: `server/controllers/resumeController.js`

**Changes**:
- Added detailed logging for debugging
- Added specific error handling for foreign key violations (error code 23503)
- Better error messages for users

**Error Handling**:
```javascript
if (error.code === '23503') {
  return res.status(401).json({
    success: false,
    message: 'User authentication error. Please login again.'
  });
}
```

---

## 🎯 Benefits

### Security
✅ Prevents operations with invalid user IDs
✅ Catches deleted/invalid users immediately
✅ Forces re-authentication when needed

### User Experience
✅ Clear error messages
✅ Automatic cleanup of uploaded files on error
✅ Prompts user to login again

### Debugging
✅ Detailed console logging
✅ Error code tracking
✅ Better error context

---

## 📊 Error Handling Flow

### Before Fix
```
1. User uploads resume
2. JWT verified (valid token)
3. Try to insert resume with user_id
4. ❌ Foreign key constraint violation
5. Generic 500 error
```

### After Fix
```
1. User uploads resume
2. JWT verified (valid token)
3. ✅ Check if user exists in database
4. If user doesn't exist:
   - Clean up uploaded file
   - Return 401 with clear message
   - User prompted to login again
5. If user exists:
   - Insert resume successfully
   - Return success response
```

---

## 🔍 Error Codes

| Code | Meaning | Action |
|------|---------|--------|
| 23503 | Foreign key violation | User doesn't exist - force re-login |
| JsonWebTokenError | Invalid JWT | Token is malformed - force re-login |
| TokenExpiredError | Expired JWT | Token expired - force re-login |

---

## 🧪 Testing

### Test Case 1: Valid User
```bash
# Login
POST /api/auth/login
Response: { token: "valid_jwt_token" }

# Upload Resume
POST /api/resume/upload
Headers: { Authorization: "Bearer valid_jwt_token" }
Result: ✅ Success - Resume uploaded
```

### Test Case 2: Deleted User
```bash
# User has valid JWT but was deleted from database
POST /api/resume/upload
Headers: { Authorization: "Bearer token_for_deleted_user" }
Result: ❌ 401 - "User not found. Please login again."
```

### Test Case 3: Invalid Token
```bash
# Invalid or tampered JWT
POST /api/resume/upload
Headers: { Authorization: "Bearer invalid_token" }
Result: ❌ 401 - "Invalid token. Please login again."
```

### Test Case 4: Expired Token
```bash
# Expired JWT
POST /api/resume/upload
Headers: { Authorization: "Bearer expired_token" }
Result: ❌ 401 - "Token expired. Please login again."
```

---

## 📝 Logging Output

### Successful Upload
```
📄 Processing resume for user 123
✅ Resume processed successfully for user 123
✅ Resume saved to database with ID 456
```

### Failed Upload (User Not Found)
```
Auth middleware: User 123 not found in database
```

### Failed Upload (Foreign Key Error)
```
❌ Resume upload error: Error: insert or update on table "resumes" violates foreign key constraint
   Error details: {
     message: "...",
     code: "23503",
     detail: "Key (user_id)=(123) is not present in table \"users\"."
   }
🗑️  Cleaned up uploaded file
```

---

## 🚀 Deployment Notes

### No Breaking Changes
- Existing valid tokens continue to work
- Only affects invalid/deleted users
- Backward compatible

### Database Impact
- No schema changes required
- No migration needed
- Uses existing foreign key constraints

### Performance Impact
- Minimal: One additional SELECT query per authenticated request
- Query is fast (indexed on user.id)
- Cached by connection pool

---

## 🔮 Future Enhancements

Possible improvements:
- Cache user existence checks (Redis)
- Implement token refresh mechanism
- Add user session management
- Track login history
- Implement device tracking
- Add suspicious activity detection

---

**Status**: ✅ FIXED
**Last Updated**: March 7, 2026
**Impact**: All authenticated endpoints
**Breaking Changes**: None
