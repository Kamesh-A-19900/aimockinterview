# Requirements Document: Mock Interview Agent System (PERN Stack)

## Introduction

The Mock Interview Agent System is a web-based platform that provides AI-powered mock interview experiences for job seekers. The system analyzes user resumes using LLM technology (AWS Bedrock as PRIMARY extraction method), conducts adaptive interviews based on the extracted information, and provides comprehensive assessments of interview performance. Built using the PERN stack (PostgreSQL, Express.js, React.js, Node.js), the system offers both resume-based personalized interviews and static practice interviews organized by job role.

## Glossary

- **System**: The Mock Interview Agent System
- **User**: A job seeker using the platform for interview practice
- **Resume**: A PDF document containing the user's professional information (max 3 pages)
- **Interview_Session**: A single mock interview interaction between the user and the AI
- **LLM**: Large Language Model (AWS Bedrock Claude 3 Haiku) - PRIMARY extraction method
- **Vector_DB**: ChromaDB vector database for storing interview Q&A pairs
- **Assessment**: Evaluation of user performance across multiple dimensions
- **Practice_Interview**: Static interview questions organized by job role, not requiring resume upload
- **Backend_API**: Express.js REST API server
- **Frontend_App**: React.js single-page application
- **Database**: PostgreSQL relational database
- **Resume_Extraction**: LLM-first approach with regex fallback (target: <5 seconds)

## Requirements

### Requirement 1: User Authentication

**User Story:** As a user, I want to create an account and sign in securely, so that I can access my personalized interview history and resume data.

#### Acceptance Criteria

1. WHEN a user provides valid registration details (email, password, name), THE System SHALL create a new user account and store credentials securely
2. WHEN a user provides valid login credentials, THE System SHALL authenticate the user and return a JWT token
3. WHEN a user provides invalid credentials, THE System SHALL reject the authentication attempt and return an error message
4. THE System SHALL hash passwords before storing them in the Database
5. WHEN a JWT token is provided with API requests, THE System SHALL validate the token and authorize access to protected resources

### Requirement 2: Resume Upload and Validation

**User Story:** As a user, I want to upload my resume in PDF format, so that the system can analyze my background and conduct personalized interviews.

#### Acceptance Criteria

1. WHEN a user uploads a file, THE System SHALL validate that the file is in PDF format
2. WHEN a PDF file exceeds 3 pages, THE System SHALL reject the upload and return an error message
3. WHEN a valid PDF is uploaded, THE System SHALL accept the file and store it for processing
4. THE System SHALL provide drag-and-drop functionality for resume uploads
5. WHEN file validation fails, THE System SHALL display user-friendly error messages

### Requirement 3: Resume Information Extraction (LLM PRIMARY)

**User Story:** As a user, I want my resume to be processed quickly and accurately using AI, so that the interview questions are relevant to my background.

#### Acceptance Criteria

1. WHEN a valid resume is uploaded, THE System SHALL extract text content using the pdf-parse library
2. WHEN text content is extracted, THE System SHALL send the content to AWS Bedrock Claude 3 Haiku for structured information extraction (PRIMARY METHOD)
3. THE LLM SHALL extract the following fields: name, email, phone, address, LinkedIn URL, GitHub URL, skills, languages, education, experience, projects, and about section
4. IF the LLM extraction fails, THEN THE System SHALL attempt regex-based extraction as a fallback (SECONDARY METHOD)
5. THE System SHALL complete the entire resume processing pipeline within 5 seconds
6. WHEN extraction is complete, THE System SHALL store the structured data in the Database associated with the user

### Requirement 4: Personalized Interview Generation

**User Story:** As a user, I want to participate in AI-powered mock interviews based on my resume, so that I can practice for real job interviews relevant to my experience.

#### Acceptance Criteria

1. WHEN a user starts a resume-based interview, THE System SHALL retrieve the user's resume data from the Database
2. THE System SHALL generate interview questions using AWS Bedrock Claude 3 Haiku based on the resume content
3. WHEN a user submits an answer, THE System SHALL analyze the response and generate a follow-up question that adapts to the user's answer quality
4. THE System SHALL maintain conversation context throughout the Interview_Session
5. WHEN questions and answers are exchanged, THE System SHALL store each Q&A pair in the Vector_DB with embeddings

### Requirement 5: Static Practice Interviews

**User Story:** As a user, I want to practice interviews for specific job roles without uploading a resume, so that I can prepare for general interview scenarios.

#### Acceptance Criteria

