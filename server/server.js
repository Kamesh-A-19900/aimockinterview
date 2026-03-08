const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config();

// Import services
const { chromaService } = require('./services/chromaService');
const { getPDFQuestionBankService } = require('./services/pdfQuestionBankService');

// Import routes
const authRoutes = require('./routes/auth');
const resumeRoutes = require('./routes/resume');
const interviewRoutes = require('./routes/interview');
const practiceRoutes = require('./routes/practice');
const dashboardRoutes = require('./routes/dashboard');

// Initialize Express app
const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files for uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'running', 
    message: 'Mock Interview Agent API',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/resume', resumeRoutes);
app.use('/api/interview', interviewRoutes);
app.use('/api/practice', practiceRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal server error';
  
  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Initialize services
async function initializeServices() {
  try {
    console.log('🔄 Initializing services...');
    
    // Initialize ChromaDB
    await chromaService.initialize();
    
    // Initialize Question Bank (check if PDF exists and process it)
    const questionBankService = getPDFQuestionBankService();
    const pdfPath = path.join(__dirname, '../interview_question.pdf');
    
    // Check if PDF exists and initialize
    const fs = require('fs');
    if (fs.existsSync(pdfPath)) {
      console.log('📄 Found interview_question.pdf - initializing question bank...');
      await questionBankService.initialize(pdfPath);
    } else {
      console.log('📚 Loading existing question bank...');
      await questionBankService.loadExistingQuestionBank();
    }
    
    // Show question bank statistics
    const stats = questionBankService.getStatistics();
    if (stats.initialized) {
      console.log('✅ Question Bank Statistics:');
      console.log(`   📊 Scenarios: ${stats.totalScenarios}`);
      console.log(`   💬 Q&A Pairs: ${stats.totalQAPairs}`);
      console.log(`   🎯 Difficulty: ${JSON.stringify(stats.difficultyLevels)}`);
      console.log(`   📝 Types: ${JSON.stringify(stats.scenarioTypes)}`);
    }
    
    console.log('✅ All services initialized successfully');
  } catch (error) {
    console.error('❌ Service initialization failed:', error);
    // Don't exit - server can still run with fallback questions
  }
}

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, async () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
  
  // Initialize services after server starts
  await initializeServices();
});

module.exports = app;
