/**
 * Recommendation Routes
 * 
 * Handles recommendation endpoints:
 * - GET /api/recommendations/:userId - Get recommendations
 * - POST /api/recommendations/:userId/view/:houseId - Mark as viewed
 * - POST /api/recommendations/:userId/feedback - Record feedback
 * - GET /api/recommendations/similar/:houseId - Get similar houses
 */

const express = require('express');
const router = express.Router();
const { protect, optionalAuth } = require('../middlewares/authMiddleware');
const {
  getRecommendations,
  markViewed,
  recordFeedback,
  getSimilarHouses
} = require('../controllers/recommendationController');

// Public route for similar houses
router.get('/similar/:houseId', optionalAuth, getSimilarHouses);

// Protected routes
router.use(protect);

router.get('/:userId', getRecommendations);
router.post('/:userId/view/:houseId', markViewed);
router.post('/:userId/feedback', recordFeedback);

module.exports = router;
