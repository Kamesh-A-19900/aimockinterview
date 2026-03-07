-- Coding Interview Tables Migration
-- Date: March 7, 2026

-- Add programming language column to interview_sessions
ALTER TABLE interview_sessions 
ADD COLUMN programming_language VARCHAR(50),
ADD COLUMN problems_attempted INTEGER DEFAULT 0,
ADD COLUMN problems_solved INTEGER DEFAULT 0;

-- Code submissions table
CREATE TABLE IF NOT EXISTS code_submissions (
  id SERIAL PRIMARY KEY,
  session_id INTEGER NOT NULL REFERENCES interview_sessions(id) ON DELETE CASCADE,
  problem_number INTEGER NOT NULL,
  problem_title VARCHAR(255) NOT NULL,
  problem_statement TEXT NOT NULL,
  code_submitted TEXT NOT NULL,
  language VARCHAR(50) NOT NULL,
  time_complexity VARCHAR(50),
  space_complexity VARCHAR(50),
  is_correct BOOLEAN DEFAULT false,
  optimization_score INTEGER CHECK (optimization_score >= 0 AND optimization_score <= 100),
  feedback TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_session FOREIGN KEY (session_id) REFERENCES interview_sessions(id)
);

CREATE INDEX idx_code_submissions_session_id ON code_submissions(session_id);
CREATE INDEX idx_code_submissions_problem ON code_submissions(session_id, problem_number);

-- Coding chat messages table (for Q&A during coding interview)
CREATE TABLE IF NOT EXISTS coding_chat_messages (
  id SERIAL PRIMARY KEY,
  session_id INTEGER NOT NULL REFERENCES interview_sessions(id) ON DELETE CASCADE,
  message_type VARCHAR(10) NOT NULL CHECK (message_type IN ('user', 'ai')),
  message_text TEXT NOT NULL,
  is_code_submission BOOLEAN DEFAULT false,
  problem_number INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_session FOREIGN KEY (session_id) REFERENCES interview_sessions(id)
);

CREATE INDEX idx_coding_chat_session_id ON coding_chat_messages(session_id);
CREATE INDEX idx_coding_chat_order ON coding_chat_messages(session_id, created_at);

-- Coding problems table (for storing problem bank)
CREATE TABLE IF NOT EXISTS coding_problems (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  difficulty VARCHAR(20) NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard')),
  problem_statement TEXT NOT NULL,
  example_input TEXT NOT NULL,
  example_output TEXT NOT NULL,
  constraints TEXT NOT NULL,
  hints TEXT,
  optimal_time_complexity VARCHAR(50),
  optimal_space_complexity VARCHAR(50),
  tags TEXT[], -- Array of tags like 'array', 'hash-map', 'two-pointers'
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_coding_problems_difficulty ON coding_problems(difficulty);

-- Update session_type to include 'coding'
ALTER TABLE interview_sessions 
DROP CONSTRAINT IF EXISTS interview_sessions_session_type_check;

ALTER TABLE interview_sessions 
ADD CONSTRAINT interview_sessions_session_type_check 
CHECK (session_type IN ('resume', 'practice', 'coding'));

