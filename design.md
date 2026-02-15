# Design Document: Mock Interview Agent System

## Overview

The Mock Interview Agent System is a comprehensive AI-powered interview platform that processes candidate resumes, conducts adaptive multi-dimensional interviews, and provides detailed assessments. The system consists of four main subsystems:

1. **Resume Processing Pipeline**: Handles PDF upload, text extraction, parsing, and storage
2. **Interview Agent**: LLM-based conversational agent that conducts interviews
3. **Assessment Engine**: Multi-dimensional evaluation system for candidate responses
4. **Storage Layer**: Dual storage with user database for structured data and vector database for semantic search

The system supports multiple interview types (HR behavioral, technical deep-dive, coding assessment, stress scenarios) and dynamically adapts questions based on resume content and conversation context.

## Architecture

### High-Level Architecture

```mermaid
graph TB
    subgraph "Client Layer"
        UI[Web Interface]
    end
    
    subgraph "API Layer"
        API[REST API Gateway]
    end
    
    subgraph "Resume Processing"
        Upload[File Upload Handler]
        Validator[PDF Validator]
        Extractor[Text Extractor]
        Parser[Resume Parser]
    end
    
    subgraph "Interview System"
        Orchestrator[Interview Orchestrator]
        Agent[Interview Agent LLM]
        Context[Context Manager]
        QuestionGen[Question Generator]
    end
    
    subgraph "Assessment System"
        Analyzer[Response Analyzer]
        Scorer[Multi-Dimensional Scorer]
        Reporter[Report Generator]
    end
    
    subgraph "Storage Layer"
        UserDB[(User Database)]
        VectorDB[(Vector Database)]
    end
    
    UI --> API
    API --> Upload
    Upload --> Validator
    Validator --> Extractor
    Extractor --> Parser
    Parser --> UserDB
    
    API --> Orchestrator
    Orchestrator --> Agent
    Orchestrator --> Context
    Agent --> QuestionGen
    QuestionGen --> UserDB
    Context --> VectorDB
    
    Agent --> Analyzer
    Analyzer --> Scorer
    Scorer --> Reporter
    Reporter --> UserDB
    Reporter --> VectorDB
```

### Component Interaction Flow

1. **Resume Upload Flow**: Client → API → Validator → Extractor → Parser → User DB
2. **Interview Start Flow**: Client → API → Orchestrator → Context Manager → Interview Agent
3. **Question Generation Flow**: Interview Agent → Question Generator → User DB (resume data) → Interview Agent
4. **Response Processing Flow**: Client Answer → Interview Agent → Response Analyzer → Scorer → Vector DB
5. **Report Generation Flow**: Interview Complete → Report Generator → User DB + Vector DB

## Components and Interfaces

### 1. Resume Processing Pipeline

#### PDF Validator
```python
class PDFValidator:
    def validate_file(file: UploadedFile) -> ValidationResult:
        """
        Validates that uploaded file is a valid PDF.
        
        Args:
            file: Uploaded file object
            
        Returns:
            ValidationResult with success status and error message if invalid
        """
```

#### Text Extractor
```python
class TextExtractor:
    def extract_text(pdf_file: bytes) -> str:
        """
        Extracts all text content from PDF file.
        Uses libraries like PyPDF2 or pdfplumber.
        
        Args:
            pdf_file: PDF file as bytes
            
        Returns:
            Extracted text content
        """
    
    def preprocess_text(raw_text: str) -> str:
        """
        Cleans and normalizes extracted text.
        Removes formatting artifacts, normalizes whitespace.
        
        Args:
            raw_text: Raw extracted text
            
        Returns:
            Preprocessed clean text
        """
```

#### Resume Parser
```python
class ResumeParser:
    def parse_resume(text: str) -> ResumeData:
        """
        Parses preprocessed text into structured JSON format.
        Uses NLP techniques and pattern matching to extract fields.
        
        Args:
            text: Preprocessed resume text
            
        Returns:
            ResumeData object with structured fields
        """
    
    def extract_field(text: str, field_name: str) -> Optional[Any]:
        """
        Extracts specific field from resume text.
        
        Args:
            text: Resume text
            field_name: Name of field to extract
            
        Returns:
            Extracted field value or None
        """
```

