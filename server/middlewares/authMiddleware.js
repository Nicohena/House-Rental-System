/**
 * Authentication Middleware
 * 
 * Verifies JWT tokens and attaches user to request object
 * Used to protect routes that require authentication
 */

const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Protect routes - Verify JWT token
 * Attaches the authenticated user to req.user
 */
const protect = async (req, res, next) => {
  let token;

  try {
    // Check for token in Authorization header (Bearer token)
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer')
    ) {
      token = req.headers.authorization.split(' ')[1];
    }
    // Alternative: Check for token in cookies
    else if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }

    // Check if token exists
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.'
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Get user from token
    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found. Token is invalid.'
      });
    }

    // Attach user to request
    req.user = user;
    next();
  } catch (error) {
    // Handle specific JWT errors
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token.'
      });
    }

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token has expired. Please login again.'
      });
    }

    // Generic error
    return res.status(401).json({
      success: false,
      message: 'Authentication failed.'
    });
  }
};

/**
 * Optional authentication - User is attached if token is valid
 * Does not block request if no token is provided
 * Useful for routes that behave differently for authenticated users
 */
const optionalAuth = async (req, res, next) => {
  let token;

  try {
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer')
    ) {
      token = req.headers.authorization.split(' ')[1];

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select('-password');

      if (user) {
        req.user = user;
      }
    }
  } catch (error) {
    // Silently fail - user just won't be attached
    console.log('Optional auth failed:', error.message);
  }

  next();
};

/**
 * Verify user owns the resource or is admin
 * @param {string} ownerField - The field in the document that contains owner ID
 * @returns {Function} - Express middleware
 */
const verifyOwnership = (ownerField = 'userId') => {
  return (req, res, next) => {
    // Admin can access anything
    if (req.user.role === 'admin') {
      return next();
    }

    // Check if user owns the resource
    const resourceOwnerId = req.resource?.[ownerField]?.toString();
    const userId = req.user._id.toString();

    if (resourceOwnerId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to access this resource.'
      });
    }

    next();
  };
};

module.exports = {
  protect,
  optionalAuth,
  verifyOwnership
};
