/**
 * Auth Routes
 * 
 * Handles authentication endpoints:
 * - POST /api/auth/register - Register new user
 * - POST /api/auth/login - Login user
 * - GET /api/auth/me - Get current user
 * - PUT /api/auth/password - Update password
 * - POST /api/auth/forgot-password - Request password reset
 * - POST /api/auth/logout - Logout user
 */

const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/authMiddleware');
const {
  register,
  login,
  getMe,
  updatePassword,
  forgotPassword,
  logout,
  refreshToken
} = require('../controllers/authController');

// Public routes
router.post('/register', register);
router.post('/login', login);
router.post('/forgot-password', forgotPassword);

// Protected routes
router.get('/me', protect, getMe);
router.post('/refresh', protect, refreshToken);
router.put('/password', protect, updatePassword);
router.post('/logout', protect, logout);

module.exports = router;