### 2. Interview Agent System

#### Interview Orchestrator
```python
class InterviewOrchestrator:
    def start_interview(candidate_id: str, interview_type: InterviewType) -> InterviewSession:
        """
        Initializes and starts an interview session.
        
        Args:
            candidate_id: Unique identifier for candidate
            interview_type: Type of interview to conduct
            
        Returns:
            InterviewSession object
        """
    
    def process_answer(session_id: str, answer: str) -> Question:
        """
        Processes candidate answer and generates next question.
        
        Args:
            session_id: Interview session identifier
            answer: Candidate's answer text
            
        Returns:
            Next question to ask
        """
    
    def end_interview(session_id: str) -> AssessmentReport:
        """
        Ends interview session and generates assessment report.
        
        Args:
            session_id: Interview session identifier
            
        Returns:
            Comprehensive assessment report
        """
```

#### Interview Agent (LLM)
```python
class InterviewAgent:
    def __init__(model_path: str):
        """
        Initializes interview agent with fine-tuned LLM.
        Model should be fine-tuned on interview conversations.
        """
    
    def generate_question(
        resume_data: ResumeData,
        conversation_history: List[QAPair],
        interview_dimension: InterviewDimension,
        interview_type: InterviewType
    ) -> str:
        """
        Generates contextually relevant interview question.
        
        Args:
            resume_data: Candidate's structured resume data
            conversation_history: Previous Q&A pairs
            interview_dimension: Dimension to evaluate
            interview_type: Type of interview
            
        Returns:
            Generated question text
        """
    
    def analyze_answer(question: str, answer: str) -> AnswerAnalysis:
        """
        Analyzes candidate answer for content and quality.
        
        Args:
            question: Question that was asked
            answer: Candidate's answer
            
        Returns:
            Analysis of answer content and quality
        """
```

#### Question Generator
```python
class QuestionGenerator:
    def generate_resume_based_question(
        resume_data: ResumeData,
        dimension: InterviewDimension
    ) -> str:
        """
        Generates question based on resume content.
        
        Args:
            resume_data: Candidate's resume data
            dimension: Interview dimension to target
            
        Returns:
            Generated question
        """
    
    def generate_followup_question(
        previous_qa: QAPair,
        dimension: InterviewDimension
    ) -> str:
        """
        Generates follow-up question based on previous answer.
        
        Args:
            previous_qa: Previous question and answer
            dimension: Interview dimension to target
            
        Returns:
            Follow-up question
        """
    
    def generate_coding_problem(difficulty: str, topic: str) -> CodingProblem:
        """
        Generates coding problem for assessment.
        
        Args:
            difficulty: Problem difficulty level
            topic: Technical topic area
            
        Returns:
            Coding problem with description and constraints
        """
```

#### Context Manager
```python
class ContextManager:
    def get_conversation_context(session_id: str) -> ConversationContext:
        """
        Retrieves conversation context for session.
        
        Args:
            session_id: Interview session identifier
            
        Returns:
            Conversation context including history and metadata
        """
    
    def update_context(session_id: str, qa_pair: QAPair) -> None:
        """
        Updates conversation context with new Q&A pair.
        
        Args:
            session_id: Interview session identifier
            qa_pair: New question and answer pair
        """
    
    def get_covered_topics(session_id: str) -> Set[str]:
        """
        Returns set of topics already covered in interview.
        
        Args:
            session_id: Interview session identifier
            
        Returns:
            Set of covered topic identifiers
        """
```

### 3. Assessment Engine

