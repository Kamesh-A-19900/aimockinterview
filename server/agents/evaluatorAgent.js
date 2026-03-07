/**
 * Evaluator Agent - Scorer
 * 
 * Model: Groq Llama 3.1 70B (Accurate & Deterministic)
 * 
 * Responsibilities:
 * - Score answers across rubric dimensions
 * - Provide evidence-based grading (quotes)
 * - Self-correction loop for bias detection
 * - Deterministic scoring (temperature=0)
 * - Handle 10% of interactions
 * 
 * Cost: ~$0.001 per request
 */

const { getGroqService } = require('../services/groqService');
const { chromaService } = require('../services/chromaService');
const { getIntegrityChecker } = require('../services/integrityChecker');

class EvaluatorAgent {
  constructor() {
    this.groq = getGroqService();
    this.model = 'llama-3.3-70b-versatile'; // Accurate (updated model)
  }
  
  /**
   * Evaluate interview Q&A pairs
   * @param {Array} qaPairs - Question-answer pairs
   * @param {string} userId - User ID for privacy isolation
   * @returns {Promise<Object>} Evaluation scores
   */
  async evaluate(qaPairs, userId) {
    try {
      // Check interview integrity FIRST
      const integrityChecker = getIntegrityChecker();
      const integrityAnalysis = integrityChecker.analyzeInterview(qaPairs);
      
      console.log(`🔍 Integrity Check: ${integrityAnalysis.status.toUpperCase()}`);
      console.log(`   Critical Issues: ${integrityAnalysis.criticalIssues}`);
      console.log(`   Warning Issues: ${integrityAnalysis.warningIssues}`);
      console.log(`   Integrity Score: ${integrityAnalysis.integrityScore}/100`);
      
      // If integrity is compromised, return special evaluation
      if (integrityAnalysis.status === 'fail') {
        console.log('❌ Interview integrity compromised - returning integrity failure evaluation');
        return this.getIntegrityFailureEvaluation(qaPairs, integrityAnalysis);
      }
      
      // Check cache first - ONLY from same user (privacy)
      const cachedEval = await this.checkCache(qaPairs, userId);
      if (cachedEval) {
        console.log(`✅ Evaluator Agent: Using cached evaluation for user ${userId}`);
        // Add integrity analysis to cached evaluation
        cachedEval.integrityAnalysis = integrityAnalysis;
        return cachedEval;
      }
      
      // Generate evaluation
      const prompt = this.buildPrompt(qaPairs);
      
      const startTime = Date.now();
      
      const response = await this.groq.client.chat.completions.create({
        model: this.model,
        messages: [{role: 'user', content: prompt}],
        temperature: 0, // Deterministic
        max_tokens: 1500
      });
      
      const duration = Date.now() - startTime;
      console.log(`✅ Evaluator Agent: Generated evaluation in ${duration}ms`);
      
      const content = response.choices[0].message.content.trim();
      
      // Try to extract JSON from response (handle markdown code blocks)
      let jsonStr = content;
      
      // Remove markdown code blocks if present
      if (content.includes('```json')) {
        const match = content.match(/```json\s*([\s\S]*?)\s*```/);
        if (match) {
          jsonStr = match[1];
        }
      } else if (content.includes('```')) {
        const match = content.match(/```\s*([\s\S]*?)\s*```/);
        if (match) {
          jsonStr = match[1];
        }
      }
      
      // Extract JSON object
      const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in evaluation response');
      }
      
      // Clean up common JSON issues
      let cleanJson = jsonMatch[0]
        .replace(/,\s*}/g, '}')  // Remove trailing commas
        .replace(/,\s*]/g, ']')  // Remove trailing commas in arrays
        .replace(/\n/g, ' ')      // Remove newlines
        .replace(/\r/g, '')       // Remove carriage returns
        .replace(/\t/g, ' ')      // Replace tabs with spaces
        .replace(/\s+/g, ' ');    // Normalize whitespace
      
      const evaluation = JSON.parse(cleanJson);
      
      // Add integrity analysis to evaluation
      evaluation.integrityAnalysis = integrityAnalysis;
      
      // Adjust scores if integrity concerns exist
      if (integrityAnalysis.status === 'concern') {
        console.log('⚠️  Integrity concerns detected - adjusting scores');
        evaluation.communication_score = Math.min(evaluation.communication_score, 60);
        evaluation.correctness_score = Math.min(evaluation.correctness_score, 60);
        evaluation.confidence_score = Math.min(evaluation.confidence_score, 60);
        evaluation.stress_handling_score = Math.min(evaluation.stress_handling_score, 60);
        evaluation.overall_score = Math.round(
          (evaluation.communication_score + evaluation.correctness_score + 
           evaluation.confidence_score + evaluation.stress_handling_score) / 4
        );
        
        // Add integrity note to feedback
        evaluation.feedback_text = `INTEGRITY CONCERN: ${integrityAnalysis.recommendation}\n\n${evaluation.feedback_text}`;
        
        // Add integrity issue to weaknesses
        if (!evaluation.weaknesses) evaluation.weaknesses = [];
        evaluation.weaknesses.unshift('Integrity concerns detected in responses');
      }
      
      // Self-correction loop
      const correctedEval = await this.reviewAndCorrect(evaluation, qaPairs);
      
      // Cache evaluation - PRIVATE per user
      await this.cacheEvaluation(qaPairs, correctedEval, userId);
      
      return correctedEval;
    } catch (error) {
      console.error('❌ Evaluator Agent error:', error.message);
      
      // Log the problematic response for debugging
      if (error.message.includes('JSON')) {
        console.error('❌ Invalid JSON response. First 500 chars:', 
          response?.choices?.[0]?.message?.content?.substring(0, 500) || 'No response');
      }
      
      // Fallback evaluation
      return this.getFallbackEvaluation(qaPairs);
    }
  }
  
  /**
   * Build prompt for evaluation
   * @param {Array} qaPairs - Question-answer pairs
   * @returns {string} Prompt
   */
  buildPrompt(qaPairs) {
    const transcript = qaPairs.map((qa, i) => 
      `Q${i + 1}: ${qa.question}\nA${i + 1}: ${qa.answer || 'No answer provided'}`
    ).join('\n\n');
    
    return `You are an objective interview evaluator. Analyze the candidate's performance based on this Q&A transcript.

Interview Transcript:
${transcript}

Evaluation Rubric:
1. Communication (0-100): Clarity, articulation, structure of responses
2. Correctness (0-100): Technical accuracy and depth of knowledge
3. Confidence (0-100): Assertiveness and conviction in answers
4. Stress Handling (0-100): Composure and adaptability under pressure

For each dimension:
- Provide a score (0-100)
- Extract an exact quote from the transcript as evidence
- Explain your reasoning (2-3 sentences)

Calculate overall_score as the average of the 4 dimensions.

Provide comprehensive feedback:
- Overall feedback (3-4 sentences)
- Strengths: List 3-5 specific strengths demonstrated (array of strings)
- Weaknesses: List 3-5 areas for improvement (array of strings)
- Recommendations: List 3-5 actionable recommendations (array of strings)

CRITICAL RULES:
1. Scores must be justified by actual quotes from the transcript
2. Quotes must be EXACT (word-for-word from transcript)
3. Be objective and evidence-based
4. No hallucinations or invented information
5. If answer is missing, score that dimension lower
6. Strengths, weaknesses, and recommendations must be specific and actionable
7. Output MUST be valid JSON only - no markdown, no code blocks, no extra text

Output format (VALID JSON ONLY):
{
  "communication_score": number,
  "correctness_score": number,
  "confidence_score": number,
  "stress_handling_score": number,
  "overall_score": number,
  "feedback_text": "string",
  "strengths": ["strength 1", "strength 2", "strength 3"],
  "weaknesses": ["weakness 1", "weakness 2", "weakness 3"],
  "recommendations": ["recommendation 1", "recommendation 2", "recommendation 3"],
  "evidence": {
    "communication": {"quote": "exact quote", "reasoning": "explanation"},
    "correctness": {"quote": "exact quote", "reasoning": "explanation"},
    "confidence": {"quote": "exact quote", "reasoning": "explanation"},
    "stress_handling": {"quote": "exact quote", "reasoning": "explanation"}
  }
}`;
  }
  
  /**
   * Review and correct evaluation for bias
   * @param {Object} evaluation - Initial evaluation
   * @param {Array} qaPairs - Original Q&A pairs
   * @returns {Promise<Object>} Corrected evaluation
   */
  async reviewAndCorrect(evaluation, qaPairs) {
    try {
      const reviewPrompt = `You are a bias detector reviewing an interview evaluation.

Original Evaluation:
${JSON.stringify(evaluation, null, 2)}

Original Q&A Transcript:
${JSON.stringify(qaPairs, null, 2)}

Check for:
1. Are scores justified by the quotes provided?
2. Are the quotes EXACT and accurate (word-for-word)?
3. Is there any bias (too harsh or too lenient)?
4. Are there any hallucinations (invented information)?
5. Is the overall_score correctly calculated as average of 4 dimensions?

If issues found, provide corrected scores.

Output JSON:
{
  "has_issues": boolean,
  "issues": [string],
  "corrected_evaluation": object (only if has_issues is true)
}`;
      
      const response = await this.groq.client.chat.completions.create({
        model: this.model,
        messages: [{role: 'user', content: reviewPrompt}],
        temperature: 0,
        max_tokens: 1000
      });
      
      const content = response.choices[0].message.content.trim();
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      
      if (!jsonMatch) {
        console.log('⚠️  Review failed, using original evaluation');
        return evaluation;
      }
      
      const review = JSON.parse(jsonMatch[0]);
      
      if (review.has_issues && review.corrected_evaluation) {
        console.log('✅ Self-correction applied:', review.issues);
        return review.corrected_evaluation;
      }
      
      return evaluation;
    } catch (error) {
      console.error('❌ Review error:', error.message);
      return evaluation; // Return original if review fails
    }
  }
  
  /**
   * Check cache for similar evaluation - PRIVATE per user
   * @param {Array} qaPairs - Question-answer pairs
   * @param {string} userId - User ID for privacy filtering
   * @returns {Promise<Object|null>} Cached evaluation or null
   */
  async checkCache(qaPairs, userId) {
    try {
      // Combine all answers for similarity check
      const combinedAnswers = qaPairs
        .map(qa => qa.answer || '')
        .join(' ');
      
      const cached = await chromaService.queryCachedEvaluation(combinedAnswers, userId);
      return cached;
    } catch (error) {
      console.error('❌ Cache check error:', error.message);
      return null;
    }
  }
  
  /**
   * Cache evaluation for future use - PRIVATE per user
   * @param {Array} qaPairs - Question-answer pairs
   * @param {Object} evaluation - Evaluation to cache
   * @param {string} userId - User ID for privacy isolation
   */
  async cacheEvaluation(qaPairs, evaluation, userId) {
    try {
      const combinedAnswers = qaPairs
        .map(qa => qa.answer || '')
        .join(' ');
      
      const combinedQuestions = qaPairs
        .map(qa => qa.question)
        .join(' | ');
      
      await chromaService.cacheQA(combinedQuestions, combinedAnswers, evaluation, userId);
      console.log(`✅ Evaluation cached for user ${userId} (private)`);
    } catch (error) {
      console.error('❌ Cache save error:', error.message);
    }
  }
  
  /**
   * Get fallback evaluation if API fails
   * @param {Array} qaPairs - Question-answer pairs
   * @returns {Object} Fallback evaluation
   */
  getFallbackEvaluation(qaPairs) {
    console.log('⚠️  Using fallback evaluation');
    
    // Simple heuristic-based evaluation
    const answeredCount = qaPairs.filter(qa => qa.answer && qa.answer.length > 50).length;
    const totalCount = qaPairs.length;
    const answerRate = answeredCount / totalCount;
    
    // Base score on answer rate and length
    const baseScore = Math.round(answerRate * 70); // Max 70 for fallback
    
    return {
      communication_score: baseScore,
      correctness_score: baseScore,
      confidence_score: baseScore,
      stress_handling_score: baseScore,
      overall_score: baseScore,
      feedback_text: `Completed ${answeredCount} out of ${totalCount} questions. ${
        answerRate > 0.7 
          ? 'Good participation and engagement.' 
          : 'Consider providing more detailed responses in future interviews.'
      }`,
      strengths: [
        'Completed the interview session',
        'Provided responses to questions',
        'Demonstrated engagement with the process'
      ],
      weaknesses: [
        'Some responses could be more detailed',
        'Consider providing more specific examples',
        'Work on elaborating technical concepts'
      ],
      recommendations: [
        'Practice the STAR method for behavioral questions',
        'Prepare specific examples from your experience',
        'Review technical concepts before interviews',
        'Focus on clear and structured communication'
      ],
      evidence: {
        communication: {
          quote: qaPairs[0]?.answer?.substring(0, 100) || 'No answer',
          reasoning: 'Based on overall response quality'
        },
        correctness: {
          quote: qaPairs[0]?.answer?.substring(0, 100) || 'No answer',
          reasoning: 'Based on answer completeness'
        },
        confidence: {
          quote: qaPairs[0]?.answer?.substring(0, 100) || 'No answer',
          reasoning: 'Based on response assertiveness'
        },
        stress_handling: {
          quote: qaPairs[0]?.answer?.substring(0, 100) || 'No answer',
          reasoning: 'Based on interview completion'
        }
      }
    };
  }
  
  /**
   * Get evaluation for integrity failure cases
   * @param {Array} qaPairs - Question-answer pairs
   * @param {Object} integrityAnalysis - Integrity analysis result
   * @returns {Object} Integrity failure evaluation
   */
  getIntegrityFailureEvaluation(qaPairs, integrityAnalysis) {
    console.log('❌ Generating integrity failure evaluation');
    
    // Very low scores for integrity failures
    const baseScore = 15;
    
    // Build detailed feedback about integrity issues
    const issueDescriptions = integrityAnalysis.issues
      .filter(i => i.severity === 'critical')
      .map(i => `- ${i.message}: "${i.answer.substring(0, 100)}..."`)
      .join('\n');
    
    return {
      communication_score: baseScore,
      correctness_score: baseScore,
      confidence_score: baseScore,
      stress_handling_score: baseScore,
      overall_score: baseScore,
      feedback_text: `INTERVIEW INTEGRITY COMPROMISED\n\n${integrityAnalysis.recommendation}\n\nCritical Issues Detected:\n${issueDescriptions}\n\nThis interview cannot be evaluated fairly due to admitted dishonesty or non-serious participation. The candidate either admitted to providing false information, showed non-serious intent, or refused to engage properly with the interview process.`,
      strengths: [
        'Attended the interview session'
      ],
      weaknesses: [
        'Admitted to providing false information on resume',
        'Showed non-serious intent during interview',
        'Failed to engage authentically with questions',
        'Demonstrated lack of professional integrity',
        'Provided inappropriate or dishonest responses'
      ],
      recommendations: [
        'Be honest about your background and experience',
        'Only apply for positions you are genuinely interested in',
        'Prepare authentic examples from your real experience',
        'Take interview process seriously and professionally',
        'Build genuine skills and experience rather than fabricating credentials'
      ],
      evidence: {
        communication: {
          quote: integrityAnalysis.issues[0]?.answer?.substring(0, 150) || 'Multiple integrity violations',
          reasoning: 'Candidate admitted dishonesty or showed non-serious intent'
        },
        correctness: {
          quote: integrityAnalysis.issues[0]?.answer?.substring(0, 150) || 'Multiple integrity violations',
          reasoning: 'Cannot assess correctness due to admitted false information'
        },
        confidence: {
          quote: integrityAnalysis.issues[0]?.answer?.substring(0, 150) || 'Multiple integrity violations',
          reasoning: 'Lack of authentic engagement with interview process'
        },
        stress_handling: {
          quote: integrityAnalysis.issues[0]?.answer?.substring(0, 150) || 'Multiple integrity violations',
          reasoning: 'Inappropriate responses indicate inability to handle professional situations'
        }
      },
      integrityAnalysis: integrityAnalysis
    };
  }
}

module.exports = { EvaluatorAgent };
