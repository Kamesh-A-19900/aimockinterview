/**
 * PDF Question Bank Service
 * 
 * Processes PDF interview documents and creates a persistent vector database
 * for intelligent question generation based on real interview scenarios.
 * 
 * Features:
 * - One-time PDF processing and embedding
 * - Persistent vector storage (no retraining)
 * - Context-aware question selection
 * - Scenario-based interview flow
 */

const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');
const { chromaService } = require('./chromaService');

class PDFQuestionBankService {
  constructor() {
    this.collectionName = 'interview_question_bank';
    this.isInitialized = false;
    this.questionScenarios = [];
    this.embeddingsPath = path.join(__dirname, '../data/question_embeddings.json');
    this.processedDataPath = path.join(__dirname, '../data/processed_questions.json');
    
    // Ensure data directory exists
    this.ensureDataDirectory();
  }
  
  /**
   * Ensure data directory exists for persistent storage
   */
  ensureDataDirectory() {
    const dataDir = path.join(__dirname, '../data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
      console.log('📁 Created data directory for persistent storage');
    }
  }
  
  /**
   * Initialize the question bank (one-time setup)
   * @param {string} pdfPath - Path to the PDF file
   * @returns {Promise<boolean>} Success status
   */
  async initialize(pdfPath) {
    try {
      console.log('🚀 Initializing PDF Question Bank Service...');
      
      // Check if already processed
      if (await this.isAlreadyProcessed()) {
        console.log('✅ Question bank already exists - loading from storage');
        await this.loadExistingQuestionBank();
        return true;
      }
      
      console.log('📄 Processing PDF for the first time...');
      
      // Process PDF
      const pdfContent = await this.extractPDFContent(pdfPath);
      
      // Parse interview scenarios
      const scenarios = await this.parseInterviewScenarios(pdfContent);
      
      // Create embeddings and store in ChromaDB
      await this.createAndStoreEmbeddings(scenarios);
      
      // Save processed data for future use
      await this.saveProcessedData(scenarios);
      
      this.questionScenarios = scenarios;
      this.isInitialized = true;
      
      console.log(`✅ Question bank initialized with ${scenarios.length} scenarios`);
      
      // Delete PDF file as requested
      if (fs.existsSync(pdfPath)) {
        fs.unlinkSync(pdfPath);
        console.log('🗑️  PDF file deleted as requested');
      }
      
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize question bank:', error);
      return false;
    }
  }
  
  /**
   * Check if question bank is already processed
   * @returns {Promise<boolean>} True if already processed
   */
  async isAlreadyProcessed() {
    try {
      // Check if processed data exists
      if (!fs.existsSync(this.processedDataPath)) {
        return false;
      }
      
      // Check if ChromaDB collection exists
      const collections = await chromaService.client.listCollections();
      const exists = collections.some(col => col.name === this.collectionName);
      
      return exists;
    } catch (error) {
      console.error('❌ Error checking processed status:', error);
      return false;
    }
  }
  
  /**
   * Load existing question bank from storage
   */
  async loadExistingQuestionBank() {
    try {
      if (fs.existsSync(this.processedDataPath)) {
        const data = JSON.parse(fs.readFileSync(this.processedDataPath, 'utf8'));
        this.questionScenarios = data.scenarios || [];
        this.isInitialized = true;
        console.log(`📚 Loaded ${this.questionScenarios.length} scenarios from storage`);
      }
    } catch (error) {
      console.error('❌ Error loading existing question bank:', error);
    }
  }
  
  /**
   * Extract content from PDF
   * @param {string} pdfPath - Path to PDF file
   * @returns {Promise<string>} Extracted text content
   */
  async extractPDFContent(pdfPath) {
    try {
      console.log('📖 Extracting content from PDF...');
      
      const pdfBuffer = fs.readFileSync(pdfPath);
      const pdfData = await pdfParse(pdfBuffer);
      
      console.log(`📄 Extracted ${pdfData.text.length} characters from PDF`);
      return pdfData.text;
    } catch (error) {
      console.error('❌ Error extracting PDF content:', error);
      throw error;
    }
  }
  
  /**
   * Parse interview scenarios from PDF content
   * @param {string} content - PDF text content
   * @returns {Promise<Array>} Array of interview scenarios
   */
  async parseInterviewScenarios(content) {
    try {
      console.log('🔍 Parsing interview scenarios...');
      
      const scenarios = [];
      
      // Split content into sections (assuming scenarios are separated by clear markers)
      const sections = this.splitIntoScenarios(content);
      
      for (let i = 0; i < sections.length; i++) {
        const section = sections[i];
        
        if (section.trim().length < 100) continue; // Skip very short sections
        
        // Extract questions and answers from each scenario
        const qaPairs = this.extractQAPairs(section);
        
        if (qaPairs.length > 0) {
          const scenario = {
            id: `scenario_${i + 1}`,
            title: this.extractScenarioTitle(section),
            content: section.trim(),
            qaPairs: qaPairs,
            topics: this.extractTopics(section),
            difficulty: this.assessDifficulty(section),
            type: this.determineScenarioType(section)
          };
          
          scenarios.push(scenario);
        }
      }
      
      console.log(`📋 Parsed ${scenarios.length} interview scenarios`);
      return scenarios;
    } catch (error) {
      console.error('❌ Error parsing scenarios:', error);
      throw error;
    }
  }
  
