const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const dashboardController = require('../controllers/dashboardController');

// Get user dashboard data
router.get('/', authenticateToken, dashboardController.getDashboard);

module.exports = router;
