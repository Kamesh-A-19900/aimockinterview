# Mock Interview Agent - Demo Guide

## 🎯 Quick Demo Steps

### Prerequisites
- Node.js installed
- PostgreSQL database running (AWS RDS configured)
- AWS Bedrock access configured

### 1. Setup (First Time Only)

```bash
# Install backend dependencies
cd server
npm install

# Run database migration
npm run migrate

# Go back to root
cd ..

# Install frontend dependencies
cd client
npm install
cd ..
```

### 2. Start the Application

**Terminal 1 - Backend:**
```bash
cd server
npm start
```
Wait for: `🚀 Server running on port 5000`

**Terminal 2 - Frontend:**
```bash
cd client
npm start
```
Browser will open at `http://localhost:3000`

### 3. Demo Flow

#### Step 1: Home Page
- Beautiful landing page with hero section
- Features overview
- "Get Started" button

#### Step 2: Sign Up
1. Click "Get Started" or "Sign Up"
2. Fill in:
   - Name: "Demo User"
   - Email: "demo@example.com"
   - Password: "demo123"
3. Click "Sign Up"
4. Automatically logged in and redirected to Dashboard

#### Step 3: Dashboard (First Visit)
- Welcome message with your name
- Stats cards showing 0 interviews
- Empty state: "No interviews yet"
- Two action buttons:
  - "Start Interview" (resume-based)
  - "Practice Mode" (role-based)

#### Step 4: Upload Resume
1. Click "Start Interview"
2. Drag and drop a PDF resume (max 3 pages)
   - Or click to browse
3. System processes resume:
   - Extracts text from PDF
   - Uses AWS Bedrock LLM to extract structured data
   - Fallback to regex if LLM fails
   - Target: <5 seconds
4. Shows extracted information:
   - Name, email, phone
   - Skills, experience, education
   - Projects, languages

#### Step 5: Resume-Based Interview
1. After resume upload, interview starts automatically
2. AI generates first question based on your resume
3. Type your answer in the chat interface
4. Submit answer
5. AI analyzes your response and generates follow-up question
6. Continue for 5-10 questions
7. Click "Complete Interview"

#### Step 6: Assessment
After completing interview:
- Overall Score (0-100)
- Breakdown scores:
  - Communication Skills
  - Answer Correctness
  - Confidence Level
  - Stress Handling
- Detailed feedback text
- Suggestions for improvement

#### Step 7: Practice Mode (Alternative Path)
1. From Dashboard, click "Practice Mode"
2. Choose a job role:
   - 💻 Software Engineer
   - 🎨 Frontend Developer
   - ⚙️ Backend Developer
   - 📊 Data Scientist
   - 📱 Product Manager
   - 🚀 DevOps Engineer
3. Start practice interview (no resume needed)
4. Answer general questions for that role
5. Complete and get assessment

#### Step 8: View History
1. Return to Dashboard
2. See all completed interviews
3. View stats:
   - Total Interviews
   - Average Score
   - Best Score
4. Click on any interview to see:
   - Full Q&A transcript
   - Detailed scores
   - Feedback

## 🎬 Demo Script (5 Minutes)

### Minute 1: Introduction
"This is the Mock Interview Agent - an AI-powered platform that helps job seekers practice interviews. It uses AWS Bedrock Claude 3 Haiku to conduct realistic, adaptive interviews."

### Minute 2: Sign Up & Dashboard
"Let me create an account... [Sign up] ...and here's the dashboard. It tracks all my interview history and performance metrics."

### Minute 3: Resume Upload
"I'll upload my resume... [Upload PDF] ...the system extracts my information using AI in under 5 seconds. It captures my skills, experience, and projects."

### Minute 4: Interview Session
"Now the AI conducts a personalized interview based on my resume... [Answer 2-3 questions] ...notice how it asks follow-up questions based on my answers. It's adaptive and conversational."

### Minute 5: Assessment & Practice
"After completing the interview, I get a comprehensive assessment with scores across multiple dimensions... [Show scores] ...I can also practice with role-specific questions without uploading a resume."

## 🔍 Key Features to Highlight

