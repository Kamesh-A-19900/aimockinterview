/**
 * Topic Tracker Service
 * 
 * Cost: $0 - Pure algorithmic tracking, no API calls
 * 
 * Features:
 * - Track which resume topics have been discussed
 * - Detect topic mentions in answers (keyword matching)
 * - Smart transition logic (vague vs detailed answers)
 * - Resume coverage tracking
 * - Question quality metrics
 */

class TopicTracker {
  constructor(sessionId, resumeData) {
    this.sessionId = sessionId;
    this.resumeData = resumeData;
    
    // Initialize topic tracking
    this.topics = {
      projects: this.initProjects(resumeData.projects || []),
      skills: this.initSkills(resumeData.skills || []),
      experience: this.initExperience(resumeData.experience || []),
      education: this.initEducation(resumeData.education || [])
    };
    
    // Current state
    this.currentTopic = null;
    this.currentTopicQuestionCount = 0;
    this.questionHistory = [];
    
    // Metrics
    this.metrics = {
      totalQuestions: 0,
      avgAnswerLength: 0,
      vagueAnswerCount: 0,
      detailedAnswerCount: 0,
      technicalDepth: 0
    };
  }
  
  /**
   * Initialize project tracking
   */
  initProjects(projects) {
    return projects.map(project => ({
      name: project.name || project,
      description: project.description || '',
      discussed: false,
      questionCount: 0,
      lastMentioned: null,
      depth: 0 // 0 = not discussed, 1 = mentioned, 2 = explored
    }));
  }
  
  /**
   * Initialize skill tracking
   */
  initSkills(skills) {
    return skills.map(skill => ({
      name: typeof skill === 'string' ? skill : skill.name,
      discussed: false,
      questionCount: 0,
      lastMentioned: null
    }));
  }
  
  /**
   * Initialize experience tracking
   */
  initExperience(experience) {
    return experience.map(exp => ({
      position: exp.position || '',
      company: exp.company || '',
      discussed: false,
      questionCount: 0,
      lastMentioned: null
    }));
  }
  
  /**
   * Initialize education tracking
   */
  initEducation(education) {
    return education.map(edu => ({
      degree: edu.degree || '',
      institution: edu.institution || '',
      discussed: false,
      questionCount: 0,
      lastMentioned: null
    }));
  }
  
  /**
   * Record a question and answer
   * @param {string} question - Question asked
   * @param {string} answer - Candidate's answer
   */
  recordQA(question, answer) {
    this.questionHistory.push({
      question,
      answer,
      timestamp: Date.now(),
      answerLength: answer.length,
      isVague: this.isVague(answer),
      isDetailed: this.isDetailed(answer),
      technicalDepth: this.calculateTechnicalDepth(answer)
    });
    
    // Update metrics
    this.metrics.totalQuestions++;
    this.metrics.avgAnswerLength = Math.round(
      (this.metrics.avgAnswerLength * (this.metrics.totalQuestions - 1) + answer.length) / 
      this.metrics.totalQuestions
    );
    
    if (this.isVague(answer)) {
      this.metrics.vagueAnswerCount++;
    }
    
    if (this.isDetailed(answer)) {
      this.metrics.detailedAnswerCount++;
    }
    
    this.metrics.technicalDepth += this.calculateTechnicalDepth(answer);
    
    // Detect and mark topics mentioned in answer
    this.detectAndMarkTopics(answer);
    
    // Increment current topic question count
    if (this.currentTopic) {
      this.currentTopicQuestionCount++;
    }
  }
  
  /**
   * Detect which topics were mentioned in the answer
   * @param {string} answer - Candidate's answer
   */
  detectAndMarkTopics(answer) {
    const lowerAnswer = answer.toLowerCase();
    
    // Check projects
    for (const project of this.topics.projects) {
      if (lowerAnswer.includes(project.name.toLowerCase())) {
        project.lastMentioned = Date.now();
        if (!project.discussed) {
          project.discussed = true;
          project.depth = 1; // Mentioned
        }
        project.questionCount++;
        
        // If detailed answer, increase depth
        if (this.isDetailed(answer)) {
          project.depth = Math.min(project.depth + 1, 2); // Max depth = 2
        }
      }
    }
    
    // Check skills
    for (const skill of this.topics.skills) {
      if (lowerAnswer.includes(skill.name.toLowerCase())) {
        skill.lastMentioned = Date.now();
        skill.discussed = true;
        skill.questionCount++;
      }
    }
    
    // Check experience
    for (const exp of this.topics.experience) {
      const positionMatch = exp.position && lowerAnswer.includes(exp.position.toLowerCase());
      const companyMatch = exp.company && lowerAnswer.includes(exp.company.toLowerCase());
      
      if (positionMatch || companyMatch) {
        exp.lastMentioned = Date.now();
        exp.discussed = true;
        exp.questionCount++;
      }
    }
    
    // Check education
    for (const edu of this.topics.education) {
      const degreeMatch = edu.degree && lowerAnswer.includes(edu.degree.toLowerCase());
      const institutionMatch = edu.institution && lowerAnswer.includes(edu.institution.toLowerCase());
      
      if (degreeMatch || institutionMatch) {
        edu.lastMentioned = Date.now();
        edu.discussed = true;
        edu.questionCount++;
      }
    }
  }
  
