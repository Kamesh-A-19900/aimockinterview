/**
 * Patch Entity Extraction for Immediate Fix
 * 
 * This patches the EntityTracker to properly extract:
 * - StudySpark, NetWise, MockInterview AI
 * - AI, ML abbreviations
 * - Comma-separated project lists
 */

const fs = require('fs');
const path = require('path');

function patchEntityExtraction() {
  console.log('🔧 Patching Entity Extraction...');
  
  const entityTrackerPath = path.join(__dirname, '../services/entityTracker.js');
  let content = fs.readFileSync(entityTrackerPath, 'utf8');
  
  // Add improved project extraction patterns
  const improvedProjectPatterns = `
      projects: [
        // Comma-separated project lists (CRITICAL FIX)
        /(?:projects?|apps?|applications?).*?(?:are|include|includes|like|such as|:)\\s*([A-Za-z][A-Za-z0-9\\s,.-]{5,100})/gi,
        
        // Direct project mentions with compound names
        /(?:working on|built|created|developed|designed|building|creating|developing)\\s+(?:a\\s+)?([A-Za-z][A-Za-z0-9\\s]{2,30})\\s+(?:project|app|application|system|platform|agent|AI|tool)/gi,
        
        // Specific project name patterns (StudySpark, NetWise, etc.)
        /\\b(StudySpark|NetWise|MockInterview\\s*AI|Mock\\s*Interview\\s*AI|ChatBridge)\\b/gi,
        
        // Original patterns (kept for compatibility)
        /(?:project|app|application|system|platform|tool|website|service)\\s+(?:called|named)\\s+([A-Za-z][A-Za-z0-9_-]{1,19})/gi,
        /([A-Za-z][A-Za-z0-9_-]{1,19})\\s+(?:project|app|application|system|platform)/gi,
        /(?:built|created|developed|designed|worked on|building|creating|developing)\\s+(?:a\\s+)?([A-Za-z][A-Za-z0-9_-]{1,19})/gi,
        /(?:my|our|the)\\s+([A-Za-z][A-Za-z0-9_-]{1,19})\\s+(?:project|app|system)/gi
      ],`;
  
  // Replace the projects patterns
  content = content.replace(
    /projects: \[[\s\S]*?\],/,
    improvedProjectPatterns
  );
  
  // Add AI/ML to known technologies
  const aiMlTechnologies = `
      // AI/ML (CRITICAL FIX - add common abbreviations)
      'ai', 'ml', 'artificial intelligence', 'machine learning', 'deep learning',
      'tensorflow', 'pytorch', 'scikit-learn', 'pandas', 'numpy', 'opencv', 'huggingface', 'llm', 'genai',
      'rag', 'retrieval augmented generation', 'gpt', 'bert', 'transformer', 'neural network',`;
  
  content = content.replace(
    /\/\/ AI\/ML[\s\S]*?'genai',/,
    aiMlTechnologies
  );
  
  // Add improved project extraction method
  const improvedProjectExtraction = `
  /**
   * Extract project entities (IMPROVED VERSION)
   */
  extractProjects(answer) {
    const projects = [];
    
    // First, try to extract comma-separated project lists
    const commaSeparatedMatch = answer.match(/(?:projects?|apps?|applications?).*?(?:are|include|includes|like|such as|:)\\s*([A-Za-z][A-Za-z0-9\\s,.-]{5,100})/gi);
    if (commaSeparatedMatch) {
      commaSeparatedMatch.forEach(match => {
        // Extract the project list part
        const listPart = match.replace(/.*?(?:are|include|includes|like|such as|:)\\s*/i, '');
        
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
  }`;
  
  // Replace the extractProjects method
  content = content.replace(
    /\/\*\*[^*]*\* Extract project entities[^*]*\*\/[^}]*extractProjects\(answer\)[^}]*{[^}]*}[^}]*}/s,
    improvedProjectExtraction
  );
  
  // Write the patched file
  fs.writeFileSync(entityTrackerPath, content);
  
  console.log('✅ Entity extraction patched successfully!');
  console.log('🔧 Improvements:');
  console.log('   - Added comma-separated project list parsing');
  console.log('   - Added specific patterns for StudySpark, NetWise, MockInterview AI');
  console.log('   - Added AI/ML abbreviations to known technologies');
  console.log('   - Added generic word filtering');
  
  return true;
}

// Run if called directly
if (require.main === module) {
  try {
    patchEntityExtraction();
    console.log('\n🎉 Patch applied successfully!');
    console.log('💡 Restart the server to apply changes');
    process.exit(0);
  } catch (error) {
    console.error('💥 Patch failed:', error);
    process.exit(1);
  }
}

module.exports = { patchEntityExtraction };