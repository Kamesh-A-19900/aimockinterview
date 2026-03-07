-- Mock Interview Agent Database Schema

-- Drop existing tables and objects (in reverse dependency order)
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
DROP FUNCTION IF EXISTS update_updated_at_column();
DROP TABLE IF EXISTS assessments CASCADE;
DROP TABLE IF EXISTS qa_pairs CASCADE;
DROP TABLE IF EXISTS interview_sessions CASCADE;
DROP TABLE IF EXISTS practice_roles CASCADE;
DROP TABLE IF EXISTS resumes CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Users table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    profile_picture TEXT, -- Base64 encoded image
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);

-- Resumes table
CREATE TABLE resumes (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    file_path VARCHAR(500) NOT NULL,
    extracted_data JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX idx_resumes_user_id ON resumes(user_id);

-- Interview sessions table
CREATE TABLE interview_sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    resume_id INTEGER REFERENCES resumes(id) ON DELETE SET NULL,
    session_type VARCHAR(50) NOT NULL CHECK (session_type IN ('resume', 'practice')),
    practice_role_id INTEGER,
    status VARCHAR(50) NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'abandoned')),
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES users(id),
    CONSTRAINT fk_resume FOREIGN KEY (resume_id) REFERENCES resumes(id)
);

CREATE INDEX idx_sessions_user_id ON interview_sessions(user_id);
CREATE INDEX idx_sessions_status ON interview_sessions(status);

-- QA pairs table
CREATE TABLE qa_pairs (
    id SERIAL PRIMARY KEY,
    session_id INTEGER NOT NULL REFERENCES interview_sessions(id) ON DELETE CASCADE,
    question TEXT NOT NULL,
    answer TEXT,
    question_order INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_session FOREIGN KEY (session_id) REFERENCES interview_sessions(id)
);

CREATE INDEX idx_qa_session_id ON qa_pairs(session_id);
CREATE INDEX idx_qa_order ON qa_pairs(session_id, question_order);

-- Assessments table (Enhanced Report Structure)
CREATE TABLE assessments (
    id SERIAL PRIMARY KEY,
    session_id INTEGER UNIQUE NOT NULL REFERENCES interview_sessions(id) ON DELETE CASCADE,
    
    -- Dimension Scores (0-100)
    communication_score INTEGER NOT NULL CHECK (communication_score >= 0 AND communication_score <= 100),
    correctness_score INTEGER NOT NULL CHECK (correctness_score >= 0 AND correctness_score <= 100),
    confidence_score INTEGER NOT NULL CHECK (confidence_score >= 0 AND confidence_score <= 100),
    stress_handling_score INTEGER NOT NULL CHECK (stress_handling_score >= 0 AND stress_handling_score <= 100),
    overall_score INTEGER NOT NULL CHECK (overall_score >= 0 AND overall_score <= 100),
    
    -- Detailed Feedback
    feedback_text TEXT NOT NULL,
    
    -- Strengths, Weaknesses, Recommendations (JSON arrays)
    strengths JSONB DEFAULT '[]'::jsonb,
    weaknesses JSONB DEFAULT '[]'::jsonb,
    recommendations JSONB DEFAULT '[]'::jsonb,
    
    -- Evidence for each dimension (JSON object)
    evidence JSONB DEFAULT '{}'::jsonb,
    
    -- Integrity Analysis (JSON object)
    integrity_analysis JSONB DEFAULT '{}'::jsonb,
    
    -- Timestamps
    generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_session FOREIGN KEY (session_id) REFERENCES interview_sessions(id)
);

CREATE INDEX idx_assessments_session_id ON assessments(session_id);
CREATE INDEX idx_assessments_generated_at ON assessments(generated_at);

-- Practice roles table
CREATE TABLE practice_roles (
    id SERIAL PRIMARY KEY,
    role_id VARCHAR(100) UNIQUE NOT NULL,
    role_name VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_practice_roles_role_id ON practice_roles(role_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for users table
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

