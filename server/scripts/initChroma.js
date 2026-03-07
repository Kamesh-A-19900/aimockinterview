/**
 * Initialize ChromaDB
 * Run this script to setup collections and seed knowledge base
 */

const { chromaService } = require('../services/chromaService');

async function initializeChroma() {
  try {
    console.log('🚀 Starting ChromaDB initialization...\n');

    // Initialize service
    await chromaService.initialize();

    // Get stats
    const stats = await chromaService.getStats();
    console.log('\n📊 ChromaDB Statistics:');
    console.log(`   - Q&A Cache: ${stats.qaCache} documents`);
    console.log(`   - Knowledge Base: ${stats.knowledge} documents`);
    console.log(`   - Evaluation Patterns: ${stats.patterns} documents`);

    // Test query
    console.log('\n🔍 Testing knowledge base query...');
    const results = await chromaService.queryKnowledge('What is a good RAG pipeline?', 2);
    console.log(`   Found ${results.documents.length} relevant documents:`);
    results.documents.forEach((doc, i) => {
      console.log(`\n   ${i + 1}. ${doc.substring(0, 100)}...`);
      console.log(`      Relevance: ${(1 - results.distances[i]).toFixed(2)}`);
    });

    console.log('\n✅ ChromaDB initialization complete!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Initialization failed:', error);
    process.exit(1);
  }
}

initializeChroma();