#### Response Analyzer
```python
class ResponseAnalyzer:
    def analyze_communication(answer: str) -> CommunicationScore:
        """
        Analyzes communication quality of answer.
        Evaluates clarity, grammar, structure, vocabulary.
        
        Args:
            answer: Candidate's answer text
            
        Returns:
            Communication quality scores
        """
    
    def analyze_correctness(
        question: str,
        answer: str,
        expected_topics: List[str]
    ) -> CorrectnessScore:
        """
        Analyzes factual correctness and completeness.
        
        Args:
            question: Question asked
            answer: Candidate's answer
            expected_topics: Topics that should be covered
            
        Returns:
            Correctness and completeness scores
        """
    
    def analyze_confidence(answer: str) -> ConfidenceScore:
        """
        Analyzes confidence indicators in answer.
        
        Args:
            answer: Candidate's answer text
            
        Returns:
            Confidence score and indicators
        """
    
    def analyze_code_solution(code: str, problem: CodingProblem) -> CodeAnalysis:
        """
        Analyzes coding solution for logic and complexity.
        
        Args:
            code: Candidate's code solution
            problem: Original coding problem
            
        Returns:
            Analysis of logic, complexity, and correctness
        """
```

#### Multi-Dimensional Scorer
```python
class MultiDimensionalScorer:
    def score_dimension(
        dimension: InterviewDimension,
        qa_pairs: List[QAPair],
        analyses: List[AnswerAnalysis]
    ) -> DimensionScore:
        """
        Scores candidate on specific interview dimension.
        
        Args:
            dimension: Dimension to score
            qa_pairs: All Q&A pairs for this dimension
            analyses: Analyses of all answers
            
        Returns:
            Score for the dimension with breakdown
        """
    
    def calculate_overall_score(dimension_scores: Dict[InterviewDimension, DimensionScore]) -> float:
        """
        Calculates weighted overall interview score.
        
        Args:
            dimension_scores: Scores for all dimensions
            
        Returns:
            Overall weighted score
        """
```

#### Report Generator
```python
class ReportGenerator:
    def generate_report(
        session: InterviewSession,
        dimension_scores: Dict[InterviewDimension, DimensionScore],
        overall_score: float
    ) -> AssessmentReport:
        """
        Generates comprehensive assessment report.
        
        Args:
            session: Interview session data
            dimension_scores: Scores for all dimensions
            overall_score: Overall interview score
            
        Returns:
            Comprehensive assessment report
        """
    
    def identify_strengths(dimension_scores: Dict[InterviewDimension, DimensionScore]) -> List[str]:
        """
        Identifies candidate strengths from scores.
        
        Args:
            dimension_scores: Scores for all dimensions
            
        Returns:
            List of identified strengths
        """
    
    def identify_weaknesses(dimension_scores: Dict[InterviewDimension, DimensionScore]) -> List[str]:
        """
        Identifies candidate weaknesses from scores.
        
        Args:
            dimension_scores: Scores for all dimensions
            
        Returns:
            List of identified weaknesses
        """
```

### 4. Storage Layer

#### User Database Interface
```python
class UserDatabase:
    def store_resume_data(candidate_id: str, resume_data: ResumeData) -> None:
        """
        Stores structured resume data for candidate.
        
        Args:
            candidate_id: Unique candidate identifier
            resume_data: Structured resume data
        """
    
    def get_resume_data(candidate_id: str) -> Optional[ResumeData]:
        """
        Retrieves resume data for candidate.
        
        Args:
            candidate_id: Unique candidate identifier
            
        Returns:
            Resume data or None if not found
        """
    
    def store_assessment_report(candidate_id: str, report: AssessmentReport) -> None:
        """
        Stores assessment report for candidate.
        
        Args:
            candidate_id: Unique candidate identifier
            report: Assessment report
        """
    
    def get_candidate_history(candidate_id: str) -> List[InterviewSession]:
        """
        Retrieves all interview sessions for candidate.
        
        Args:
            candidate_id: Unique candidate identifier
            
        Returns:
            List of interview sessions
        """
```