1. THE System SHALL provide pre-defined interview question sets organized by job role categories
2. WHEN a user selects a job role, THE System SHALL present relevant interview questions for that role
3. THE System SHALL conduct practice interviews without requiring resume data
4. WHEN a user answers practice questions, THE System SHALL store the Q&A pairs in the Vector_DB
5. THE System SHALL support multiple job role categories (e.g., Software Engineer, Data Scientist, Product Manager, Frontend Developer, Backend Developer)

### Requirement 6: Interview Performance Assessment

**User Story:** As a user, I want to receive detailed feedback on my interview performance, so that I can identify areas for improvement.

#### Acceptance Criteria

1. WHEN an Interview_Session is completed, THE System SHALL analyze all user responses using the LLM
2. THE System SHALL assess performance across four dimensions: communication skills, answer correctness, confidence level, and stress handling
3. THE System SHALL generate a numerical score (0-100) for each assessment dimension
4. THE System SHALL provide written feedback explaining the scores
5. WHEN assessment is complete, THE System SHALL store the results in the Database linked to the Interview_Session

### Requirement 7: User Dashboard

**User Story:** As a user, I want to view my past interview sessions and performance scores, so that I can track my progress over time.

#### Acceptance Criteria

1. WHEN a user accesses the dashboard, THE System SHALL retrieve all past Interview_Sessions for that user
2. THE System SHALL display a list of past interviews with dates, types (resume-based or practice), and overall scores
3. WHEN a user selects a past interview, THE System SHALL display the full Q&A transcript and detailed assessment scores
4. THE System SHALL visualize performance trends across multiple interviews
5. THE System SHALL display the user's uploaded resume information on the dashboard

### Requirement 8: Real-Time Interview Interface

**User Story:** As a user, I want an interactive chat interface for conducting interviews, so that the experience feels natural and engaging.

#### Acceptance Criteria

1. THE Frontend_App SHALL provide a chat-style interface for interview interactions
2. WHEN the AI generates a question, THE System SHALL display it in the chat interface with appropriate styling
3. WHEN a user types a response, THE System SHALL provide real-time input feedback
4. THE System SHALL display a loading indicator while the AI processes responses
5. WHEN an interview is in progress, THE System SHALL show progress indicators (e.g., question count, time elapsed)


### Requirement 9: Responsive User Interface

**User Story:** As a user, I want the application to work seamlessly on different devices, so that I can practice interviews on my phone, tablet, or computer.

#### Acceptance Criteria

1. THE Frontend_App SHALL render correctly on mobile devices (320px minimum width)
2. THE Frontend_App SHALL render correctly on tablet devices (768px minimum width)
3. THE Frontend_App SHALL render correctly on desktop devices (1024px minimum width)
4. WHEN the viewport size changes, THE System SHALL adjust the layout responsively
5. THE System SHALL maintain full functionality across all supported device sizes

### Requirement 10: Database Schema and Data Persistence

**User Story:** As a system administrator, I want all user data stored reliably in PostgreSQL, so that data is persistent and can be queried efficiently.

#### Acceptance Criteria

1. THE Database SHALL contain a users table with fields: id, email, password_hash, name, created_at, updated_at
2. THE Database SHALL contain a resumes table with fields: id, user_id, file_path, extracted_data (JSONB), created_at
3. THE Database SHALL contain an interview_sessions table with fields: id, user_id, resume_id, session_type, status, started_at, completed_at
4. THE Database SHALL contain a qa_pairs table with fields: id, session_id, question, answer, question_order, created_at
5. THE Database SHALL contain an assessments table with fields: id, session_id, communication_score, correctness_score, confidence_score, stress_handling_score, feedback_text, created_at
6. THE System SHALL enforce foreign key relationships between tables
7. WHEN data is written to the Database, THE System SHALL ensure ACID compliance

### Requirement 11: Vector Database Integration

**User Story:** As a system architect, I want interview Q&A pairs stored in a vector database, so that we can enable semantic search and analysis in future iterations.

#### Acceptance Criteria

1. THE System SHALL initialize a ChromaDB collection for storing interview Q&A pairs
2. WHEN a Q&A pair is created, THE System SHALL generate embeddings using AWS Bedrock
3. THE System SHALL store Q&A pairs in the Vector_DB with metadata (session_id, user_id, timestamp)
4. THE System SHALL maintain synchronization between the Database and Vector_DB for Q&A pairs
5. THE Vector_DB SHALL support retrieval of Q&A pairs by session_id

