# Groq AI Integration - Setup Guide

## ✅ What Was Done:

1. **Installed Groq SDK** - `groq-sdk` package added
2. **Created Groq Service** - `server/services/groqService.js`
3. **Updated All Controllers** - Switched from Bedrock to Groq
4. **Added Fallbacks** - System still works if Groq fails

---

## 🔑 Get Your FREE Groq API Key (2 minutes):

### Step 1: Sign Up
1. Go to: **https://console.groq.com**
2. Click "Sign Up" (free account)
3. Use your email or Google/GitHub

### Step 2: Create API Key
1. After login, go to **"API Keys"** section
2. Click **"Create API Key"**
3. Give it a name (e.g., "Mock Interview")
4. Click **"Create"**
5. **COPY THE KEY** (you'll only see it once!)

### Step 3: Add to .env File
1. Open `server/.env`
2. Find this line:
   ```
   GROQ_API_KEY=your_groq_api_key_here
   ```
3. Replace `your_groq_api_key_here` with your actual key:
   ```
   GROQ_API_KEY=gsk_abc123xyz...
   ```
4. Save the file

---

## 🚀 Start the Application:

### Terminal 1 - Backend:
```bash
cd server
npm start
```

Wait for: `🚀 Server running on port 5000`

### Terminal 2 - Frontend:
```bash
cd client
npm start
```

Browser opens at `http://localhost:3000`

---

## ✅ Test It Works:

1. **Sign in** to your account
2. **Go to Practice** page
3. **Select a role** (e.g., Software Engineer)
4. **Start interview**
5. **Check backend console** - Should see:
   ```
   ✅ Used Groq for question generation
   ```

If you see this, Groq is working! 🎉

---

## 🆓 Groq Free Tier Limits:

```
Daily Limits:
- 14,400 requests per day
- 30 requests per minute

Your Usage:
- ~20 requests per interview
- = 720 interviews per day
- = MORE than enough!
```

---

## 🐛 Troubleshooting:

### Error: "API key is invalid"
- Check you copied the full key
- Make sure no extra spaces
- Key should start with `gsk_`

### Error: "Rate limit exceeded"
- Wait 1 minute
- You hit 30 requests/minute limit
- System will use fallback questions

### Error: "Network error"
- Check internet connection
- Groq servers might be down
- System will use fallback questions

---

## 🎯 What Groq Does:

1. **Resume Parsing** - Extracts structured data from resume
2. **Question Generation** - Creates smart interview questions
3. **Answer Evaluation** - Assesses answer quality
4. **Report Generation** - Creates comprehensive feedback

All using **Llama 3.1 8B** model (fast & smart!)

---

## 🔄 Fallback System:

If Groq fails, system automatically uses:
1. Pre-defined question templates
2. Rule-based scoring
3. Template-based reports

**Your app never crashes!** ✅

---

## 📊 Groq vs Bedrock:

| Feature | Groq | Bedrock |
|---------|------|---------|
| Cost | FREE | Requires payment |
| Speed | Very Fast | Fast |
| Setup | 2 minutes | Complex |
| Limits | 14,400/day | Pay per use |
| Quality | Excellent | Excellent |

**Groq is perfect for your use case!** 🎯

---

## ✅ Ready to Test!

Once you add your Groq API key, restart the backend and test the practice interview flow.

**Everything should work perfectly now!** 🚀