#### Vector Database Interface
```python
class VectorDatabase:
    def store_interview_data(
        session_id: str,
        resume_data: ResumeData,
        qa_pairs: List[QAPair]
    ) -> None:
        """
        Stores interview data with vector embeddings.
        
        Args:
            session_id: Interview session identifier
            resume_data: Candidate's resume data
            qa_pairs: All question-answer pairs
        """
    
    def search_similar_questions(query: str, top_k: int) -> List[Question]:
        """
        Searches for similar questions using semantic search.
        
        Args:
            query: Search query
            top_k: Number of results to return
            
        Returns:
            List of similar questions
        """
    
    def search_similar_answers(query: str, top_k: int) -> List[Answer]:
        """
        Searches for similar answers using semantic search.
        
        Args:
            query: Search query
            top_k: Number of results to return
            
        Returns:
            List of similar answers
        """
    
    def get_session_embeddings(session_id: str) -> SessionEmbeddings:
        """
        Retrieves all embeddings for an interview session.
        
        Args:
            session_id: Interview session identifier
            
        Returns:
            Session embeddings data
        """
```

## Data Models

### ResumeData
```python
@dataclass
class ResumeData:
    candidate_id: str
    name: Optional[str]
    about: Optional[str]
    skills: List[str]
    area_of_interest: List[str]
    projects: List[Project]
    contact: Optional[str]
    email: Optional[str]
    github: Optional[str]
    linkedin: Optional[str]
    address_or_location: Optional[str]
    achievements: List[str]
    experience: List[Experience]
    studies: List[Education]
    languages: List[str]
    role: Optional[str]
    awards: List[str]
    certifications: List[str]
    others: Dict[str, Any]
    
    def to_json(self) -> str:
        """Serializes resume data to JSON"""
    
    @staticmethod
    def from_json(json_str: str) -> 'ResumeData':
        """Deserializes resume data from JSON"""
```

### Project
```python
@dataclass
class Project:
    title: str
    description: str
    technologies: List[str]
    role: Optional[str]
    duration: Optional[str]
    outcomes: Optional[str]
```

### Experience
```python
@dataclass
class Experience:
    company: str
    role: str
    duration: str
    responsibilities: List[str]
    achievements: List[str]
```

### Education
```python
@dataclass
class Education:
    institution: str
    degree: str
    field: str
    duration: str
    gpa: Optional[str]
```

### InterviewSession
```python
@dataclass
class InterviewSession:
    session_id: str
    candidate_id: str
    interview_type: InterviewType
    start_time: datetime
    end_time: Optional[datetime]
    qa_pairs: List[QAPair]
    status: SessionStatus
    dimension_coverage: Dict[InterviewDimension, int]
```

### QAPair
```python
@dataclass
class QAPair:
    question_id: str
    question: str
    answer: str
    dimension: InterviewDimension
    timestamp: datetime
    analysis: Optional[AnswerAnalysis]
```

### InterviewType
```python
class InterviewType(Enum):
    HR_BEHAVIORAL = "hr_behavioral"
    TECHNICAL_DEEPDIVE = "technical_deepdive"
    CODING_ASSESSMENT = "coding_assessment"
    STRESS_SCENARIO = "stress_scenario"
```

### InterviewDimension
```python
class InterviewDimension(Enum):
    COMMUNICATION = "communication"
    TECHNICAL_KNOWLEDGE = "technical_knowledge"
    STRESS_HANDLING = "stress_handling"
    GENERAL_AFFAIRS = "general_affairs"
    PROJECT_EVALUATION = "project_evaluation"
    LOGICAL_THINKING = "logical_thinking"
    CONFIDENCE = "confidence"
    ENGAGEMENT = "engagement"
```

### AnswerAnalysis
```python
@dataclass
class AnswerAnalysis:
    communication_score: CommunicationScore
    correctness_score: CorrectnessScore
    confidence_score: ConfidenceScore
    engagement_indicators: EngagementIndicators
    key_topics: List[str]
    sentiment: str
```

### CommunicationScore
```python
@dataclass
class CommunicationScore:
    clarity: float  # 0-1
    grammar: float  # 0-1
    structure: float  # 0-1
    vocabulary: float  # 0-1
    overall: float  # 0-1
```

### CorrectnessScore
```python
@dataclass
class CorrectnessScore:
    factual_accuracy: float  # 0-1
    completeness: float  # 0-1
    relevance: float  # 0-1
    overall: float  # 0-1
```

### ConfidenceScore
```python
@dataclass
class ConfidenceScore:
    confidence_level: float  # 0-1
    decisiveness: float  # 0-1
    assertiveness: float  # 0-1
    overall: float  # 0-1
```

