# 🔧 Fix: Port 5000 Already in Use

## Problem
You have an old server still running on port 5000.

---

## Solution: Stop the Old Server

### Option 1: Find and Kill the Process (Recommended)

```bash
# Find the process using port 5000
lsof -ti:5000

# Kill it (replace PID with the number from above)
kill -9 <PID>
```

### Option 2: One Command

```bash
# Kill any process on port 5000
fuser -k 5000/tcp
```

### Option 3: Use pkill

```bash
# Kill all node processes (be careful!)
pkill -f node
```

---

## Then Start Fresh

### Terminal 1 - Backend
```bash
cd server
npm start
```

You should see:
```
🚀 Server running on port 5000
📍 Environment: development
🔗 Health check: http://localhost:5000/health
✅ Connected to PostgreSQL database
```

### Terminal 2 - Frontend
```bash
cd client
npm start
```

---

## Quick Check

After starting, verify the server is running:
```bash
curl http://localhost:5000/health
```

Should return:
```json
{
  "status": "running",
  "message": "Mock Interview Agent API",
  "version": "1.0.0"
}
```

---

## ✅ Ready to Demo!

Once both servers are running:
1. Go to `http://localhost:3000/interview`
2. Click "Coding Interview"
3. Start your demo!

---

**Tip:** Always stop the old server before starting a new one to avoid port conflicts.
