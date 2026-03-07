const jwt = require('jsonwebtoken');
const { query } = require('../config/database');

/**
 * Middleware to verify JWT token and authenticate requests
 */
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required. Please provide a valid token.'
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Verify user still exists in database
    const userCheck = await query(
      'SELECT id, email, name FROM users WHERE id = $1',
      [decoded.userId]
    );
    
    if (userCheck.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'User not found. Please login again.'
      });
    }
    
    req.user = decoded; // { userId, email }
    req.userDetails = userCheck.rows[0]; // Full user details if needed
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token. Please login again.'
      });
    } else if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired. Please login again.'
      });
    } else {
      console.error('Auth middleware error:', error);
      return res.status(500).json({
        success: false,
        message: 'Authentication error. Please try again.'
      });
    }
  }
};

module.exports = { authenticateToken };