### EngagementIndicators
```python
@dataclass
class EngagementIndicators:
    asked_questions: bool
    admitted_gaps: bool
    requested_clarification: bool
    showed_curiosity: bool
    engagement_score: float  # 0-1
```

### DimensionScore
```python
@dataclass
class DimensionScore:
    dimension: InterviewDimension
    score: float  # 0-100
    breakdown: Dict[str, float]
    supporting_examples: List[str]
```

### AssessmentReport
```python
@dataclass
class AssessmentReport:
    report_id: str
    candidate_id: str
    session_id: str
    overall_score: float  # 0-100
    dimension_scores: Dict[InterviewDimension, DimensionScore]
    strengths: List[str]
    weaknesses: List[str]
    recommendations: List[str]
    generated_at: datetime
```

### CodingProblem
```python
@dataclass
class CodingProblem:
    problem_id: str
    title: str
    description: str
    difficulty: str
    topic: str
    constraints: List[str]
    examples: List[Dict[str, Any]]
```

### CodeAnalysis
```python
@dataclass
class CodeAnalysis:
    correctness: bool
    time_complexity: str
    space_complexity: str
    code_quality: float  # 0-1
    approach_quality: float  # 0-1
    edge_cases_handled: bool
    optimization_level: str
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

Before defining the correctness properties, let me analyze the acceptance criteria for testability:


### Property Reflection

After analyzing all acceptance criteria, I've identified the following consolidations to eliminate redundancy:

**Resume Processing Properties:**
- Properties 1.1 and 1.2 (PDF validation and rejection) can be combined into one comprehensive validation property
- Properties 2.1, 3.1, 3.3, and 3.4 (parsing, storing, integrity, retrieval) can be combined into a single round-trip property
- Properties 2.2 and 2.3 (field extraction and missing fields) can be combined into one comprehensive extraction property
- Properties 5.2, 5.3, 5.4, 5.5, and 5.6 (questions based on different resume sections) can be combined into one property about resume-based question generation

**Assessment Properties:**
- Properties 11.1, 11.2, 11.3, and 11.5 (various communication aspects and final score) can be combined - the final score subsumes the individual aspects
- Properties 12.1, 12.2, 12.3, and 12.5 (various correctness aspects and final score) can be combined - the final score subsumes the individual aspects
- Properties 13.1, 13.2, 13.4, and 13.5 (various confidence aspects and final score) can be combined - the final score subsumes the individual aspects
- Properties 7.1-7.5 (asking questions for different dimensions) can be combined with 7.6 (distribution across dimensions)
- Properties 16.1-16.4 and 16.5 (stress evaluation aspects and final score) can be combined
- Properties 17.1-17.4 and 17.5 (project evaluation aspects and final score) can be combined
- Properties 18.1-18.4 and 18.5 (logical thinking aspects and final score) can be combined

**Storage Properties:**
- Properties 10.1, 10.2, 10.3, and 10.4 (storing different data types with associations) can be combined into one comprehensive storage property

### Correctness Properties

Property 1: PDF File Validation
*For any* uploaded file, the system should accept it if and only if it is a valid PDF format, and should return an appropriate error message for non-PDF files.
**Validates: Requirements 1.1, 1.2**

Property 2: PDF Text Extraction
*For any* valid PDF resume (including multi-page documents), the text extractor should extract all text content and preprocess it to remove formatting artifacts and normalize whitespace.
**Validates: Requirements 1.3, 1.4, 1.5**

Property 3: Resume Data Round-Trip
*For any* valid resume text, parsing it into ResumeData, storing it in the User_Database, and retrieving it by candidate ID should produce equivalent structured data with maintained integrity.
**Validates: Requirements 2.1, 3.1, 3.3, 3.4, 19.6**

Property 4: Resume Field Extraction
*For any* resume text, the parser should extract all specified fields (name, about, skills, area_of_interest, projects, contact, email, github, linkedin, address_or_location, achievements, experience, studies, languages, role, awards, certifications, others) when present, and set missing fields to null or empty values.
**Validates: Requirements 2.2, 2.3**

Property 5: Resume Name Validation
*For any* parsed ResumeData, the system should validate that it contains at least a name field before accepting it.
**Validates: Requirements 2.4**

Property 6: Resume Format Handling
*For any* resume with varying formats and layouts, the parser should successfully extract structured data.
**Validates: Requirements 2.5**

Property 7: Candidate ID Association
*For any* stored ResumeData, it should be associated with a unique candidate identifier that allows retrieval.
**Validates: Requirements 3.2**

Property 8: Resume Update Behavior
*For any* candidate with existing ResumeData, uploading a new resume should update the existing data rather than creating a duplicate.
**Validates: Requirements 3.5**

Property 9: Conversational Context Maintenance
*For any* interview session, later questions should be able to reference earlier answers, demonstrating that conversational context is maintained throughout.
**Validates: Requirements 4.3, 6.3**

Property 10: Question Grammar Correctness
*For any* question generated by the Interview_Agent, it should be grammatically correct and professionally phrased.
**Validates: Requirements 4.4**

Property 11: Resume-Based Question Generation
*For any* ResumeData containing skills, projects, experience, area_of_interest, certifications, or awards, the Interview_Agent should generate questions that reference these specific resume elements.
**Validates: Requirements 5.2, 5.3, 5.4, 5.5, 5.6**

Property 12: Answer Analysis
*For any* candidate answer, the Interview_Agent should analyze the response content before generating the next question.
**Validates: Requirements 6.1**

Property 13: Context-Aware Follow-Up Questions
*For any* candidate answer, follow-up questions should contain references to or build upon the content of that answer.
**Validates: Requirements 6.2**

Property 14: Clarifying Questions for Vague Answers
*For any* answer that is incomplete or vague, the Interview_Agent should generate clarifying questions to probe deeper.
**Validates: Requirements 6.4**

Property 15: Topic Non-Redundancy
*For any* interview session, questions should not repeat topics that have already been thoroughly covered in previous questions.
**Validates: Requirements 6.5**

Property 16: Multi-Dimensional Question Distribution
*For any* interview session, questions should be distributed across all relevant Interview_Dimensions (communication, technical knowledge, stress handling, general affairs, project evaluation, logical thinking).
**Validates: Requirements 7.1, 7.2, 7.3, 7.4, 7.5, 7.6**

Property 17: Stress Interview Characteristics
*For any* stress interview type, questions should include challenging scenarios and time-pressured elements.
**Validates: Requirements 7.7**

Property 18: Syntax-Independent Code Evaluation
*For any* submitted code solution, the evaluation should focus on logic and algorithmic complexity, such that minor syntax errors do not significantly impact the assessment.
**Validates: Requirements 8.2**

Property 19: Code Analysis Completeness
*For any* submitted code, the Interview_Agent should analyze the solution's approach, complexity, and generate questions about design decisions, trade-offs, and time/space complexity.
**Validates: Requirements 8.3, 8.4, 8.5**

Property 20: Interview Type Strategy Adaptation
*For any* selected interview type (HR behavioral, technical deep-dive, coding assessment, stress scenario), the Interview_Agent should adjust its questioning strategy to match that type's characteristics.
**Validates: Requirements 9.5**

Property 21: Sequential Interview Support
*For any* candidate, the system should allow conducting multiple interview types in sequence without data loss or conflicts.
**Validates: Requirements 9.6**

Property 22: Vector Database Storage Completeness
*For any* completed interview session, the Vector_Database should contain the ResumeData, all questions asked, all answers provided, and correct associations to the session ID.
**Validates: Requirements 10.1, 10.2, 10.3, 10.4**

Property 23: Semantic Search Functionality
*For any* query to the Vector_Database, semantically similar questions or answers should be returned based on meaning rather than exact text matching.
**Validates: Requirements 10.5**

Property 24: Communication Quality Scoring
*For any* candidate answer, the Assessment_Engine should generate a communication quality score that evaluates clarity, grammar, structure, and vocabulary.
**Validates: Requirements 11.1, 11.2, 11.3, 11.5**

Property 25: Answer Correctness Scoring
*For any* candidate answer, the Assessment_Engine should generate a correctness score that evaluates factual accuracy, completeness, and relevance to the question.
**Validates: Requirements 12.1, 12.2, 12.3, 12.5**

Property 26: Code Correctness Verification
*For any* coding solution, the Assessment_Engine should verify logical correctness of the approach.
**Validates: Requirements 12.4**

Property 27: Confidence Scoring
*For any* candidate answer, the Assessment_Engine should generate a confidence score that evaluates confidence indicators, decisiveness, and willingness to take positions.
**Validates: Requirements 13.1, 13.2, 13.4, 13.5**

Property 28: Engagement Scoring with Question-Asking
*For any* interview session where the candidate asks clarifying questions or admits knowledge gaps, the engagement score should reflect this positively.
**Validates: Requirements 14.1, 14.2**

Property 29: Feedback Receptiveness Evaluation
*For any* interview session where feedback or hints are provided, the Assessment_Engine should evaluate the candidate's receptiveness.
**Validates: Requirements 14.4**

Property 30: Session Engagement Score
*For any* interview session, an overall engagement score should be generated based on question-asking, gap admission, and receptiveness behaviors.
**Validates: Requirements 14.5**

Property 31: General Knowledge Scoring
*For any* interview session with general knowledge or current affairs questions, the Assessment_Engine should generate a general knowledge score evaluating accuracy, awareness, and breadth.
**Validates: Requirements 15.1, 15.2, 15.3, 15.4**

Property 32: Stress Management Scoring
*For any* stress interview segment, the Assessment_Engine should generate a stress management score evaluating composure, clarity under pressure, recovery, and emotional stability.
**Validates: Requirements 16.1, 16.2, 16.3, 16.4, 16.5**

Property 33: Project Understanding Scoring
*For any* project-related questions, the Assessment_Engine should generate a project understanding score evaluating technical depth, role clarity, challenge understanding, and impact awareness.
**Validates: Requirements 17.1, 17.2, 17.3, 17.4, 17.5**

Property 34: Logical Thinking Scoring
*For any* coding or logical problems, the Assessment_Engine should generate a logical thinking score evaluating problem decomposition, algorithmic thinking, optimization ability, and trade-off understanding.
**Validates: Requirements 18.1, 18.2, 18.3, 18.4, 18.5**

Property 35: Comprehensive Report Generation
*For any* completed interview session, the system should generate a comprehensive assessment report containing scores for all evaluated dimensions, overall performance summary, strengths, weaknesses, and specific supporting examples.
**Validates: Requirements 19.1, 19.2, 19.3, 19.4, 19.5**

## Error Handling

### Resume Processing Errors

1. **Invalid File Format**: When a non-PDF file is uploaded, return HTTP 400 with error message: "Invalid file format. Only PDF files are accepted."

2. **Corrupted PDF**: When a PDF cannot be read or parsed, return HTTP 422 with error message: "Unable to process PDF file. The file may be corrupted or password-protected."

3. **Empty PDF**: When a PDF contains no extractable text, return HTTP 422 with error message: "No text content found in PDF. Please ensure the resume contains readable text."

4. **Missing Required Fields**: When parsed resume lacks a name field, return HTTP 422 with error message: "Unable to extract candidate name from resume. Please ensure the resume includes your name."

5. **Parsing Failure**: When resume parsing fails unexpectedly, log the error, return HTTP 500 with error message: "An error occurred while processing your resume. Please try again or contact support."

### Interview Session Errors

1. **Invalid Candidate ID**: When starting an interview with non-existent candidate ID, return HTTP 404 with error message: "Candidate not found. Please upload a resume first."

2. **Session Not Found**: When processing answer for non-existent session, return HTTP 404 with error message: "Interview session not found or has expired."

3. **LLM Generation Failure**: When the Interview_Agent fails to generate a question, retry up to 3 times with exponential backoff. If all retries fail, return HTTP 503 with error message: "Unable to generate question. Please try again in a moment."

4. **Context Overflow**: When conversation history exceeds LLM context window, summarize earlier portions of the conversation and continue with summarized context.

5. **Invalid Interview Type**: When an unsupported interview type is requested, return HTTP 400 with error message: "Invalid interview type. Supported types are: hr_behavioral, technical_deepdive, coding_assessment, stress_scenario."

### Assessment Errors

1. **Incomplete Analysis**: When answer analysis fails for a response, log the error, use default neutral scores, and continue the interview.

2. **Scoring Failure**: When dimension scoring fails, log the error, exclude that dimension from the report, and note the failure in the report.

3. **Report Generation Failure**: When report generation fails, log the error, return HTTP 500 with error message: "Unable to generate assessment report. The interview data has been saved and you can request the report later."

### Storage Errors

1. **Database Connection Failure**: When User_Database connection fails, retry up to 3 times. If all retries fail, return HTTP 503 with error message: "Database temporarily unavailable. Please try again in a moment."

2. **Vector Database Failure**: When Vector_Database operations fail, log the error but continue operation (vector storage is supplementary). Return a warning in the response: "Interview data saved, but search functionality may be temporarily limited."

3. **Data Integrity Violation**: When attempting to store data that violates constraints, return HTTP 409 with error message: "Data conflict detected. Please refresh and try again."

4. **Storage Quota Exceeded**: When storage limits are reached, return HTTP 507 with error message: "Storage quota exceeded. Please contact support to increase your quota."

## Testing Strategy

### Dual Testing Approach

The system will employ both unit testing and property-based testing for comprehensive coverage:

**Unit Tests** focus on:
- Specific examples of resume parsing (e.g., standard format, creative format, minimal format)
- Edge cases (empty PDFs, single-page vs multi-page, special characters)
- Error conditions (corrupted files, missing fields, invalid formats)
- Integration points between components (API → Parser, Agent → Database)
- Specific interview scenarios (stress interview, coding round)

**Property-Based Tests** focus on:
- Universal properties that hold for all inputs (see Correctness Properties section)
- Comprehensive input coverage through randomization
- Round-trip properties (parse → store → retrieve, serialize → deserialize)
- Invariants (data integrity, score ranges, field presence)

### Property-Based Testing Configuration

**Framework**: Use Hypothesis (Python) for property-based testing

**Configuration**:
- Minimum 100 iterations per property test
- Each test tagged with format: **Feature: mock-interview-agent, Property {number}: {property_text}**
- Custom generators for domain objects (ResumeData, InterviewSession, QAPair)

**Example Test Structure**:
```python
from hypothesis import given, strategies as st

