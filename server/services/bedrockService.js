const { BedrockRuntimeClient, InvokeModelCommand } = require('@aws-sdk/client-bedrock-runtime');

class BedrockService {
  constructor() {
    this.client = new BedrockRuntimeClient({
      region: process.env.AWS_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
      }
    });
    
    this.modelId = process.env.BEDROCK_MODEL_ID || 'anthropic.claude-3-haiku-20240307-v1:0';
  }

  /**
   * Extract structured resume data using LLM (PRIMARY METHOD)
   * @param {string} resumeText - Raw text from PDF
   * @returns {Promise<Object>} Structured resume data
   */
  async extractResumeData(resumeText) {
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
      
      const response = await this.invokeModel(prompt, {
        max_tokens: 2000,
        temperature: 0.1
      });
      
      const duration = Date.now() - startTime;
      console.log(`✅ LLM extraction completed in ${duration}ms`);
      
      // Parse JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in LLM response');
      }
      
      const extractedData = JSON.parse(jsonMatch[0]);
      return extractedData;
      
    } catch (error) {
      console.error('❌ LLM extraction failed:', error.message);
      throw error;
    }
  }

  /**
   * Generate interview question based on context
   * @param {Object} context - Resume data and previous Q&A
   * @returns {Promise<string>} Generated question
   */
  async generateInterviewQuestion(context) {
    const { resumeData, previousQA = [], sessionType = 'resume' } = context;
    
    let prompt = `You are an experienced technical interviewer. Generate the next interview question.

`;

    if (sessionType === 'resume' && resumeData) {
      prompt += `Candidate Background:
- Name: ${resumeData.name}
- Skills: ${resumeData.skills?.join(', ') || 'Not specified'}
- Experience: ${resumeData.experience?.map(e => e.position).join(', ') || 'Not specified'}
- Projects: ${resumeData.projects?.map(p => p.name).join(', ') || 'Not specified'}

`;
    }

    if (previousQA.length > 0) {
      prompt += `Previous Q&A:
${previousQA.map((qa, i) => `Q${i + 1}: ${qa.question}\nA${i + 1}: ${qa.answer}`).join('\n\n')}

`;
    }

    prompt += `Generate a follow-up question that:
1. ${sessionType === 'resume' ? 'Relates to their resume and experience' : 'Tests general knowledge for the role'}
2. ${previousQA.length > 0 ? 'Builds on their previous answers' : 'Starts the interview appropriately'}
3. Is clear, professional, and conversational
4. Assesses technical knowledge or problem-solving skills

Return ONLY the question text, no additional formatting.`;

    try {
      const response = await this.invokeModel(prompt, {
        max_tokens: 200,
        temperature: 0.7
      });
      
      return response.trim();
    } catch (error) {
      console.error('❌ Question generation failed:', error.message);
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
      const response = await this.invokeModel(prompt, {
        max_tokens: 1000,
        temperature: 0.3
      });
      
      const jsonMatch = response.match(/\{[\s\S]*\}/);
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
      console.error('❌ Assessment generation failed:', error.message);
      throw error;
    }
  }

  /**
   * Invoke Bedrock model with prompt
   * @param {string} prompt - Input prompt
   * @param {Object} options - Model parameters
   * @returns {Promise<string>} Model response
   */
  async invokeModel(prompt, options = {}) {
    const payload = {
      anthropic_version: 'bedrock-2023-05-31',
      max_tokens: options.max_tokens || 1000,
      temperature: options.temperature || 0.7,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    };

    const command = new InvokeModelCommand({
      modelId: this.modelId,
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify(payload)
    });

    try {
      const response = await this.client.send(command);
      const responseBody = JSON.parse(new TextDecoder().decode(response.body));
      
      return responseBody.content[0].text;
    } catch (error) {
      console.error('Bedrock API error:', error);
      throw new Error(`Bedrock invocation failed: ${error.message}`);
    }
  }
}

// Singleton instance
let bedrockService = null;

function getBedrockService() {
  if (!bedrockService) {
    bedrockService = new BedrockService();
  }
  return bedrockService;
}

module.exports = { BedrockService, getBedrockService };