### Technical Excellence
- **Fast Processing**: Resume extraction in <5 seconds
- **LLM-First Approach**: AWS Bedrock Claude 3 Haiku for intelligent extraction
- **Fallback System**: Regex extraction if LLM fails
- **Adaptive Questions**: Context-aware follow-ups based on answers

### User Experience
- **Beautiful UI**: Modern design with gradients and animations
- **Responsive**: Works on mobile, tablet, and desktop
- **Intuitive Flow**: Clear navigation and user guidance
- **Real-time Feedback**: Loading states and progress indicators

### Interview Quality
- **Personalized**: Questions based on your actual resume
- **Comprehensive Assessment**: 4 dimensions + overall score
- **Detailed Feedback**: Actionable suggestions for improvement
- **Practice Mode**: Role-specific questions without resume

### Architecture
- **PERN Stack**: PostgreSQL, Express.js, React.js, Node.js
- **RESTful API**: Clean, well-documented endpoints
- **JWT Authentication**: Secure user sessions
- **AWS Integration**: Bedrock for LLM, RDS for database

## 📊 Sample Data for Demo

### Sample Resume Content
If you need a quick test resume, create a PDF with:
```
John Doe
john.doe@example.com | +1-234-567-8900
linkedin.com/in/johndoe | github.com/johndoe

SUMMARY
Experienced software engineer with 5 years in full-stack development.

SKILLS
JavaScript, React, Node.js, PostgreSQL, AWS, Python, Docker

EXPERIENCE
Senior Software Engineer | Tech Corp | 2021-Present
- Built scalable web applications serving 1M+ users
- Led team of 5 developers on microservices architecture

Software Engineer | StartupXYZ | 2019-2021
- Developed RESTful APIs using Node.js and Express
- Implemented CI/CD pipelines with GitHub Actions

EDUCATION
B.S. Computer Science | University of Technology | 2019

PROJECTS
E-commerce Platform: Built full-stack app with React and Node.js
AI Chatbot: Developed using Python and OpenAI API
```

### Sample Interview Questions You Might Get
1. "Tell me about your experience with microservices architecture at Tech Corp."
2. "How did you handle scaling challenges with 1M+ users?"
3. "Describe your approach to implementing CI/CD pipelines."
4. "What was the most challenging technical problem you solved?"
5. "How do you ensure code quality in your team?"

### Sample Answers (Good Examples)
- Be specific with examples
- Mention technologies used
- Explain your thought process
- Discuss outcomes and learnings
- Show problem-solving skills

## 🐛 Troubleshooting

### Backend Won't Start
```bash
# Check if port 5000 is available
lsof -i :5000

# Check database connection
cd server
node -e "require('./config/database').pool.query('SELECT NOW()')"
```

### Frontend Won't Start
```bash
# Clear cache and reinstall
cd client
rm -rf node_modules package-lock.json
npm install
npm start
```

### Resume Upload Fails
- Ensure file is PDF format
- Check file size (<10MB)
- Verify max 3 pages
- Check uploads/ directory exists

### AWS Bedrock Errors
- Verify credentials in .env
- Check region is us-east-1
- Ensure model access is enabled
- Test with AWS CLI: `aws bedrock list-foundation-models`

## 🚀 Production Deployment

### Backend (Render/Railway)
1. Push code to GitHub
2. Connect repository to Render/Railway
3. Set environment variables
4. Deploy

### Frontend (Vercel)
1. Push code to GitHub
2. Import project to Vercel
3. Configure build settings
4. Deploy

### Database (Already on AWS RDS)
- ✅ PostgreSQL running on AWS RDS
- ✅ Connection configured in .env
- ✅ Tables created via migration

## 📈 Future Enhancements

- Video/audio interview support
- Real-time speech analysis
- Interview scheduling
- Team collaboration features
- Analytics dashboard
- Mobile app
- Integration with job boards
- AI-powered resume builder

## 🎓 Learning Resources

- [AWS Bedrock Documentation](https://docs.aws.amazon.com/bedrock/)
- [PostgreSQL Guide](https://www.postgresql.org/docs/)
- [React Documentation](https://react.dev/)
- [Express.js Guide](https://expressjs.com/)
- [JWT Authentication](https://jwt.io/)

---

**Ready to demo!** 🎉

Start both servers and navigate to `http://localhost:3000`
