/**
 * Admin Routes
 * 
 * Handles administrative endpoints:
 * - GET /api/admin/listings/pending - Get unverified listings
 * - PATCH /api/admin/listings/:id/verify - Verify/reject listing
 * - GET /api/admin/users - Get all users
 * - PATCH /api/admin/users/:id - Update user
 * - GET /api/admin/analytics - Get analytics dashboard
 * - GET /api/admin/logs - Get audit logs
 * - GET /api/admin/stats - Get system statistics
 * 
 * All routes require admin role
 */

const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/authMiddleware');
const { isAdmin } = require('../middlewares/roleMiddleware');
const {
  getPendingListings,
  verifyListing,
  getUsers,
  updateUser,
  getAdminAnalytics,
  getAuditLogs,
  getSystemStats,
  getUserById,
  deleteUser
} = require('../controllers/adminController');

// All routes require admin authentication
router.use(protect);
router.use(isAdmin);

// Listing management
router.get('/listings/pending', getPendingListings);
router.patch('/listings/:id/verify', verifyListing);

// User management
router.get('/users', getUsers);
router.route('/users/:id')
  .get(getUserById)
  .patch(updateUser)
  .delete(deleteUser);

// Analytics and reporting
router.get('/analytics', getAdminAnalytics);
router.get('/logs', getAuditLogs);
router.get('/stats', getSystemStats);

module.exports = router;
