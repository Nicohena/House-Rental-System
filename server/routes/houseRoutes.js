/**
 * House Routes
 * 
 * Handles house/listing endpoints:
 * - GET /api/houses - Get all houses with filters
 * - POST /api/houses - Create new listing (owners only)
 * - GET /api/houses/my-listings - Get owner's listings
 * - GET /api/houses/:id - Get single house
 * - PATCH /api/houses/:id - Update house
 * - DELETE /api/houses/:id - Delete house
 * - POST /api/houses/:id/ratings - Add rating/review
 */

const express = require('express');
const router = express.Router();
const { protect, optionalAuth } = require('../middlewares/authMiddleware');
const { authorize, isOwner } = require('../middlewares/roleMiddleware');
const {
  createHouse,
  getHouses,
  getHouseById,
  updateHouse,
  deleteHouse,
  addRating,
  getMyListings,
  uploadImages,
  removeImage
} = require('../controllers/houseController');

// Public routes (with optional auth for smart match)
router.get('/', optionalAuth, getHouses);
router.get('/:id', optionalAuth, getHouseById);

// Protected routes
router.post('/', protect, isOwner, createHouse);
router.get('/my-listings', protect, isOwner, getMyListings);
router.patch('/:id', protect, updateHouse);
router.delete('/:id', protect, deleteHouse);
router.post('/:id/ratings', protect, addRating);

// Image management
router.post('/:id/images', protect, uploadImages);
router.delete('/:id/images/:imgId', protect, removeImage);

module.exports = router;
