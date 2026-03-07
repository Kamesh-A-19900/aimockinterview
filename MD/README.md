# Mock Interview Agent - PERN Stack

AI-powered mock interview platform with resume analysis and role-based practice interviews.

## Tech Stack

- **Frontend**: React.js (JavaScript, no TypeScript)
- **Backend**: Node.js + Express.js
- **Database**: PostgreSQL
- **LLM**: AWS Bedrock (Claude 3 Haiku) - Primary extraction method
- **Vector DB**: ChromaDB for interview Q&A storage

## Features

- 🎯 **Resume-Based Interviews**: Upload resume, get personalized interview questions
- 📝 **Practice Interviews**: Role-based practice without resume (Software Engineer, Data Scientist, etc.)
- 🤖 **AI-Powered**: AWS Bedrock for intelligent question generation and assessment
- 📊 **Performance Analytics**: Multi-dimensional assessment with detailed feedback
- 🎨 **Modern UI**: Responsive, interactive design with smooth animations
- ⚡ **Fast Processing**: Resume extraction in <5 seconds

## Quick Start

### Prerequisites

- Node.js 18+ and npm
- PostgreSQL 14+
- AWS Account with Bedrock access

### Installation

```bash
# Install backend dependencies
cd server
npm install

# Install frontend dependencies
cd ../client
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your credentials

# Run database migrations
cd ../server
npm run migrate

# Start development servers
npm run dev  # Backend on port 5000
cd ../client
npm start    # Frontend on port 3000
```

## Project Structure

```
├── server/              # Express.js backend
│   ├── config/         # Configuration files
│   ├── controllers/    # Route controllers
│   ├── models/         # Database models
│   ├── routes/         # API routes
│   ├── services/       # Business logic
│   └── utils/          # Helper functions
├── client/             # React frontend
│   ├── public/         # Static files
│   └── src/
│       ├── components/ # React components
│       ├── pages/      # Page components
│       ├── services/   # API services
│       └── utils/      # Helper functions
└── database/           # Database migrations
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login

### Resume
- `POST /api/resume/upload` - Upload and process resume
- `GET /api/resume/:id` - Get resume data

### Interview
- `POST /api/interview/start` - Start interview session
- `POST /api/interview/:id/answer` - Submit answer
- `POST /api/interview/:id/complete` - End interview
- `GET /api/interview/:id` - Get interview details

### Practice
- `GET /api/practice/roles` - Get available practice roles
- `POST /api/practice/start` - Start practice interview

### Dashboard
- `GET /api/dashboard` - Get user dashboard data

## Deployment

- **Frontend**: Vercel
- **Backend**: Render / Railway
- **Database**: Render PostgreSQL / Supabase

## License

MIT