@given(st.text(min_size=1))
def test_pdf_validation_property(file_content):
    """
    Feature: mock-interview-agent, Property 1: PDF File Validation
    For any uploaded file, the system should accept it if and only if 
    it is a valid PDF format.
    """
    # Test implementation
```

### Test Coverage Requirements

1. **Resume Processing**: 
   - Unit tests for 5+ different resume formats
   - Property tests for validation, extraction, parsing, storage
   - Edge case tests for multi-page, empty, corrupted PDFs

2. **Interview Agent**:
   - Unit tests for each interview type
   - Property tests for question generation, context maintenance, topic coverage
   - Integration tests for full interview flows

3. **Assessment Engine**:
   - Unit tests for specific scoring scenarios
   - Property tests for all scoring dimensions
   - Edge case tests for extreme answers (very short, very long, nonsensical)

4. **Storage Layer**:
   - Unit tests for CRUD operations
   - Property tests for round-trip consistency
   - Integration tests for concurrent access

### Testing Tools and Libraries

- **Unit Testing**: pytest
- **Property-Based Testing**: Hypothesis
- **PDF Testing**: PyPDF2, pdfplumber for test PDF generation
- **LLM Testing**: Mock LLM responses for deterministic testing
- **Database Testing**: In-memory databases for fast test execution
- **API Testing**: pytest-httpx for API endpoint testing

### Continuous Testing

- All tests run on every commit
- Property tests run with 100 iterations in CI/CD
- Extended property test runs (1000+ iterations) nightly
- Performance benchmarks tracked over time
- Test coverage target: 85%+ for critical paths
