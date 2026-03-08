const Groq = require('groq-sdk');
const { getRateLimitService } = require('./rateLimitService');

class GroqService {
  constructor() {
    this.client = new Groq({
      apiKey: process.env.GROQ_API_KEY
    });
    
    this.model = 'llama-3.1-8b-instant'; // Fast and smart
    this.rateLimiter = getRateLimitService();
  }

  /**
   * Make rate-limited API call
   * @param {Object} params - API call parameters
   * @param {string} userId - User ID for rate limiting
   * @returns {Promise} API response
   */
  async makeRateLimitedCall(params, userId = 'system') {
    const estimatedTokens = this.estimateTokens(params);
    
    return this.rateLimiter.queueRequest(async () => {
      return await this.client.chat.completions.create(params);
    }, userId, estimatedTokens);
  }
  
  /**
   * Estimate token usage for rate limiting
   * @param {Object} params - API parameters
   * @returns {number} Estimated tokens
   */
  estimateTokens(params) {
    const content = params.messages?.map(m => m.content).join(' ') || '';
    const inputTokens = Math.ceil(content.length / 4); // Rough estimate: 4 chars per token
    const outputTokens = params.max_tokens || 500;
    return inputTokens + outputTokens;
  }

  /**
   * Extract structured resume data using Groq LLM
   * @param {string} resumeText - Raw text from PDF
   * @param {string} userId - User ID for rate limiting
   * @returns {Promise<Object>} Structured resume data
   */
  async extractResumeData(resumeText, userId = 'system') {
    const prompt = `You are a resume parser. Extract the following information from the resume text below and return it as a JSON object.

Required fields:
- name: Full name of the candidate
- email: Email address
- phone: Phone number
- address: Physical address or location
- linkedin: LinkedIn profile URL
- github: GitHub profile URL
- skills: Array of technical and soft skills
- languages: Array of spoken/written languages
- education: Array of education entries with {institution, degree, field, graduationYear}
- experience: Array of work experience with {company, position, duration, description}
- projects: Array of projects with {name, description, technologies}
- about: Summary or objective statement

If a field is not found, use null for strings, empty array [] for arrays.

Resume Text:
${resumeText}

Return ONLY valid JSON, no additional text or markdown formatting.`;

    try {
      const startTime = Date.now();
      
      const response = await this.makeRateLimitedCall({
        model: this.model,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.1,
        max_tokens: 2000
      }, userId);
      
      const duration = Date.now() - startTime;
      console.log(`✅ Groq LLM extraction completed in ${duration}ms`);
      
      const content = response.choices[0].message.content;
      
      // Parse JSON from response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in LLM response');
      }
      
      const extractedData = JSON.parse(jsonMatch[0]);
      return extractedData;
      
    } catch (error) {
      console.error('❌ Groq LLM extraction failed:', error.message);
      throw error;
    }
  }

  /**
   * Generate interview question based on context
   * @param {Object} context - Resume data and previous Q&A
   * @returns {Promise<string>} Generated question
   */
  async generateInterviewQuestion(context) {
    const { resumeData, previousQA = [], sessionType = 'resume', roleContext = null } = context;
    
    let prompt = `You are an experienced technical interviewer. Generate the next interview question.

`;

    if (sessionType === 'resume' && resumeData) {
      prompt += `Candidate Background:
- Name: ${resumeData.name || 'Not specified'}
- Skills: ${resumeData.skills?.join(', ') || 'Not specified'}
- Experience: ${resumeData.experience?.map(e => e.position).join(', ') || 'Not specified'}
- Projects: ${resumeData.projects?.map(p => p.name).join(', ') || 'Not specified'}

`;
    }

    if (sessionType === 'practice' && roleContext) {
      prompt += `Interview Role: ${roleContext.title}
Role Description: ${roleContext.description}

`;
    }

    if (previousQA.length > 0) {
      prompt += `Previous Q&A:
${previousQA.slice(-3).map((qa, i) => `Q${i + 1}: ${qa.question}\nA${i + 1}: ${qa.answer}`).join('\n\n')}

`;
    }

    prompt += `Generate a follow-up question that:
1. ${sessionType === 'resume' ? 'Relates to their resume and experience' : 'Tests knowledge for the ' + (roleContext?.title || 'role')}
2. ${previousQA.length > 0 ? 'Builds on their previous answers' : 'Starts the interview appropriately'}
3. Is clear, professional, and conversational
4. Assesses technical knowledge or problem-solving skills

Return ONLY the question text, no additional formatting or explanation.`;

    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 200
      });
      
      return response.choices[0].message.content.trim();
    } catch (error) {
      console.error('❌ Groq question generation failed:', error.message);
      throw error;
    }
  }

  /**
   * Generate comprehensive assessment from interview Q&A
   * @param {Array} qaPairs - All question-answer pairs from interview
   * @returns {Promise<Object>} Assessment scores and feedback
   */
  async generateAssessment(qaPairs) {
    const transcript = qaPairs.map((qa, i) => 
      `Q${i + 1}: ${qa.question}\nA${i + 1}: ${qa.answer}`
    ).join('\n\n');

    const prompt = `You are an interview assessment expert. Evaluate the candidate's performance based on the following Q&A transcript.

Interview Transcript:
${transcript}

Provide scores (0-100) for these dimensions:
1. Communication: Clarity, articulation, structure of responses
2. Correctness: Technical accuracy and depth of knowledge
3. Confidence: Assertiveness and conviction in answers
4. Stress Handling: Composure and adaptability under pressure

Also provide detailed feedback explaining the scores and areas for improvement.

Return as JSON:
{
  "communication_score": number,
  "correctness_score": number,
  "confidence_score": number,
  "stress_handling_score": number,
  "overall_score": number,
  "feedback_text": "detailed explanation"
}

Return ONLY valid JSON, no additional text.`;

    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 1000
      });
      
      const content = response.choices[0].message.content;
      
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in assessment response');
      }
      
      const assessment = JSON.parse(jsonMatch[0]);
      
      // Calculate overall score if not provided
      if (!assessment.overall_score) {
        assessment.overall_score = Math.round(
          (assessment.communication_score + 
           assessment.correctness_score + 
           assessment.confidence_score + 
           assessment.stress_handling_score) / 4
        );
      }
      
      return assessment;
    } catch (error) {
      console.error('❌ Groq assessment generation failed:', error.message);
      throw error;
    }
  }
}

// Singleton instance
let groqService = null;

function getGroqService() {
  if (!groqService) {
    groqService = new GroqService();
  }
  return groqService;
}

module.exports = { GroqService, getGroqService };