  /**
   * Check if answer is vague (needs more follow-ups)
   * @param {string} answer - Candidate's answer
   * @returns {boolean}
   */
  isVague(answer) {
    // Too short
    if (answer.length < 80) return true;
    
    // No numbers/metrics
    if (!/\d/.test(answer)) return true;
    
    // Contains vague phrases
    const vaguePatterns = [
      /don't know/i,
      /not sure/i,
      /maybe/i,
      /i think/i,
      /kind of/i,
      /sort of/i,
      /improved/i, // Without metrics
      /better/i,   // Without metrics
      /optimized/i // Without metrics
    ];
    
    const hasVaguePhrase = vaguePatterns.some(pattern => pattern.test(answer));
    const hasMetrics = /\d+%|\d+x|\d+ (ms|seconds|minutes|users|requests)/i.test(answer);
    
    return hasVaguePhrase && !hasMetrics;
  }
  
  /**
   * Check if answer is detailed (can move on sooner)
   * @param {string} answer - Candidate's answer
   * @returns {boolean}
   */
  isDetailed(answer) {
    // Long enough
    if (answer.length < 250) return false;
    
    // Has metrics
    const hasMetrics = /\d+%|\d+x|\d+ (ms|seconds|minutes|users|requests|MB|GB)/i.test(answer);
    
    // Has action verbs
    const actionVerbs = [
      'implemented', 'built', 'designed', 'developed', 'created',
      'reduced', 'increased', 'improved', 'optimized', 'architected',
      'deployed', 'integrated', 'migrated', 'refactored', 'scaled'
    ];
    
    const actionVerbCount = actionVerbs.filter(verb => 
      new RegExp(`\\b${verb}\\b`, 'i').test(answer)
    ).length;
    
    // Has technical terms
    const hasTechnicalTerms = this.calculateTechnicalDepth(answer) >= 2;
    
    return hasMetrics && actionVerbCount >= 2 && hasTechnicalTerms;
  }
  
  /**
   * Calculate technical depth of answer
   * @param {string} answer - Candidate's answer
   * @returns {number} Technical depth score (0-5)
   */
  calculateTechnicalDepth(answer) {
    const technicalKeywords = [
      'algorithm', 'architecture', 'API', 'database', 'cache', 'Redis',
      'microservices', 'pipeline', 'deployment', 'scaling', 'Docker',
      'Kubernetes', 'AWS', 'Azure', 'GCP', 'React', 'Node.js', 'Python',
      'SQL', 'NoSQL', 'MongoDB', 'PostgreSQL', 'GraphQL', 'REST',
      'authentication', 'authorization', 'JWT', 'OAuth', 'CI/CD',
      'testing', 'TDD', 'integration', 'performance', 'optimization',
      'latency', 'throughput', 'load balancer', 'CDN', 'webpack'
    ];
    
    const lowerAnswer = answer.toLowerCase();
    const mentionedKeywords = technicalKeywords.filter(keyword =>
      lowerAnswer.includes(keyword.toLowerCase())
    );
    
    return Math.min(mentionedKeywords.length, 5);
  }
  
  /**
   * Decide if should move to new topic
   * @param {string} lastAnswer - Last answer from candidate
   * @returns {boolean}
   */
  shouldMoveToNewTopic(lastAnswer) {
    // No current topic? Don't move
    if (!this.currentTopic) return false;
    
    // Vague answer? Need more follow-ups (4 questions)
    if (this.isVague(lastAnswer)) {
      return this.currentTopicQuestionCount >= 4;
    }
    
    // Detailed answer? Can move on sooner (2 questions)
    if (this.isDetailed(lastAnswer)) {
      return this.currentTopicQuestionCount >= 2;
    }
    
    // Default: 3 questions per topic
    return this.currentTopicQuestionCount >= 3;
  }
  
