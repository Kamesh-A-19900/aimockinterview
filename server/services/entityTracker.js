/**
 * Entity Tracker
 * 
 * Extracts and tracks what candidates actually mention vs. what's assumed from resume
 * Provides confidence scoring and validation for extracted entities
 */

const { EntityType } = require('./conversationState');

/**
 * Extracted entity with metadata
 */
class ExtractedEntity {
  constructor(type, name, context, extractedFrom, confidence = 0.8) {
    this.type = type;
    this.name = name;
    this.context = context; // Surrounding text context
    this.extractedFrom = extractedFrom; // Original answer text
    this.confidence = confidence; // 0.0 to 1.0
    this.timestamp = new Date();
    this.verified = false; // Whether entity was confirmed by follow-up
  }
}

/**
 * Entity extraction result
 */
class ExtractionResult {
  constructor(entities = [], confidence = 0.0) {
    this.entities = entities;
    this.overallConfidence = confidence;
    this.extractionTime = new Date();
  }
}

/**
 * Entity Tracker class
 */
class EntityTracker {
  constructor() {
    // Extraction patterns for different entity types
    this.patterns = {
      
      projects: [
        // Comma-separated project lists (CRITICAL FIX)
        /(?:projects?|apps?|applications?).*?(?:are|include|includes|like|such as|:)\s*([A-Za-z][A-Za-z0-9\s,.-]{5,100})/gi,
        
        // Direct project mentions with compound names
        /(?:working on|built|created|developed|designed|building|creating|developing)\s+(?:a\s+)?([A-Za-z][A-Za-z0-9\s]{2,30})\s+(?:project|app|application|system|platform|agent|AI|tool)/gi,
        
        // Specific project name patterns (StudySpark, NetWise, etc.)
        /\b(StudySpark|NetWise|MockInterview\s*AI|Mock\s*Interview\s*AI|ChatBridge)\b/gi,
        
        // Original patterns (kept for compatibility)
        /(?:project|app|application|system|platform|tool|website|service)\s+(?:called|named)\s+([A-Za-z][A-Za-z0-9_-]{1,19})/gi,
        /([A-Za-z][A-Za-z0-9_-]{1,19})\s+(?:project|app|application|system|platform)/gi,
        /(?:built|created|developed|designed|worked on|building|creating|developing)\s+(?:a\s+)?([A-Za-z][A-Za-z0-9_-]{1,19})/gi,
        /(?:my|our|the)\s+([A-Za-z][A-Za-z0-9_-]{1,19})\s+(?:project|app|system)/gi
      ],
      
      skills: [
        // Direct skill mentions
        /(?:using|used|with|in|know|learned|experienced with|familiar with|skilled in|proficient in)\s+([A-Za-z][A-Za-z0-9+#.-]{1,19})/gi,
        /(?:I|we)\s+(?:use|used|work with|worked with)\s+([A-Za-z][A-Za-z0-9+#.-]{1,19})/gi,
        
        // Technology stack mentions
        /(?:stack|technologies|tools|languages|frameworks).*?(?:include|includes|are|were|like)\s+([A-Za-z][A-Za-z0-9+#.-]{1,19})/gi,
        /(?:written|coded|programmed|implemented)\s+(?:in|using|with)\s+([A-Za-z][A-Za-z0-9+#.-]{1,19})/gi
      ],
      
      technologies: [
        // Specific technology mentions
        /(?:deployed|hosting|hosted|running)\s+(?:on|in|with)\s+([A-Za-z][A-Za-z0-9.-]{1,19})/gi,
        /(?:database|DB|storage)\s+(?:is|was|using|with)\s+([A-Za-z][A-Za-z0-9.-]{1,19})/gi,
        /(?:frontend|backend|server|client)\s+(?:is|was|using|with)\s+([A-Za-z][A-Za-z0-9.-]{1,19})/gi
      ],
      
      experience: [
        // Company/role mentions
        /(?:worked|working|employed|interned|intern)\s+(?:at|for|with)\s+([A-Za-z][A-Za-z0-9\s&.-]{1,29})/gi,
        /(?:my|previous|current|former)\s+(?:job|role|position|work)\s+(?:at|with)\s+([A-Za-z][A-Za-z0-9\s&.-]{1,29})/gi,
        /(?:company|organization|startup|firm)\s+(?:called|named)\s+([A-Za-z][A-Za-z0-9\s&.-]{1,29})/gi
      ]
    };
    
    // Known technology keywords for validation
    this.knownTechnologies = new Set([
      // Programming Languages
      'javascript', 'python', 'java', 'typescript', 'c++', 'c#', 'go', 'rust', 'php', 'ruby', 'swift', 'kotlin',
      
      // Frontend Frameworks/Libraries
      'react', 'vue', 'angular', 'svelte', 'jquery', 'bootstrap', 'tailwind', 'sass', 'less',
      
      // Backend Frameworks
      'node.js', 'express', 'django', 'flask', 'spring', 'laravel', 'rails', 'fastapi', 'nest.js',
      
      // Databases
      'mysql', 'postgresql', 'mongodb', 'redis', 'sqlite', 'oracle', 'cassandra', 'dynamodb', 'elasticsearch',
      
      // Cloud & DevOps
      'aws', 'azure', 'gcp', 'docker', 'kubernetes', 'jenkins', 'gitlab', 'github', 'terraform', 'ansible',
      
      
      // AI/ML (CRITICAL FIX - add common abbreviations)
      'ai', 'ml', 'artificial intelligence', 'machine learning', 'deep learning',
      'tensorflow', 'pytorch', 'scikit-learn', 'pandas', 'numpy', 'opencv', 'huggingface', 'llm', 'genai',
      'rag', 'retrieval augmented generation', 'gpt', 'bert', 'transformer', 'neural network',
      
      // Other Tools
      'git', 'webpack', 'vite', 'babel', 'eslint', 'jest', 'cypress', 'postman', 'figma', 'jira'
    ]);
    
    console.log('✅ Entity Tracker initialized with extraction patterns');
  }
  
  /**
   * Extract entities from candidate's answer
   */
  extractEntities(answer, conversationState) {
    if (!answer || answer.trim().length === 0) {
      return new ExtractionResult();
    }
    
    console.log(`🔍 Extracting entities from answer: "${answer.substring(0, 100)}..."`);
    
    const extractedEntities = [];
    
    // Extract different entity types
    extractedEntities.push(...this.extractProjects(answer));
    extractedEntities.push(...this.extractSkills(answer));
    extractedEntities.push(...this.extractTechnologies(answer));
    extractedEntities.push(...this.extractExperience(answer));
    
    // Filter out duplicates and low-confidence entities
    const filteredEntities = this.filterAndDeduplicateEntities(extractedEntities);
    
    // Calculate overall confidence
    const overallConfidence = filteredEntities.length > 0 
      ? filteredEntities.reduce((sum, e) => sum + e.confidence, 0) / filteredEntities.length
      : 0;
    
    console.log(`✅ Extracted ${filteredEntities.length} entities with confidence ${overallConfidence.toFixed(2)}`);
    
    return new ExtractionResult(filteredEntities, overallConfidence);
  }
  
  
  /**
   * Extract project entities (IMPROVED VERSION)
   */
  extractProjects(answer) {
    const projects = [];
    
    // First, try to extract comma-separated project lists
    const commaSeparatedMatch = answer.match(/(?:projects?|apps?|applications?).*?(?:are|include|includes|like|such as|:)\s*([A-Za-z][A-Za-z0-9\s,.-]{5,100})/gi);
    if (commaSeparatedMatch) {
      commaSeparatedMatch.forEach(match => {
        // Extract the project list part
        const listPart = match.replace(/.*?(?:are|include|includes|like|such as|:)\s*/i, '');
        
        // Split by commas and clean up
        const projectNames = listPart.split(/[,&]/)
          .map(name => name.trim())
          .filter(name => name.length > 2 && name.length < 30)
          .filter(name => !this.isGenericWord(name));
        
        projectNames.forEach(projectName => {
          if (this.isValidProjectName(projectName)) {
            const confidence = this.calculateProjectConfidence(projectName, match, answer);
            projects.push(new ExtractedEntity(
              EntityType.PROJECT,
              projectName,
              match,
              answer,
              confidence
            ));
          }
        });
      });
    }
    
    // Then use original patterns for other cases
    for (const pattern of this.patterns.projects) {
      let match;
      while ((match = pattern.exec(answer)) !== null) {
        const projectName = match[1];
        
        if (this.isValidProjectName(projectName) && !this.isGenericWord(projectName)) {
          const context = this.extractContext(answer, match.index, 50);
          const confidence = this.calculateProjectConfidence(projectName, context, answer);
          
          projects.push(new ExtractedEntity(
            EntityType.PROJECT,
            projectName,
            context,
            answer,
            confidence
          ));
        }
      }
    }
    
    return projects;
  }
  
  /**
   * Check if word is too generic to be a project name
   */
  isGenericWord(word) {
    const genericWords = new Set([
      'various', 'different', 'multiple', 'several', 'many', 'some', 'all',
      'because', 'however', 'therefore', 'although', 'moreover', 'furthermore',
      'randomly', 'basically', 'actually', 'really', 'very', 'quite',
      'him', 'his', 'her', 'their', 'our', 'my', 'your',
      'mind', 'time', 'way', 'thing', 'things', 'stuff', 'work',
      'agentic', 'platform', 'system', 'application', 'project', 'tool'
    ]);
    
    return genericWords.has(word.toLowerCase());
  }
  
  /**
   * Extract skill entities
   */
  extractSkills(answer) {
    const skills = [];
    
    for (const pattern of this.patterns.skills) {
      let match;
      while ((match = pattern.exec(answer)) !== null) {
        const skillName = match[1].toLowerCase();
        
        if (this.isValidSkillName(skillName)) {
          const context = this.extractContext(answer, match.index, 50);
          const confidence = this.calculateSkillConfidence(skillName, context, answer);
          
          skills.push(new ExtractedEntity(
            EntityType.SKILL,
            skillName,
            context,
            answer,
            confidence
          ));
        }
      }
    }
    
    // Also extract known technologies mentioned directly
    const lowerAnswer = answer.toLowerCase();
    for (const tech of this.knownTechnologies) {
      if (lowerAnswer.includes(tech)) {
        const index = lowerAnswer.indexOf(tech);
        const context = this.extractContext(answer, index, 50);
        const confidence = this.calculateSkillConfidence(tech, context, answer);
        
        if (confidence > 0.6) {
          skills.push(new ExtractedEntity(
            EntityType.SKILL,
            tech,
            context,
            answer,
            confidence
          ));
        }
      }
    }
    
    return skills;
  }
  
  /**
   * Extract technology entities
   */
  extractTechnologies(answer) {
    const technologies = [];
    
    for (const pattern of this.patterns.technologies) {
      let match;
      while ((match = pattern.exec(answer)) !== null) {
        const techName = match[1].toLowerCase();
        
        if (this.isValidTechnologyName(techName)) {
          const context = this.extractContext(answer, match.index, 50);
          const confidence = this.calculateTechnologyConfidence(techName, context, answer);
          
          technologies.push(new ExtractedEntity(
            EntityType.TECHNOLOGY,
            techName,
            context,
            answer,
            confidence
          ));
        }
      }
    }
    
    return technologies;
  }
  
  /**
   * Extract experience entities
   */
  extractExperience(answer) {
    const experiences = [];
    
    for (const pattern of this.patterns.experience) {
      let match;
      while ((match = pattern.exec(answer)) !== null) {
        const experienceName = match[1];
        
        if (this.isValidExperienceName(experienceName)) {
          const context = this.extractContext(answer, match.index, 50);
          const confidence = this.calculateExperienceConfidence(experienceName, context, answer);
          
          experiences.push(new ExtractedEntity(
            EntityType.EXPERIENCE,
            experienceName,
            context,
            answer,
            confidence
          ));
        }
      }
    }
    
    return experiences;
  }
  
  /**
   * Validate project name
   */
  isValidProjectName(name) {
    if (!name || name.length < 2 || name.length > 20) return false;
    
    // Filter out common words that aren't project names
    const commonWords = ['project', 'app', 'application', 'system', 'website', 'tool', 'service', 'platform'];
    if (commonWords.includes(name.toLowerCase())) return false;
    
    // Filter out pronouns and articles
    const pronouns = ['this', 'that', 'these', 'those', 'it', 'they', 'them', 'the', 'a', 'an'];
    if (pronouns.includes(name.toLowerCase())) return false;
    
    // Must start with letter
    if (!/^[A-Za-z]/.test(name)) return false;
    
    return true;
  }
  
  /**
   * Validate skill name
   */
  isValidSkillName(name) {
    if (!name || name.length < 2 || name.length > 20) return false;
    
    // Filter out common words
    const commonWords = ['using', 'with', 'and', 'the', 'for', 'in', 'on', 'at', 'to', 'of'];
    if (commonWords.includes(name.toLowerCase())) return false;
    
    return true;
  }
  
  /**
   * Validate technology name
   */
  isValidTechnologyName(name) {
    if (!name || name.length < 2 || name.length > 20) return false;
    
    // Check if it's a known technology or looks like one
    return this.knownTechnologies.has(name.toLowerCase()) || 
           /^[A-Za-z][A-Za-z0-9.-]*$/.test(name);
  }
  
  /**
   * Validate experience name
   */
  isValidExperienceName(name) {
    if (!name || name.length < 2 || name.length > 30) return false;
    
    // Filter out common words
    const commonWords = ['company', 'organization', 'work', 'job', 'role', 'position'];
    if (commonWords.includes(name.toLowerCase())) return false;
    
    return true;
  }
  
  /**
   * Calculate confidence score for project extraction
   */
  calculateProjectConfidence(name, context, fullAnswer) {
    let confidence = 0.7; // Base confidence
    
    // Boost confidence for action verbs
    const actionVerbs = ['built', 'created', 'developed', 'designed', 'implemented'];
    if (actionVerbs.some(verb => context.toLowerCase().includes(verb))) {
      confidence += 0.2;
    }
    
    // Boost confidence for project-related words
    const projectWords = ['project', 'app', 'application', 'system', 'website'];
    if (projectWords.some(word => context.toLowerCase().includes(word))) {
      confidence += 0.1;
    }
    
    // Reduce confidence for very short names
    if (name.length < 4) {
      confidence -= 0.2;
    }
    
    // Boost confidence if mentioned multiple times
    const mentions = (fullAnswer.toLowerCase().match(new RegExp(name.toLowerCase(), 'g')) || []).length;
    if (mentions > 1) {
      confidence += 0.1;
    }
    
    return Math.min(Math.max(confidence, 0.0), 1.0);
  }
  
  /**
   * Calculate confidence score for skill extraction
   */
  calculateSkillConfidence(name, context, fullAnswer) {
    let confidence = 0.6; // Base confidence
    
    // Boost confidence for known technologies
    if (this.knownTechnologies.has(name.toLowerCase())) {
      confidence += 0.3;
    }
    
    // Boost confidence for skill-related context
    const skillContext = ['using', 'used', 'with', 'experienced', 'familiar', 'proficient'];
    if (skillContext.some(word => context.toLowerCase().includes(word))) {
      confidence += 0.2;
    }
    
    // Boost confidence for technical context
    const techContext = ['programming', 'coding', 'development', 'framework', 'library', 'language'];
    if (techContext.some(word => fullAnswer.toLowerCase().includes(word))) {
      confidence += 0.1;
    }
    
    return Math.min(Math.max(confidence, 0.0), 1.0);
  }
  
  /**
   * Calculate confidence score for technology extraction
   */
  calculateTechnologyConfidence(name, context, fullAnswer) {
    let confidence = 0.7; // Base confidence
    
    // Boost confidence for known technologies
    if (this.knownTechnologies.has(name.toLowerCase())) {
      confidence += 0.2;
    }
    
    // Boost confidence for deployment/infrastructure context
    const infraContext = ['deployed', 'hosting', 'server', 'database', 'cloud'];
    if (infraContext.some(word => context.toLowerCase().includes(word))) {
      confidence += 0.1;
    }
    
    return Math.min(Math.max(confidence, 0.0), 1.0);
  }
  
  /**
   * Calculate confidence score for experience extraction
   */
  calculateExperienceConfidence(name, context, fullAnswer) {
    let confidence = 0.8; // Base confidence
    
    // Boost confidence for work-related context
    const workContext = ['worked', 'employed', 'job', 'role', 'position', 'intern'];
    if (workContext.some(word => context.toLowerCase().includes(word))) {
      confidence += 0.1;
    }
    
    // Reduce confidence for very generic names
    const genericNames = ['company', 'startup', 'firm', 'organization'];
    if (genericNames.includes(name.toLowerCase())) {
      confidence -= 0.4;
    }
    
    return Math.min(Math.max(confidence, 0.0), 1.0);
  }
  
  /**
   * Extract surrounding context for an entity
   */
  extractContext(text, index, radius = 50) {
    const start = Math.max(0, index - radius);
    const end = Math.min(text.length, index + radius);
    return text.substring(start, end).trim();
  }
  
  /**
   * Filter and deduplicate extracted entities
   */
  filterAndDeduplicateEntities(entities) {
    // Filter by minimum confidence threshold
    const minConfidence = 0.6;
    let filtered = entities.filter(e => e.confidence >= minConfidence);
    
    // Deduplicate by name and type
    const seen = new Set();
    filtered = filtered.filter(entity => {
      const key = `${entity.type}:${entity.name.toLowerCase()}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
    
    // Sort by confidence (highest first)
    filtered.sort((a, b) => b.confidence - a.confidence);
    
    return filtered;
  }
  
  /**
   * Add extracted entity to conversation state
   */
  addExtractedEntity(conversationState, entity) {
    if (!entity || !conversationState) return false;
    
    // Check if entity already exists
    if (conversationState.isEntityMentioned(entity.name, entity.type)) {
      console.log(`⚠️  Entity already exists: ${entity.type}:${entity.name}`);
      return false;
    }
    
    // Add entity to conversation state
    conversationState.addExtractedEntity(entity);
    console.log(`✅ Added entity: ${entity.type}:${entity.name} (confidence: ${entity.confidence.toFixed(2)})`);
    
    return true;
  }
  
  /**
   * Get extracted entities by type
   */
  getExtractedEntities(conversationState, entityType = null) {
    if (!conversationState) return [];
    
    const allEntities = conversationState.getAllMentionedEntities();
    
    if (entityType) {
      return allEntities.filter(e => e.type === entityType);
    }
    
    return allEntities;
  }
  
  /**
   * Check if entity was mentioned
   */
  isEntityMentioned(conversationState, entityName, entityType) {
    if (!conversationState) return false;
    
    return conversationState.isEntityMentioned(entityName, entityType);
  }
  
  /**
   * Get entity confidence score
   */
  getEntityConfidence(conversationState, entityName) {
    if (!conversationState) return 0;
    
    const allEntities = conversationState.getAllMentionedEntities();
    const entity = allEntities.find(e => e.name.toLowerCase() === entityName.toLowerCase());
    
    return entity ? entity.confidence : 0;
  }
  
  /**
   * Verify entity through follow-up confirmation
   */
  verifyEntity(conversationState, entityName, confirmed = true) {
    const allEntities = conversationState.getAllMentionedEntities();
    const entity = allEntities.find(e => e.name.toLowerCase() === entityName.toLowerCase());
    
    if (entity) {
      entity.verified = confirmed;
      if (confirmed) {
        entity.confidence = Math.min(entity.confidence + 0.2, 1.0);
      } else {
        entity.confidence = Math.max(entity.confidence - 0.3, 0.0);
      }
      
      console.log(`${confirmed ? '✅' : '❌'} Entity ${entityName} ${confirmed ? 'verified' : 'rejected'}`);
      return true;
    }
    
    return false;
  }
  
  /**
   * Enhanced entity validation with detailed analysis
   */
  validateExtractedEntity(entity, conversationState, answer) {
    const validation = {
      isValid: true,
      confidence: entity.confidence,
      issues: [],
      suggestions: []
    };
    
    // Basic validation
    if (!entity.name || entity.name.trim().length === 0) {
      validation.isValid = false;
      validation.issues.push('Entity name is empty');
      return validation;
    }
    
    // Type-specific validation
    switch (entity.type) {
      case EntityType.PROJECT:
        this.validateProjectEntity(entity, validation, answer);
        break;
      case EntityType.SKILL:
        this.validateSkillEntity(entity, validation, answer);
        break;
      case EntityType.TECHNOLOGY:
        this.validateTechnologyEntity(entity, validation, answer);
        break;
      case EntityType.EXPERIENCE:
        this.validateExperienceEntity(entity, validation, answer);
        break;
    }
    
    // Context validation
    this.validateEntityContext(entity, validation, conversationState);
    
    // Confidence adjustment based on validation
    if (validation.issues.length > 0) {
      validation.confidence = Math.max(validation.confidence - (validation.issues.length * 0.1), 0.1);
    }
    
    return validation;
  }
  
  /**
   * Validate project entity
   */
  validateProjectEntity(entity, validation, answer) {
    const name = entity.name.toLowerCase();
    
    // Check for generic project names
    const genericNames = ['project', 'app', 'application', 'system', 'website', 'tool'];
    if (genericNames.includes(name)) {
      validation.isValid = false;
      validation.issues.push('Generic project name detected');
      validation.suggestions.push('Look for more specific project names');
    }
    
    // Check for proper nouns (should be capitalized)
    if (entity.name.length > 3 && entity.name === entity.name.toLowerCase()) {
      validation.issues.push('Project name should be capitalized');
      validation.suggestions.push(`Consider "${this.capitalizeFirst(entity.name)}"`);
    }
    
    // Check for action verbs in context (increases confidence)
    const actionVerbs = ['built', 'created', 'developed', 'designed', 'implemented', 'worked on'];
    const hasActionVerb = actionVerbs.some(verb => entity.context.toLowerCase().includes(verb));
    if (hasActionVerb) {
      validation.confidence = Math.min(validation.confidence + 0.1, 1.0);
    }
    
    // Check for project indicators
    const projectIndicators = ['github', 'repository', 'demo', 'deployed', 'live'];
    const hasIndicator = projectIndicators.some(indicator => answer.toLowerCase().includes(indicator));
    if (hasIndicator) {
      validation.confidence = Math.min(validation.confidence + 0.15, 1.0);
    }
  }
  
  /**
   * Validate skill entity
   */
  validateSkillEntity(entity, validation, answer) {
    const name = entity.name.toLowerCase();
    
    // Check if it's a known technology
    if (this.knownTechnologies.has(name)) {
      validation.confidence = Math.min(validation.confidence + 0.2, 1.0);
    } else {
      // Check if it looks like a technology name
      if (!/^[a-z][a-z0-9+#.-]*$/i.test(name)) {
        validation.issues.push('Skill name format looks unusual');
      }
    }
    
    // Check for skill context indicators
    const skillIndicators = ['experience', 'familiar', 'proficient', 'expert', 'years', 'using', 'worked with'];
    const hasSkillContext = skillIndicators.some(indicator => entity.context.toLowerCase().includes(indicator));
    if (hasSkillContext) {
      validation.confidence = Math.min(validation.confidence + 0.1, 1.0);
    }
    
    // Check for version numbers or specificity
    if (/\d+/.test(name) || name.includes('.')) {
      validation.confidence = Math.min(validation.confidence + 0.1, 1.0);
    }
    
    // Validate against common non-skills
    const nonSkills = ['good', 'bad', 'nice', 'great', 'awesome', 'cool', 'interesting'];
    if (nonSkills.includes(name)) {
      validation.isValid = false;
      validation.issues.push('Word is not a technical skill');
    }
  }
  
  /**
   * Validate technology entity
   */
  validateTechnologyEntity(entity, validation, answer) {
    const name = entity.name.toLowerCase();
    
    // Check if it's a known technology
    if (this.knownTechnologies.has(name)) {
      validation.confidence = Math.min(validation.confidence + 0.3, 1.0);
    }
    
    // Check for technology context
    const techContext = ['deployed', 'hosting', 'server', 'database', 'cloud', 'infrastructure'];
    const hasTechContext = techContext.some(context => entity.context.toLowerCase().includes(context));
    if (hasTechContext) {
      validation.confidence = Math.min(validation.confidence + 0.15, 1.0);
    }
    
    // Check for specific technology patterns
    if (name.includes('db') || name.includes('sql') || name.endsWith('.js') || name.endsWith('.py')) {
      validation.confidence = Math.min(validation.confidence + 0.1, 1.0);
    }
  }
  
  /**
   * Validate experience entity
   */
  validateExperienceEntity(entity, validation, answer) {
    const name = entity.name.toLowerCase();
    
    // Check for work-related context
    const workContext = ['worked', 'employed', 'job', 'role', 'position', 'intern', 'contractor'];
    const hasWorkContext = workContext.some(context => entity.context.toLowerCase().includes(context));
    if (hasWorkContext) {
      validation.confidence = Math.min(validation.confidence + 0.2, 1.0);
    } else {
      validation.issues.push('Missing work-related context');
    }
    
    // Check for company indicators
    const companyIndicators = ['inc', 'llc', 'corp', 'ltd', 'company', 'technologies', 'solutions'];
    const hasCompanyIndicator = companyIndicators.some(indicator => name.includes(indicator));
    if (hasCompanyIndicator) {
      validation.confidence = Math.min(validation.confidence + 0.1, 1.0);
    }
    
    // Validate length (company names shouldn't be too short or too long)
    if (name.length < 2) {
      validation.isValid = false;
      validation.issues.push('Company name too short');
    } else if (name.length > 30) {
      validation.issues.push('Company name unusually long');
    }
  }
  
  /**
   * Validate entity context
   */
  validateEntityContext(entity, validation, conversationState) {
    // Check for duplicate entities
    if (conversationState && conversationState.isEntityMentioned(entity.name, entity.type)) {
      validation.issues.push('Entity already mentioned');
      validation.suggestions.push('Consider if this is a new mention or confirmation');
    }
    
    // Check context length
    if (entity.context.length < 10) {
      validation.issues.push('Insufficient context for validation');
    }
    
    // Check if context makes sense
    if (entity.context.toLowerCase() === entity.name.toLowerCase()) {
      validation.issues.push('Context is identical to entity name');
    }
  }
  
  /**
   * Cross-validate entities for consistency
   */
  crossValidateEntities(entities, answer) {
    const validationResults = [];
    
    for (let i = 0; i < entities.length; i++) {
      const entity = entities[i];
      const crossValidation = {
        entity: entity,
        isConsistent: true,
        conflicts: [],
        supportingEvidence: []
      };
      
      // Check for conflicts with other entities
      for (let j = 0; j < entities.length; j++) {
        if (i !== j) {
          const otherEntity = entities[j];
          
          // Check for name conflicts (same name, different type)
          if (entity.name.toLowerCase() === otherEntity.name.toLowerCase() && 
              entity.type !== otherEntity.type) {
            crossValidation.isConsistent = false;
            crossValidation.conflicts.push(`Name conflict with ${otherEntity.type}`);
          }
          
          // Check for related entities (e.g., React skill + React project)
          if (entity.name.toLowerCase().includes(otherEntity.name.toLowerCase()) ||
              otherEntity.name.toLowerCase().includes(entity.name.toLowerCase())) {
            crossValidation.supportingEvidence.push(`Related to ${otherEntity.type}: ${otherEntity.name}`);
          }
        }
      }
      
      // Check for context overlap
      const contextWords = entity.context.toLowerCase().split(/\s+/);
      const answerWords = answer.toLowerCase().split(/\s+/);
      const overlap = contextWords.filter(word => answerWords.includes(word)).length;
      const overlapRatio = overlap / Math.max(contextWords.length, 1);
      
      if (overlapRatio < 0.3) {
        crossValidation.conflicts.push('Low context overlap with answer');
      }
      
      validationResults.push(crossValidation);
    }
    
    return validationResults;
  }
  
  /**
   * Suggest entity improvements
   */
  suggestEntityImprovements(entity, validation) {
    const suggestions = [...validation.suggestions];
    
    // Suggest capitalization fixes
    if (entity.type === EntityType.PROJECT && entity.name === entity.name.toLowerCase()) {
      suggestions.push(`Capitalize project name: "${this.capitalizeFirst(entity.name)}"`);
    }
    
    // Suggest technology standardization
    if (entity.type === EntityType.SKILL || entity.type === EntityType.TECHNOLOGY) {
      const standardName = this.standardizeTechnologyName(entity.name);
      if (standardName !== entity.name) {
        suggestions.push(`Standardize technology name: "${standardName}"`);
      }
    }
    
    // Suggest confidence improvements
    if (validation.confidence < 0.7) {
      suggestions.push('Consider asking follow-up questions to confirm this entity');
    }
    
    return suggestions;
  }
  
  /**
   * Standardize technology names
   */
  standardizeTechnologyName(name) {
    const standardizations = {
      'js': 'JavaScript',
      'ts': 'TypeScript',
      'py': 'Python',
      'node': 'Node.js',
      'react.js': 'React',
      'vue.js': 'Vue',
      'angular.js': 'Angular',
      'mysql': 'MySQL',
      'postgresql': 'PostgreSQL',
      'mongodb': 'MongoDB',
      'redis': 'Redis'
    };
    
    const lowerName = name.toLowerCase();
    return standardizations[lowerName] || name;
  }
  
  /**
   * Capitalize first letter
   */
  capitalizeFirst(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
  
  /**
   * Batch validate multiple entities
   */
  batchValidateEntities(entities, conversationState, answer) {
    const results = {
      validEntities: [],
      invalidEntities: [],
      warnings: [],
      suggestions: [],
      overallConfidence: 0
    };
    
    // Individual validation
    for (const entity of entities) {
      const validation = this.validateExtractedEntity(entity, conversationState, answer);
      
      if (validation.isValid) {
        results.validEntities.push({
          entity: entity,
          validation: validation
        });
      } else {
        results.invalidEntities.push({
          entity: entity,
          validation: validation
        });
      }
      
      results.warnings.push(...validation.issues);
      results.suggestions.push(...validation.suggestions);
    }
    
    // Cross-validation
    const crossValidation = this.crossValidateEntities(entities, answer);
    crossValidation.forEach(cv => {
      if (!cv.isConsistent) {
        results.warnings.push(...cv.conflicts);
      }
    });
    
    // Calculate overall confidence
    if (results.validEntities.length > 0) {
      results.overallConfidence = results.validEntities.reduce((sum, ve) => 
        sum + ve.validation.confidence, 0) / results.validEntities.length;
    }
    
    return results;
  }
  
  /**
   * Get extraction statistics
   */
  getExtractionStatistics(conversationState) {
    if (!conversationState) {
      return {
        totalEntities: 0,
        byType: {},
        avgConfidence: 0,
        verifiedCount: 0
      };
    }
    
    const allEntities = conversationState.getAllMentionedEntities();
    const byType = {};
    
    // Count by type
    Object.values(EntityType).forEach(type => {
      byType[type] = allEntities.filter(e => e.type === type).length;
    });
    
    // Calculate average confidence
    const avgConfidence = allEntities.length > 0
      ? allEntities.reduce((sum, e) => sum + e.confidence, 0) / allEntities.length
      : 0;
    
    // Count verified entities
    const verifiedCount = allEntities.filter(e => e.verified).length;
    
    return {
      totalEntities: allEntities.length,
      byType,
      avgConfidence: Math.round(avgConfidence * 100) / 100,
      verifiedCount,
      verificationRate: allEntities.length > 0 ? Math.round((verifiedCount / allEntities.length) * 100) : 0
    };
  }
  
  /**
   * Check if word is too generic to be a project name
   */
  isGenericWord(word) {
    const genericWords = new Set([
      'various', 'different', 'multiple', 'several', 'many', 'some', 'all',
      'because', 'however', 'therefore', 'although', 'moreover', 'furthermore',
      'randomly', 'basically', 'actually', 'really', 'very', 'quite',
      'him', 'his', 'her', 'their', 'our', 'my', 'your',
      'mind', 'time', 'way', 'thing', 'things', 'stuff', 'work',
      'agentic', 'platform', 'system', 'application', 'project', 'tool'
    ]);
    
    return genericWords.has(word.toLowerCase());
  }
}

// Singleton instance
let entityTrackerInstance = null;

function getEntityTracker() {
  if (!entityTrackerInstance) {
    entityTrackerInstance = new EntityTracker();
  }
  return entityTrackerInstance;
}

module.exports = {
  EntityTracker,
  ExtractedEntity,
  ExtractionResult,
  getEntityTracker
};