### Requirement 12: API Endpoints

**User Story:** As a frontend developer, I want well-defined REST API endpoints, so that I can integrate the frontend with the backend services.

#### Acceptance Criteria

1. THE Backend_API SHALL expose POST /api/auth/register for user registration
2. THE Backend_API SHALL expose POST /api/auth/login for user authentication
3. THE Backend_API SHALL expose POST /api/resume/upload for resume file uploads
4. THE Backend_API SHALL expose GET /api/resume/:id for retrieving resume data
5. THE Backend_API SHALL expose POST /api/interview/start for initiating interview sessions
6. THE Backend_API SHALL expose POST /api/interview/:id/answer for submitting answers and receiving next questions
7. THE Backend_API SHALL expose POST /api/interview/:id/complete for ending interview sessions
8. THE Backend_API SHALL expose GET /api/interview/:id for retrieving interview details
9. THE Backend_API SHALL expose GET /api/dashboard for retrieving user dashboard data
10. THE Backend_API SHALL expose GET /api/practice/roles for retrieving available practice interview roles
11. WHEN API endpoints receive requests, THE System SHALL validate request payloads and return appropriate HTTP status codes

### Requirement 13: Error Handling and User Feedback

**User Story:** As a user, I want clear error messages when something goes wrong, so that I understand what happened and how to fix it.

#### Acceptance Criteria

1. WHEN an error occurs during resume processing, THE System SHALL return a user-friendly error message explaining the issue
2. WHEN API requests fail, THE System SHALL return appropriate HTTP status codes (400, 401, 403, 404, 500)
3. WHEN network errors occur, THE Frontend_App SHALL display retry options to the user
4. THE System SHALL log detailed error information for debugging purposes
5. WHEN validation fails, THE System SHALL provide specific feedback about which fields are invalid

### Requirement 14: Performance Requirements

**User Story:** As a user, I want the system to respond quickly, so that my interview practice experience is smooth and uninterrupted.

#### Acceptance Criteria

1. THE System SHALL complete resume processing within 5 seconds from upload to data storage
2. THE System SHALL generate interview questions within 3 seconds of receiving a user answer
3. THE System SHALL load the dashboard page within 2 seconds
4. WHEN multiple users access the system concurrently, THE System SHALL maintain response times within acceptable limits
5. THE Backend_API SHALL handle at least 50 concurrent requests without degradation

### Requirement 15: Deployment and Hosting

**User Story:** As a project owner, I want the application deployed on free hosting platforms, so that we can minimize costs while maintaining availability.

#### Acceptance Criteria

1. THE Backend_API SHALL be deployable on Render or Railway free tier
2. THE Frontend_App SHALL be deployable on Vercel free tier
3. THE Database SHALL be hosted on a free PostgreSQL provider (e.g., Render, Railway, or Supabase)
4. THE System SHALL include environment variable configuration for deployment settings
5. WHEN deployed, THE System SHALL be accessible via HTTPS
6. THE System SHALL include deployment documentation with step-by-step instructions

### Requirement 16: Frontend Pages and Navigation

**User Story:** As a user, I want to navigate easily between different sections of the application, so that I can access all features efficiently.

#### Acceptance Criteria

1. THE Frontend_App SHALL include a Home page with a hero section explaining the platform
2. THE Frontend_App SHALL include a Sign In page with email and password fields
3. THE Frontend_App SHALL include a Sign Up page with registration form
4. THE Frontend_App SHALL include an Interview page for conducting resume-based interviews
5. THE Frontend_App SHALL include a Practice page for selecting and conducting role-based practice interviews
6. THE Frontend_App SHALL include a Dashboard page displaying past interviews and scores
7. THE Frontend_App SHALL include a navigation menu accessible from all pages
8. WHEN a user is not authenticated, THE System SHALL redirect protected pages to the Sign In page

### Requirement 17: Visual Design and User Experience

**User Story:** As a user, I want a beautiful and modern interface, so that using the platform is enjoyable and professional.

#### Acceptance Criteria

1. THE Frontend_App SHALL use a modern color scheme with gradient effects
2. THE Frontend_App SHALL use consistent typography and spacing throughout
3. THE Frontend_App SHALL include smooth transitions and animations for user interactions
4. THE Frontend_App SHALL provide visual feedback for all user actions (button clicks, form submissions)
5. THE Frontend_App SHALL use icons and visual elements to enhance usability
6. THE System SHALL maintain a professional appearance suitable for job interview preparation
