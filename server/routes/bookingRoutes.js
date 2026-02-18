/**
 * Booking Routes
 * 
 * Handles booking request endpoints:
 * - GET /api/bookings - Get bookings (role-filtered)
 * - POST /api/bookings - Create booking request
 * - GET /api/bookings/stats - Get booking statistics
 * - GET /api/bookings/:id - Get single booking
 * - PATCH /api/bookings/:id - Update booking status
 */

const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/authMiddleware');
const { isTenant, isOwner, authorize } = require('../middlewares/roleMiddleware');
const {
  createBooking,
  getBookings,
  getBookingById,
  updateBooking,
  getBookingStats,
  getAllBookings,
  getPendingBookings,
  getRevenueAnalytics,
  cancelBooking
} = require('../controllers/bookingController');

// All routes require authentication
router.use(protect);

// Booking routes
router.route('/')
  .get(getBookings)
  .post(createBooking);

// Statistics (owners and admins)
router.get('/stats', authorize('owner', 'admin'), getBookingStats);

// Analytics endpoints
router.get('/pending', authorize('owner'), getPendingBookings);
router.get('/revenue', authorize('owner'), getRevenueAnalytics);

// Admin: Get all bookings
router.get('/all', authorize('admin'), getAllBookings);

// Single booking operations
router.route('/:id')
  .get(getBookingById)
  .patch(updateBooking);

// Dedicated cancel endpoint
router.post('/:id/cancel', cancelBooking);

module.exports = router;
