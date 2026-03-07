/**
 * Integrity Checker Service
 * 
 * Detects and handles inappropriate, dishonest, or non-serious interview responses
 * 
 * Red Flags:
 * - Admitting fake resume/credentials
 * - Refusing to answer questions
 * - Non-serious responses ("just for fun")
 * - Requesting rejection
 * - Inappropriate behavior
 */

class IntegrityChecker {
  /**
   * Check if response indicates integrity issues
   * @param {string} answer - Candidate's answer
   * @returns {Object} { hasIssue: boolean, issueType: string, severity: string }
   */
  checkResponse(answer) {
    if (!answer || typeof answer !== 'string') {
      return { hasIssue: false };
    }
    
    const lowerAnswer = answer.toLowerCase().trim();
    
    // Critical issues - immediate red flags
    const criticalPatterns = [
      { pattern: /fake|fabricated|made up|not real|didn't do|never did/i, type: 'fake_credentials' },
      { pattern: /not qualified|reject me|don't hire|not suitable/i, type: 'self_disqualification' },
      { pattern: /just for fun|joking|not serious|wasting time/i, type: 'non_serious' },
      { pattern: /can't say|won't say|refuse to|don't want to/i, type: 'refusal_to_answer' },
      { pattern: /bad background|help me|accept me|please hire/i, type: 'inappropriate_plea' }
    ];
    
    // Check critical patterns
    for (const { pattern, type } of criticalPatterns) {
      if (pattern.test(lowerAnswer)) {
        return {
          hasIssue: true,
          issueType: type,
          severity: 'critical',
          message: this.getIssueMessage(type)
        };
      }
    }
    
    // Warning issues - concerning but not critical
    const warningPatterns = [
      { pattern: /^no$|^nope$|^nah$/i, type: 'minimal_response' },
      { pattern: /don't know|no idea|not sure|can't remember/i, type: 'lack_of_knowledge' },
      { pattern: /^.{0,10}$/i, type: 'too_short' } // Less than 10 characters
    ];
    
    // Check warning patterns
    for (const { pattern, type } of warningPatterns) {
      if (pattern.test(lowerAnswer)) {
        return {
          hasIssue: true,
          issueType: type,
          severity: 'warning',
          message: this.getIssueMessage(type)
        };
      }
    }
    
    return { hasIssue: false };
  }
  
  /**
   * Get appropriate message for issue type
   * @param {string} issueType - Type of integrity issue
   * @returns {string} Message
   */
  getIssueMessage(issueType) {
    const messages = {
      fake_credentials: 'Candidate admitted to providing false information',
      self_disqualification: 'Candidate requested to be rejected',
      non_serious: 'Candidate indicated non-serious intent',
      refusal_to_answer: 'Candidate refused to answer questions',
      inappropriate_plea: 'Candidate made inappropriate requests',
      minimal_response: 'Response lacks substance',
      lack_of_knowledge: 'Candidate expressed lack of knowledge',
      too_short: 'Response is too brief'
    };
    
    return messages[issueType] || 'Integrity concern detected';
  }
  
  /**
   * Analyze entire interview for integrity issues
   * @param {Array} qaPairs - All Q&A pairs
   * @returns {Object} Analysis result
   */
  analyzeInterview(qaPairs) {
    const issues = [];
    let criticalCount = 0;
    let warningCount = 0;
    
    for (const qa of qaPairs) {
      if (!qa.answer) continue;
      
      const check = this.checkResponse(qa.answer);
      
      if (check.hasIssue) {
        issues.push({
          question: qa.question,
          answer: qa.answer,
          issueType: check.issueType,
          severity: check.severity,
          message: check.message
        });
        
        if (check.severity === 'critical') {
          criticalCount++;
        } else {
          warningCount++;
        }
      }
    }
    
    // Determine overall integrity status
    let status = 'pass';
    let recommendation = 'Proceed with normal evaluation';
    
    if (criticalCount >= 2) {
      status = 'fail';
      recommendation = 'Interview integrity compromised - candidate admitted dishonesty or showed non-serious intent';
    } else if (criticalCount === 1) {
      status = 'concern';
      recommendation = 'Significant integrity concern detected - review carefully';
    } else if (warningCount >= 5) {
      status = 'concern';
      recommendation = 'Multiple low-quality responses - candidate may lack preparation';
    }
    
    return {
      status,
      recommendation,
      criticalIssues: criticalCount,
      warningIssues: warningCount,
      totalIssues: issues.length,
      issues: issues,
      integrityScore: this.calculateIntegrityScore(criticalCount, warningCount, qaPairs.length)
    };
  }
  
  /**
   * Calculate integrity score (0-100)
   * @param {number} criticalCount - Number of critical issues
   * @param {number} warningCount - Number of warning issues
   * @param {number} totalQuestions - Total questions answered
   * @returns {number} Integrity score
   */
  calculateIntegrityScore(criticalCount, warningCount, totalQuestions) {
    if (totalQuestions === 0) return 0;
    
    // Start at 100
    let score = 100;
    
    // Deduct heavily for critical issues
    score -= criticalCount * 40;
    
    // Deduct moderately for warnings
    score -= warningCount * 10;
    
    // Ensure score is between 0 and 100
    return Math.max(0, Math.min(100, score));
  }
}

// Singleton instance
let integrityChecker = null;

function getIntegrityChecker() {
  if (!integrityChecker) {
    integrityChecker = new IntegrityChecker();
  }
  return integrityChecker;
}

module.exports = { IntegrityChecker, getIntegrityChecker };