  /**
   * Split content into individual scenarios
   * @param {string} content - Full PDF content
   * @returns {Array<string>} Array of scenario sections
   */
  splitIntoScenarios(content) {
    // Common patterns that indicate new scenarios
    const scenarioMarkers = [
      /Interview\s+\d+/gi,
      /Scenario\s+\d+/gi,
      /Question\s+Set\s+\d+/gi,
      /Candidate\s+\d+/gi,
      /Session\s+\d+/gi,
      /\n\s*\d+\.\s+/g, // Numbered sections
      /\n\s*[A-Z][a-z]+\s*:/g // Name: patterns
    ];
    
    let sections = [content];
    
    // Split by each marker pattern
    for (const marker of scenarioMarkers) {
      const newSections = [];
      for (const section of sections) {
        const parts = section.split(marker);
        newSections.push(...parts);
      }
      sections = newSections;
    }
    
    // Filter out empty sections and merge very short ones
    const filteredSections = [];
    let currentSection = '';
    
    for (const section of sections) {
      const trimmed = section.trim();
      if (trimmed.length < 200) {
        currentSection += ' ' + trimmed;
      } else {
        if (currentSection.trim()) {
          filteredSections.push(currentSection.trim());
        }
        currentSection = trimmed;
      }
    }
    
    if (currentSection.trim()) {
      filteredSections.push(currentSection.trim());
    }
    
    return filteredSections;
  }
  
