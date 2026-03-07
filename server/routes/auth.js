const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const authController = require('../controllers/authController');
const { authenticateToken } = require('../middleware/auth');

// Register new user
router.post(
  '/register',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 6 }),
    body('name').trim().notEmpty()
  ],
  authController.register
);

// Login user
router.post(
  '/login',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty()
  ],
  authController.login
);

// Get user profile
router.get('/profile', authenticateToken, authController.getProfile);

// Update user profile
router.put('/profile', authenticateToken, authController.updateProfile);

// Change password
router.put('/change-password', authenticateToken, authController.changePassword);

// Delete account
router.delete('/delete-account', authenticateToken, authController.deleteAccount);

module.exports = router;
