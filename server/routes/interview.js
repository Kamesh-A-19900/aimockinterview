const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const interviewController = require('../controllers/interviewController');

// Start interview session
router.post('/start', authenticateToken, interviewController.startInterview);

// Submit answer and get next question
router.post('/:id/answer', authenticateToken, interviewController.submitAnswer);

// Complete interview
router.post('/:id/complete', authenticateToken, interviewController.completeInterview);

// Terminate interview (delete due to policy violation)
router.delete('/:id/terminate', authenticateToken, interviewController.terminateInterview);

// Get interview details
router.get('/:id', authenticateToken, interviewController.getInterview);

module.exports = router;