  /**
   * Get next unexplored topic
   * @returns {Object|null} Next topic to explore
   */
  getNextTopic() {
    // Priority 1: Undiscussed projects
    const undiscussedProject = this.topics.projects.find(p => !p.discussed);
    if (undiscussedProject) {
      return {
        type: 'project',
        name: undiscussedProject.name,
        data: undiscussedProject
      };
    }
    
    // Priority 2: Shallow projects (mentioned but not explored)
    const shallowProject = this.topics.projects.find(p => p.depth === 1);
    if (shallowProject) {
      return {
        type: 'project',
        name: shallowProject.name,
        data: shallowProject
      };
    }
    
    // Priority 3: Undiscussed skills
    const undiscussedSkill = this.topics.skills.find(s => !s.discussed);
    if (undiscussedSkill) {
      return {
        type: 'skill',
        name: undiscussedSkill.name,
        data: undiscussedSkill
      };
    }
    
    // Priority 4: Undiscussed experience
    const undiscussedExp = this.topics.experience.find(e => !e.discussed);
    if (undiscussedExp) {
      return {
        type: 'experience',
        name: `${undiscussedExp.position} at ${undiscussedExp.company}`,
        data: undiscussedExp
      };
    }
    
    // Priority 5: Undiscussed education
    const undiscussedEdu = this.topics.education.find(e => !e.discussed);
    if (undiscussedEdu) {
      return {
        type: 'education',
        name: `${undiscussedEdu.degree} from ${undiscussedEdu.institution}`,
        data: undiscussedEdu
      };
    }
    
    return null; // All topics covered
  }
  
  /**
   * Set current topic being discussed
   * @param {Object} topic - Topic object
   */
  setCurrentTopic(topic) {
    this.currentTopic = topic;
    this.currentTopicQuestionCount = 0;
  }
  
  /**
   * Get coverage statistics
   * @returns {Object} Coverage stats
   */
  getCoverageStats() {
    const projectsCovered = this.topics.projects.filter(p => p.discussed).length;
    const skillsCovered = this.topics.skills.filter(s => s.discussed).length;
    const experienceCovered = this.topics.experience.filter(e => e.discussed).length;
    const educationCovered = this.topics.education.filter(e => e.discussed).length;
    
    const totalTopics = 
      this.topics.projects.length +
      this.topics.skills.length +
      this.topics.experience.length +
      this.topics.education.length;
    
    const coveredTopics = 
      projectsCovered +
      skillsCovered +
      experienceCovered +
      educationCovered;
    
    return {
      projects: {
        total: this.topics.projects.length,
        covered: projectsCovered,
        percentage: Math.round((projectsCovered / this.topics.projects.length) * 100) || 0
      },
      skills: {
        total: this.topics.skills.length,
        covered: skillsCovered,
        percentage: Math.round((skillsCovered / this.topics.skills.length) * 100) || 0
      },
      experience: {
        total: this.topics.experience.length,
        covered: experienceCovered,
        percentage: Math.round((experienceCovered / this.topics.experience.length) * 100) || 0
      },
      education: {
        total: this.topics.education.length,
        covered: educationCovered,
        percentage: Math.round((educationCovered / this.topics.education.length) * 100) || 0
      },
      overall: {
        total: totalTopics,
        covered: coveredTopics,
        percentage: Math.round((coveredTopics / totalTopics) * 100) || 0
      }
    };
  }
  
  /**
   * Get quality metrics
   * @returns {Object} Quality metrics
   */
  getQualityMetrics() {
    return {
      totalQuestions: this.metrics.totalQuestions,
      avgAnswerLength: this.metrics.avgAnswerLength,
      vagueAnswerRate: Math.round((this.metrics.vagueAnswerCount / this.metrics.totalQuestions) * 100) || 0,
      detailedAnswerRate: Math.round((this.metrics.detailedAnswerCount / this.metrics.totalQuestions) * 100) || 0,
      avgTechnicalDepth: this.metrics.totalQuestions > 0 
        ? (this.metrics.technicalDepth / this.metrics.totalQuestions).toFixed(1)
        : 0
    };
  }
  
  /**
   * Get state for context
   * @returns {Object} Current state
   */
  getState() {
    return {
      currentTopic: this.currentTopic,
      currentTopicQuestionCount: this.currentTopicQuestionCount,
      coverage: this.getCoverageStats(),
      metrics: this.getQualityMetrics(),
      questionHistory: this.questionHistory.slice(-3) // Last 3 Q&A
    };
  }
}

module.exports = { TopicTracker };
