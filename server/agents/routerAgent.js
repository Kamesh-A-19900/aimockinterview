/**
 * Router Agent - Traffic Controller
 * 
 * Decides which agent to use based on task complexity:
 * - Simple conversation → Interviewer Agent (Groq 8B - cheap)
 * - Technical concepts → Researcher Agent (Groq 70B - smart)
 * - Evaluation time → Evaluator Agent (Groq 70B - accurate)
 * 
 * Cost Savings: 60-80% by routing to cheap model when possible
 */

class RouterAgent {
  constructor(interviewerAgent, researcherAgent, evaluatorAgent) {
    this.interviewer = interviewerAgent;
    this.researcher = researcherAgent;
    this.evaluator = evaluatorAgent;
    
    // Technical keywords that trigger Researcher Agent
    this.technicalKeywords = [
      // Programming & Development
      'algorithm', 'data structure', 'complexity', 'optimization',
      'API', 'REST', 'GraphQL', 'microservices', 'monolith',
      'database', 'SQL', 'NoSQL', 'MongoDB', 'PostgreSQL', 'Redis',
      'cache', 'caching', 'CDN', 'load balancer',
      
      // AI & ML
      'RAG', 'LLM', 'GPT', 'embedding', 'vector', 'semantic',
      'machine learning', 'neural network', 'model', 'training',
      'fine-tuning', 'prompt engineering',
      
      // Architecture & Design
      'architecture', 'design pattern', 'SOLID', 'DRY', 'KISS',
      'scalability', 'availability', 'reliability', 'fault tolerance',
      'distributed system', 'event-driven', 'message queue',
      
      // DevOps & Infrastructure
      'Docker', 'Kubernetes', 'CI/CD', 'pipeline', 'deployment',
      'AWS', 'Azure', 'GCP', 'cloud', 'serverless', 'lambda',
      'monitoring', 'logging', 'observability', 'metrics',
      
      // Frontend
      'React', 'Vue', 'Angular', 'component', 'state management',
      'Redux', 'hooks', 'virtual DOM', 'SSR', 'CSR',
      'performance', 'bundle', 'webpack', 'optimization',
      
      // Backend
      'Node.js', 'Express', 'FastAPI', 'Django', 'Spring',
      'authentication', 'authorization', 'JWT', 'OAuth',
      'security', 'encryption', 'hashing', 'CORS',
      
      // Testing
      'unit test', 'integration test', 'e2e', 'TDD', 'BDD',
      'Jest', 'Mocha', 'Cypress', 'Selenium'
    ];
  }
  
  /**
   * Route task to appropriate agent
   * @param {string} task - Task type: 'generate_question' or 'evaluate'
   * @param {Object} context - Interview context
   * @returns {Object} Selected agent
   */
  route(task, context) {
    // Evaluation time → Evaluator Agent
    if (task === 'evaluate') {
      console.log('🎯 Router: Routing to Evaluator Agent (scoring)');
      return this.evaluator;
    }
    
    // Check if last answer contains technical concepts
    if (context.lastAnswer && this.hasTechnicalConcept(context.lastAnswer)) {
      console.log('🔬 Router: Routing to Researcher Agent (technical deep-dive)');
      return this.researcher;
    }
    
    // Default: Simple conversation → Interviewer Agent
    console.log('💬 Router: Routing to Interviewer Agent (conversational)');
    return this.interviewer;
  }
  
  /**
   * Check if text contains technical concepts
   * @param {string} text - Text to analyze
   * @returns {boolean} True if technical concept found
   */
  hasTechnicalConcept(text) {
    if (!text) return false;
    
    const lowerText = text.toLowerCase();
    
    return this.technicalKeywords.some(keyword => 
      lowerText.includes(keyword.toLowerCase())
    );
  }
  
  /**
   * Get routing statistics
   * @param {Array} routingHistory - History of routing decisions
   * @returns {Object} Statistics
   */
  getStats(routingHistory) {
    const total = routingHistory.length;
    const interviewer = routingHistory.filter(r => r === 'interviewer').length;
    const researcher = routingHistory.filter(r => r === 'researcher').length;
    const evaluator = routingHistory.filter(r => r === 'evaluator').length;
    
    return {
      total,
      interviewer: {
        count: interviewer,
        percentage: Math.round((interviewer / total) * 100)
      },
      researcher: {
        count: researcher,
        percentage: Math.round((researcher / total) * 100)
      },
      evaluator: {
        count: evaluator,
        percentage: Math.round((evaluator / total) * 100)
      }
    };
  }
  
  /**
   * Estimate cost based on routing
   * @param {Array} routingHistory - History of routing decisions
   * @returns {Object} Cost estimate
   */
  estimateCost(routingHistory) {
    const costs = {
      interviewer: 0.0001, // Groq 8B
      researcher: 0.001,   // Groq 70B
      evaluator: 0.001     // Groq 70B
    };
    
    let totalCost = 0;
    routingHistory.forEach(agent => {
      totalCost += costs[agent] || 0;
    });
    
    return {
      totalCost: totalCost.toFixed(4),
      perQuestion: (totalCost / routingHistory.length).toFixed(4),
      breakdown: {
        interviewer: (routingHistory.filter(r => r === 'interviewer').length * costs.interviewer).toFixed(4),
        researcher: (routingHistory.filter(r => r === 'researcher').length * costs.researcher).toFixed(4),
        evaluator: (routingHistory.filter(r => r === 'evaluator').length * costs.evaluator).toFixed(4)
      }
    };
  }
}

module.exports = { RouterAgent };
