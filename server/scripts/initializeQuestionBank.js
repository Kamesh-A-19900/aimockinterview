/**
 * Initialize Question Bank from PDF
 * 
 * This script processes the interview_question.pdf file and creates
 * a persistent vector database for intelligent question generation.
 * 
 * Run this once to set up the question bank.
 */

const path = require('path');
const { getPDFQuestionBankService } = require('../services/pdfQuestionBankService');

async function initializeQuestionBank() {
  console.log('🚀 Starting Question Bank Initialization...\n');
  
  try {
    // Path to the PDF file
    const pdfPath = path.join(__dirname, '../../interview_question.pdf');
    
    // Initialize the service
    const questionBankService = getPDFQuestionBankService();
    
    // Process the PDF and create embeddings
    const success = await questionBankService.initialize(pdfPath);
    
    if (success) {
      console.log('\n✅ Question Bank Initialization Complete!');
      
      // Show statistics
      const stats = questionBankService.getStatistics();
      console.log('\n📊 Question Bank Statistics:');
      console.log(`   Total Scenarios: ${stats.totalScenarios}`);
      console.log(`   Total Q&A Pairs: ${stats.totalQAPairs}`);
      console.log(`   Difficulty Levels:`, stats.difficultyLevels);
      console.log(`   Scenario Types:`, stats.scenarioTypes);
      console.log(`   Top Topics:`, Object.entries(stats.topicDistribution)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10)
        .map(([topic, count]) => `${topic}(${count})`)
        .join(', '));
      
      console.log('\n🎯 The question bank is now ready for use!');
      console.log('   - Embeddings are stored persistently in ChromaDB');
      console.log('   - No need to reprocess unless you want to add new content');
      console.log('   - Interview agents will now use these scenarios for questions');
      
    } else {
      console.log('\n❌ Question Bank Initialization Failed!');
      console.log('   Please check the logs above for error details.');
    }
    
  } catch (error) {
    console.error('\n❌ Initialization Error:', error.message);
    console.error('   Stack:', error.stack);
  }
}

// Run if called directly
if (require.main === module) {
  initializeQuestionBank()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

module.exports = { initializeQuestionBank };