const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const practiceController = require('../controllers/practiceController');

// Start practice interview (in-memory only)
router.post('/start', authenticateToken, practiceController.startPractice);

// Submit answer and get next question
router.post('/:sessionId/answer', authenticateToken, practiceController.submitAnswer);

// Complete practice and get evaluation (then erase)
router.post('/:sessionId/complete', authenticateToken, practiceController.completePractice);

// Get practice session stats (for debugging)
router.get('/stats', authenticateToken, practiceController.getStats);

module.exports = router;
