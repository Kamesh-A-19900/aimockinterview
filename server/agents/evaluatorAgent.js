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
const { getRateLimitService } = require('../services/rateLimitService');

class EvaluatorAgent {
  constructor() {
    this.groq = getGroqService();
    this.model = 'llama-3.3-70b-versatile'; // Accurate (updated model)
    this.rateLimiter = getRateLimitService();
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
      
      // Handle long conversations by chunking if needed
      let processedQAPairs = qaPairs;
      if (qaPairs.length > 15) {
        console.log(`⚠️  Long conversation detected (${qaPairs.length} Q&A pairs), using chunked evaluation`);
        processedQAPairs = this.chunkLongConversation(qaPairs);
      }
      
      // Generate evaluation
      const prompt = this.buildPrompt(processedQAPairs);
      
      const startTime = Date.now();
      
      const response = await this.rateLimiter.queueRequest(async () => {
        return await this.groq.client.chat.completions.create({
          model: this.model,
          messages: [{role: 'user', content: prompt}],
          temperature: 0, // Deterministic
          max_tokens: 1500
        });
      }, userId, 2000); // Higher token estimate for evaluation
      
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
      const correctedEval = await this.reviewAndCorrect(evaluation, processedQAPairs);
      
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
   * Chunk long conversations for better evaluation
   * @param {Array} qaPairs - Question-answer pairs
   * @returns {Array} Chunked Q&A pairs
   */
  chunkLongConversation(qaPairs) {
    // For long conversations, focus on:
    // 1. First 3 Q&A pairs (opening)
    // 2. Last 3 Q&A pairs (closing)
    // 3. Most substantial answers in between (by length)
    
    if (qaPairs.length <= 10) {
      return qaPairs;
    }
    
    const chunked = [];
    
    // Add first 3 pairs
    chunked.push(...qaPairs.slice(0, 3));
    
    // Add most substantial middle answers
    if (qaPairs.length > 6) {
      const middlePairs = qaPairs.slice(3, -3);
      
      // Sort by answer length and take top 4
      const substantialPairs = middlePairs
        .filter(qa => qa.answer && qa.answer.length > 50)
        .sort((a, b) => (b.answer?.length || 0) - (a.answer?.length || 0))
        .slice(0, 4);
      
      chunked.push(...substantialPairs);
    }
    
    // Add last 3 pairs
    chunked.push(...qaPairs.slice(-3));
    
    console.log(`📊 Chunked conversation: ${qaPairs.length} → ${chunked.length} Q&A pairs`);
    return chunked;
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
    
    return `You are a STRICT and PROFESSIONAL interview evaluator with 15+ years of experience. You evaluate candidates for top-tier tech companies and maintain HIGH STANDARDS.

Interview Transcript:
${transcript}

STRICT EVALUATION CRITERIA:

1. Communication (0-100):
   - 90-100: Exceptional clarity, perfect structure, executive-level articulation
   - 70-89: Good communication with minor issues
   - 50-69: Average communication, some unclear points
   - 30-49: Poor communication, hard to follow
   - 0-29: Very poor, incoherent responses

2. Correctness (0-100):
   - 90-100: Technically perfect, demonstrates deep expertise
   - 70-89: Mostly correct with minor gaps
   - 50-69: Some correct points but significant gaps
   - 30-49: More wrong than right, fundamental misunderstandings
   - 0-29: Mostly incorrect or no technical content

3. Confidence (0-100):
   - 90-100: Extremely confident, decisive, leadership presence
   - 70-89: Generally confident with occasional hesitation
   - 50-69: Moderate confidence, some uncertainty
   - 30-49: Lacks confidence, frequent hesitation
   - 0-29: Very uncertain, no conviction

4. Stress Handling (0-100):
   - 90-100: Thrives under pressure, maintains composure perfectly
   - 70-89: Handles pressure well with minor stress signs
   - 50-69: Adequate stress handling, some visible pressure
   - 30-49: Struggles with pressure, affects performance
   - 0-29: Cannot handle pressure, breaks down

HARSH REALITY CHECKS:
- One-word answers = automatic 20-30 points deduction
- Vague responses without specifics = major penalty
- "I don't know" without follow-up = significant deduction
- Generic answers that could apply to anyone = low scores
- No concrete examples or metrics = major penalty
- Unprofessional language or attitude = severe penalty

SCORING PHILOSOPHY:
- 50/100 is AVERAGE, not good
- 70+ requires STRONG performance with specific examples
- 80+ requires EXCEPTIONAL performance with quantified results
- 90+ is reserved for OUTSTANDING candidates who exceed expectations
- Be TOUGH but FAIR - this is a competitive job market

Calculate overall_score as the average of the 4 dimensions.

Provide HONEST and CONSTRUCTIVE feedback:
- Overall feedback (7-8 sentences, be direct about weaknesses)
- Strengths: List 2-4 GENUINE strengths (only if truly demonstrated)
- Weaknesses: List 3-6 specific areas needing improvement
- Recommendations: List 4-6 actionable steps for improvement

CRITICAL RULES:
1. BE STRICT - Don't inflate scores
2. Quotes must be EXACT from transcript
3. No participation trophies - earn your score
4. If answer is weak/missing, score accordingly
5. Look for SPECIFICS, EXAMPLES, and QUANTIFIED RESULTS
6. Professional standards matter - evaluate like a real interview
7. Output MUST be valid JSON only

Output format (VALID JSON ONLY):
{
  "communication_score": number,
  "correctness_score": number,
  "confidence_score": number,
  "stress_handling_score": number,
  "overall_score": number,
  "feedback_text": "string",
  "strengths": ["strength 1", "strength 2"],
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
      
      const response = await this.rateLimiter.queueRequest(async () => {
        return await this.groq.client.chat.completions.create({
          model: this.model,
          messages: [{role: 'user', content: reviewPrompt}],
          temperature: 0,
          max_tokens: 1000
        });
      }, 'system', 1500); // System user for review calls
      
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
    
    // Analyze the actual interview content for more personalized feedback
    const answeredCount = qaPairs.filter(qa => qa.answer && qa.answer.length > 50).length;
    const totalCount = qaPairs.length;
    const answerRate = answeredCount / totalCount;
    
    // Analyze answer characteristics
    const answers = qaPairs.filter(qa => qa.answer).map(qa => qa.answer);
    const avgAnswerLength = answers.reduce((sum, ans) => sum + ans.length, 0) / answers.length || 0;
    const shortAnswers = answers.filter(ans => ans.length < 100).length;
    const hasExamples = answers.some(ans => ans.toLowerCase().includes('example') || ans.toLowerCase().includes('for instance'));
    const hasNumbers = answers.some(ans => /\d+/.test(ans));
    const hasUncertainty = answers.some(ans => ans.toLowerCase().includes("i don't know") || ans.toLowerCase().includes("not sure"));
    
    // Generate dynamic weaknesses based on content analysis
    const dynamicWeaknesses = [];
    const dynamicRecommendations = [];
    const dynamicStrengths = [];
    
    // Analyze content for personalized feedback
    if (shortAnswers > answers.length * 0.6) {
      dynamicWeaknesses.push('Responses tend to be brief and lack detailed explanations');
      dynamicRecommendations.push('Provide more comprehensive answers with specific details');
    }
    
    if (!hasExamples) {
      dynamicWeaknesses.push('Limited use of concrete examples to support points');
      dynamicRecommendations.push('Include specific examples from your experience to illustrate your points');
    } else {
      dynamicStrengths.push('Uses examples to support responses');
    }
    
    if (!hasNumbers) {
      dynamicWeaknesses.push('Lacks quantifiable metrics or specific data points');
      dynamicRecommendations.push('Include specific numbers, percentages, or metrics when discussing achievements');
    } else {
      dynamicStrengths.push('Incorporates quantifiable information in responses');
    }
    
    if (hasUncertainty) {
      dynamicWeaknesses.push('Shows uncertainty in responses without providing alternatives');
      dynamicRecommendations.push('When unsure, acknowledge it but offer your best understanding or approach');
    }
    
    if (avgAnswerLength > 200) {
      dynamicStrengths.push('Provides detailed and comprehensive responses');
    }
    
    if (answerRate > 0.8) {
      dynamicStrengths.push('Consistently engaged throughout the interview');
    }
    
    // Analyze question types for targeted feedback
    const questions = qaPairs.map(qa => qa.question.toLowerCase());
    const hasTechnicalQuestions = questions.some(q => 
      q.includes('technical') || q.includes('code') || q.includes('algorithm') || 
      q.includes('system') || q.includes('database') || q.includes('programming')
    );
    const hasBehavioralQuestions = questions.some(q => 
      q.includes('tell me about') || q.includes('describe a time') || 
      q.includes('how do you handle') || q.includes('experience with')
    );
    
    if (hasTechnicalQuestions) {
      dynamicRecommendations.push('Review technical concepts and practice explaining complex topics clearly');
    }
    
    if (hasBehavioralQuestions) {
      dynamicRecommendations.push('Practice the STAR method (Situation, Task, Action, Result) for behavioral questions');
    }
    
    // Ensure we have minimum content
    if (dynamicWeaknesses.length === 0) {
      dynamicWeaknesses.push('Consider providing more structured responses');
    }
    if (dynamicRecommendations.length === 0) {
      dynamicRecommendations.push('Focus on clear and organized communication');
    }
    if (dynamicStrengths.length === 0) {
      dynamicStrengths.push('Completed the interview session');
    }
    
    // Base score on answer rate and content quality
    let baseScore = Math.round(answerRate * 60); // Start with participation
    if (avgAnswerLength > 150) baseScore += 10; // Bonus for detailed answers
    if (hasExamples) baseScore += 5; // Bonus for examples
    if (hasNumbers) baseScore += 5; // Bonus for metrics
    baseScore = Math.min(baseScore, 75); // Cap fallback scores at 75
    
    // Generate personalized feedback text
    const feedbackParts = [
      `Completed ${answeredCount} out of ${totalCount} questions with an average response length of ${Math.round(avgAnswerLength)} characters.`
    ];
    
    if (answerRate > 0.7) {
      feedbackParts.push('Demonstrated good engagement throughout the interview.');
    } else {
      feedbackParts.push('Consider providing responses to all questions for a complete evaluation.');
    }
    
    if (avgAnswerLength < 100) {
      feedbackParts.push('Responses could benefit from more detailed explanations and examples.');
    }
    
    return {
      communication_score: baseScore,
      correctness_score: baseScore,
      confidence_score: baseScore,
      stress_handling_score: baseScore,
      overall_score: baseScore,
      feedback_text: feedbackParts.join(' '),
      strengths: dynamicStrengths.slice(0, 4), // Limit to 4 strengths
      weaknesses: dynamicWeaknesses.slice(0, 5), // Limit to 5 weaknesses
      recommendations: dynamicRecommendations.slice(0, 6), // Limit to 6 recommendations
      evidence: {
        communication: {
          quote: qaPairs[0]?.answer?.substring(0, 100) || 'No answer provided',
          reasoning: `Based on response clarity and average length of ${Math.round(avgAnswerLength)} characters`
        },
        correctness: {
          quote: qaPairs.find(qa => qa.answer && qa.answer.length > 50)?.answer?.substring(0, 100) || 'Limited content',
          reasoning: 'Based on answer completeness and detail level'
        },
        confidence: {
          quote: hasUncertainty ? 
            answers.find(ans => ans.toLowerCase().includes("i don't know"))?.substring(0, 100) || 'Shows some uncertainty' :
            qaPairs[Math.floor(qaPairs.length/2)]?.answer?.substring(0, 100) || 'Moderate confidence',
          reasoning: hasUncertainty ? 'Shows uncertainty in responses' : 'Based on response assertiveness'
        },
        stress_handling: {
          quote: qaPairs[qaPairs.length-1]?.answer?.substring(0, 100) || 'Completed interview',
          reasoning: `Maintained engagement through ${totalCount} questions`
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
