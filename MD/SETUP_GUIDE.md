# Complete PERN Stack Setup Guide

## Project Status

✅ **Completed:**
- Project structure created
- Database schema designed
- AWS Bedrock service (LLM extraction - PRIMARY)
- Resume processing service (with regex fallback)
- Authentication middleware
- Package.json configurations

🔄 **Remaining Files to Create:**

### Backend (server/)
1. `routes/auth.js` - Authentication routes (register, login)
2. `routes/resume.js` - Resume upload and retrieval
3. `routes/interview.js` - Interview session management
4. `routes/practice.js` - Practice interview roles
5. `routes/dashboard.js` - User dashboard data
6. `controllers/authController.js` - Auth logic
7. `controllers/resumeController.js` - Resume processing logic
8. `controllers/interviewController.js` - Interview logic
9. `services/chromaService.js` - ChromaDB vector storage
10. `utils/fileUpload.js` - Multer configuration

### Frontend (client/)
1. Complete React app structure
2. Pages: Home, SignIn, SignUp, Interview, Practice, Dashboard
3. Components: Navbar, ResumeUpload, InterviewChat, AssessmentCard
4. Services: API client with axios
5. Styling: Modern CSS with gradients and animations

## Quick Setup Steps

### 1. Install Dependencies

```bash
# Backend
cd server
npm install

# Frontend
cd ../client
npx create-react-app . --template javascript
npm install axios react-router-dom
```

### 2. Configure Environment

```bash
# Copy and edit .env
cp server/.env.example server/.env
# Add your AWS credentials and database URL
```

### 3. Setup Database

```bash
# Run migrations
cd server
npm run migrate
```

### 4. Start Development

```bash
# Terminal 1: Backend
cd server
npm run dev

# Terminal 2: Frontend
cd client
npm start
```

## Architecture Overview

```
PERN Stack Architecture:
┌─────────────────────────────────────────────────────────┐
│                    React Frontend                        │
│  (Home, Auth, Interview, Practice, Dashboard)           │
└────────────────────┬────────────────────────────────────┘
                     │ HTTP/REST API
┌────────────────────▼────────────────────────────────────┐
│              Express.js Backend                          │
│  ┌──────────────────────────────────────────────────┐  │
│  │  Routes → Controllers → Services                  │  │
│  └──────────────────────────────────────────────────┘  │
└─────┬──────────────┬──────────────┬────────────────────┘
      │              │              │
      ▼              ▼              ▼
┌──────────┐  ┌──────────┐  ┌──────────────┐
│PostgreSQL│  │ ChromaDB │  │ AWS Bedrock  │
│          │  │ (Vectors)│  │ (LLM - PRIMARY)│
└──────────┘  └──────────┘  └──────────────┘
```

## Resume Processing Flow (LLM PRIMARY)

```
1. User uploads PDF
   ↓
2. Validate: PDF format, max 3 pages
   ↓
3. Extract text using pdf-parse
   ↓
4. PRIMARY: Send to AWS Bedrock Claude 3 Haiku
   ├─ Success → Use LLM extracted data
   └─ Failure → FALLBACK to regex extraction
   ↓
5. Store in PostgreSQL
   ↓
6. Return structured JSON (<5 seconds total)
```

## Key Features Implementation

### 1. Home Page
- Hero section with gradient background
- "Get Started" CTA button
- Feature highlights
- Responsive design

### 2. Authentication
- Sign Up: email, password, name
- Sign In: email, password
- JWT token storage in localStorage
- Protected routes

### 3. Resume-Based Interview
- Drag-and-drop PDF upload
- Real-time processing status
- Display extracted resume data
- Start interview button
- Chat interface for Q&A
- Assessment results page

### 4. Practice Interview
- Role selection (Software Engineer, Data Scientist, etc.)
- No resume required
- Pre-defined question sets
- Same chat interface
- Assessment at end

### 5. Dashboard
- Interview history list
- Performance scores visualization
- Resume data display
- Trend analysis

## API Endpoints Reference

### Auth
- `POST /api/auth/register` - Create account
- `POST /api/auth/login` - Login

### Resume
- `POST /api/resume/upload` - Upload PDF (multipart/form-data)
- `GET /api/resume/:id` - Get resume data

### Interview
- `POST /api/interview/start` - Start session
- `POST /api/interview/:id/answer` - Submit answer
- `POST /api/interview/:id/complete` - End interview
- `GET /api/interview/:id` - Get interview details

### Practice
- `GET /api/practice/roles` - List available roles
- `POST /api/practice/start` - Start practice interview

### Dashboard
- `GET /api/dashboard` - Get user data, interviews, stats

## Next Steps

1. **Create remaining backend routes and controllers**
2. **Build React frontend with all pages**
3. **Test complete flow end-to-end**
4. **Deploy to Vercel (frontend) + Render (backend)**

## Performance Targets

- ✅ Resume processing: <5 seconds
- ✅ Question generation: <3 seconds
- ✅ Dashboard load: <2 seconds
- ✅ LLM as primary extraction method
- ✅ Regex as fallback only

## Tech Stack Summary

**Frontend:** React.js (JavaScript), React Router, Axios, CSS3
**Backend:** Node.js, Express.js, JWT, Multer, pdf-parse
**Database:** PostgreSQL (relational data)
**Vector DB:** ChromaDB (Q&A embeddings)
**LLM:** AWS Bedrock Claude 3 Haiku (PRIMARY extraction)
**Deployment:** Vercel + Render/Railway

---

**Status:** Core backend services created. Need to complete routes, controllers, and entire frontend.