  /**
   * Extract Q&A pairs from a scenario
   * @param {string} scenario - Scenario text
   * @returns {Array} Array of Q&A pairs
   */
  extractQAPairs(scenario) {
    const qaPairs = [];
    
    // Common Q&A patterns
    const patterns = [
      /Q\s*\d*\s*[:.]?\s*([^A\n]+)\s*A\s*\d*\s*[:.]?\s*([^Q\n]+)/gi,
      /Question\s*\d*\s*[:.]?\s*([^A\n]+)\s*Answer\s*\d*\s*[:.]?\s*([^Q\n]+)/gi,
      /Interviewer\s*[:.]?\s*([^C\n]+)\s*Candidate\s*[:.]?\s*([^I\n]+)/gi,
      /\?\s*\n\s*([^?\n]+)/g // Questions followed by answers
    ];
    
    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(scenario)) !== null) {
        const question = match[1]?.trim();
        const answer = match[2]?.trim();
        
        if (question && answer && question.length > 10 && answer.length > 10) {
          qaPairs.push({
            question: this.cleanText(question),
            answer: this.cleanText(answer),
            context: this.extractContext(scenario, match.index)
          });
        }
      }
    }
    
    return qaPairs;
  }
  
  /**
   * Extract scenario title
   * @param {string} scenario - Scenario text
   * @returns {string} Scenario title
   */
  extractScenarioTitle(scenario) {
    const lines = scenario.split('\n');
    
    // Look for title patterns
    for (const line of lines.slice(0, 5)) {
      const trimmed = line.trim();
      if (trimmed.length > 5 && trimmed.length < 100) {
        // Check if it looks like a title
        if (/^[A-Z]/.test(trimmed) && !trimmed.includes('?')) {
          return trimmed;
        }
      }
    }
    
    // Fallback: use first meaningful line
    return lines[0]?.trim().substring(0, 50) + '...' || 'Interview Scenario';
  }
  
  /**
   * Extract topics from scenario
   * @param {string} scenario - Scenario text
   * @returns {Array<string>} Array of topics
   */
  extractTopics(scenario) {
    const topics = new Set();
    
    // Technical keywords
    const techKeywords = [
      'javascript', 'react', 'node', 'python', 'java', 'sql', 'database',
      'api', 'rest', 'graphql', 'microservices', 'docker', 'kubernetes',
      'aws', 'cloud', 'frontend', 'backend', 'fullstack', 'devops',
      'testing', 'ci/cd', 'git', 'agile', 'scrum'
    ];
    
    // Behavioral keywords
    const behavioralKeywords = [
      'leadership', 'teamwork', 'communication', 'problem-solving',
      'conflict', 'deadline', 'pressure', 'challenge', 'failure',
      'success', 'motivation', 'goals'
    ];
    
    const lowerScenario = scenario.toLowerCase();
    
    [...techKeywords, ...behavioralKeywords].forEach(keyword => {
      if (lowerScenario.includes(keyword)) {
        topics.add(keyword);
      }
    });
    
    return Array.from(topics);
  }
  
  /**
   * Assess scenario difficulty
   * @param {string} scenario - Scenario text
   * @returns {string} Difficulty level
   */
  assessDifficulty(scenario) {
    const lowerScenario = scenario.toLowerCase();
    
    // Advanced indicators
    const advancedIndicators = [
      'architecture', 'design patterns', 'scalability', 'performance',
      'optimization', 'distributed systems', 'microservices',
      'senior', 'lead', 'principal', 'architect'
    ];
    
    // Beginner indicators
    const beginnerIndicators = [
      'basic', 'introduction', 'beginner', 'junior', 'entry-level',
      'simple', 'fundamental'
    ];
    
    const advancedCount = advancedIndicators.filter(indicator => 
      lowerScenario.includes(indicator)
    ).length;
    
    const beginnerCount = beginnerIndicators.filter(indicator => 
      lowerScenario.includes(indicator)
    ).length;
    
    if (advancedCount > beginnerCount && advancedCount > 0) {
      return 'advanced';
    } else if (beginnerCount > 0) {
      return 'beginner';
    } else {
      return 'intermediate';
    }
  }
  
  /**
   * Determine scenario type
   * @param {string} scenario - Scenario text
   * @returns {string} Scenario type
   */
  determineScenarioType(scenario) {
    const lowerScenario = scenario.toLowerCase();
    
    if (lowerScenario.includes('technical') || lowerScenario.includes('coding') || 
        lowerScenario.includes('algorithm') || lowerScenario.includes('system design')) {
      return 'technical';
    } else if (lowerScenario.includes('behavioral') || lowerScenario.includes('situation') ||
               lowerScenario.includes('experience') || lowerScenario.includes('team')) {
      return 'behavioral';
    } else {
      return 'general';
    }
  }
  
  /**
   * Clean and normalize text
   * @param {string} text - Raw text
   * @returns {string} Cleaned text
   */
  cleanText(text) {
    return text
      .replace(/\s+/g, ' ')
      .replace(/[^\w\s.,!?-]/g, '')
      .trim();
  }
  
  /**
   * Extract context around a match
   * @param {string} text - Full text
   * @param {number} index - Match index
   * @returns {string} Context
   */
  extractContext(text, index) {
    const start = Math.max(0, index - 100);
    const end = Math.min(text.length, index + 100);
    return text.substring(start, end).trim();
  }
  
  /**
   * Create embeddings and store in ChromaDB
   * @param {Array} scenarios - Parsed scenarios
   */
  async createAndStoreEmbeddings(scenarios) {
    try {
      console.log('🔮 Creating embeddings and storing in ChromaDB...');
      
      // Create or get collection
      await chromaService.createCollection(this.collectionName);
      
      // Prepare documents for embedding
      const documents = [];
      const metadatas = [];
      const ids = [];
      
      scenarios.forEach((scenario, scenarioIndex) => {
        // Add scenario overview
        documents.push(`${scenario.title}\n\n${scenario.content}`);
        metadatas.push({
          type: 'scenario',
          scenarioId: scenario.id,
          title: scenario.title,
          topics: JSON.stringify(scenario.topics),
          difficulty: scenario.difficulty,
          scenarioType: scenario.type
        });
        ids.push(`scenario_${scenarioIndex}`);
        
        // Add individual Q&A pairs
        scenario.qaPairs.forEach((qa, qaIndex) => {
          documents.push(`Question: ${qa.question}\nAnswer: ${qa.answer}\nContext: ${qa.context}`);
          metadatas.push({
            type: 'qa_pair',
            scenarioId: scenario.id,
            question: qa.question,
            answer: qa.answer,
            topics: JSON.stringify(scenario.topics),
            difficulty: scenario.difficulty,
            scenarioType: scenario.type
          });
          ids.push(`qa_${scenarioIndex}_${qaIndex}`);
        });
      });
      
      // Store in ChromaDB in batches
      const batchSize = 50;
      for (let i = 0; i < documents.length; i += batchSize) {
        const batch = {
          documents: documents.slice(i, i + batchSize),
          metadatas: metadatas.slice(i, i + batchSize),
          ids: ids.slice(i, i + batchSize)
        };
        
        await chromaService.addDocuments(this.collectionName, batch);
        console.log(`📦 Stored batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(documents.length / batchSize)}`);
      }
      
      console.log(`✅ Successfully stored ${documents.length} documents in ChromaDB`);
    } catch (error) {
      console.error('❌ Error creating embeddings:', error);
      throw error;
    }
  }
  
  /**
   * Save processed data for future use
   * @param {Array} scenarios - Processed scenarios
   */
  async saveProcessedData(scenarios) {
    try {
      const data = {
        processedAt: new Date().toISOString(),
        scenarioCount: scenarios.length,
        scenarios: scenarios
      };
      
      fs.writeFileSync(this.processedDataPath, JSON.stringify(data, null, 2));
      console.log('💾 Saved processed data for future use');
    } catch (error) {
      console.error('❌ Error saving processed data:', error);
    }
  }
  
  /**
   * Get relevant questions based on candidate's answer and context
   * @param {string} candidateAnswer - Candidate's last answer
   * @param {string} resumeContext - Resume context
   * @param {Array} previousTopics - Previously covered topics
   * @returns {Promise<Array>} Relevant questions
   */
  async getRelevantQuestions(candidateAnswer, resumeContext = '', previousTopics = []) {
    try {
      if (!this.isInitialized) {
        console.log('⚠️  Question bank not initialized');
        return [];
      }
      
      // Create search query combining candidate answer and context
      const searchQuery = `${candidateAnswer} ${resumeContext}`.trim();
      
      // Query ChromaDB for relevant scenarios
      const results = await chromaService.queryDocuments(
        this.collectionName,
        searchQuery,
        5 // Get top 5 relevant scenarios
      );
      
      if (!results || !results.documents || results.documents.length === 0) {
        console.log('⚠️  No relevant scenarios found');
        return [];
      }
      
      // Process results and extract questions
      const relevantQuestions = [];
      
      for (let i = 0; i < results.documents.length; i++) {
        const document = results.documents[i];
        const metadata = results.metadatas[i];
        const distance = results.distances[i];
        
        // Only use highly relevant results (distance < 0.7)
        if (distance < 0.7) {
          if (metadata.type === 'qa_pair') {
            // Extract question from Q&A pair
            const question = metadata.question;
            if (question && !this.isTopicAlreadyCovered(metadata.topics, previousTopics)) {
              relevantQuestions.push({
                question: question,
                context: document,
                scenarioId: metadata.scenarioId,
                topics: JSON.parse(metadata.topics || '[]'),
                difficulty: metadata.difficulty,
                type: metadata.scenarioType,
                relevanceScore: 1 - distance
              });
            }
          }
        }
      }
      
      // Sort by relevance score and return top questions
      return relevantQuestions
        .sort((a, b) => b.relevanceScore - a.relevanceScore)
        .slice(0, 3);
        
    } catch (error) {
      console.error('❌ Error getting relevant questions:', error);
      return [];
    }
  }
  
  /**
   * Check if topic is already covered
   * @param {string} topicsJson - JSON string of topics
   * @param {Array} previousTopics - Previously covered topics
   * @returns {boolean} True if already covered
   */
  isTopicAlreadyCovered(topicsJson, previousTopics) {
    try {
      const topics = JSON.parse(topicsJson || '[]');
      return topics.some(topic => previousTopics.includes(topic));
    } catch {
      return false;
    }
  }
  
  /**
   * Get question bank statistics
   * @returns {Object} Statistics
   */
  getStatistics() {
    if (!this.isInitialized) {
      return { initialized: false };
    }
    
    const totalQAPairs = this.questionScenarios.reduce(
      (sum, scenario) => sum + scenario.qaPairs.length, 0
    );
    
    const topicCounts = {};
    this.questionScenarios.forEach(scenario => {
      scenario.topics.forEach(topic => {
        topicCounts[topic] = (topicCounts[topic] || 0) + 1;
      });
    });
    
    return {
      initialized: true,
      totalScenarios: this.questionScenarios.length,
      totalQAPairs: totalQAPairs,
      topicDistribution: topicCounts,
      difficultyLevels: {
        beginner: this.questionScenarios.filter(s => s.difficulty === 'beginner').length,
        intermediate: this.questionScenarios.filter(s => s.difficulty === 'intermediate').length,
        advanced: this.questionScenarios.filter(s => s.difficulty === 'advanced').length
      },
      scenarioTypes: {
        technical: this.questionScenarios.filter(s => s.type === 'technical').length,
        behavioral: this.questionScenarios.filter(s => s.type === 'behavioral').length,
        general: this.questionScenarios.filter(s => s.type === 'general').length
      }
    };
  }
}

// Singleton instance
let pdfQuestionBankService = null;

function getPDFQuestionBankService() {
  if (!pdfQuestionBankService) {
    pdfQuestionBankService = new PDFQuestionBankService();
  }
  return pdfQuestionBankService;
}

module.exports = { PDFQuestionBankService, getPDFQuestionBankService };