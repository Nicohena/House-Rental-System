/**
 * Recommendation Controller
 * 
 * Handles personalized house recommendations:
 * - Get recommendations for user
 * - Refresh recommendations
 * - Record feedback
 * 
 * NOTE: Uses smart match algorithm for content-based filtering
 */

const Recommendation = require('../models/Recommendation');
const House = require('../models/House');
const User = require('../models/User');
const { asyncHandler, ApiError } = require('../middlewares/errorHandler');
const { calculateSmartMatch, getTopMatches } = require('../utils/smartMatch');

/**
 * @desc    Get recommendations for a user
 * @route   GET /api/recommendations/:userId
 * @access  Private (self or admin)
 */
const getRecommendations = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { limit = 10, refresh = 'false' } = req.query;

  // Verify authorization (self or admin)
  if (req.user._id.toString() !== userId && req.user.role !== 'admin') {
    throw new ApiError('Not authorized to view recommendations', 403);
  }

  // Get user with preferences
  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError('User not found', 404);
  }

  // Get or create recommendations
  let recommendations = await Recommendation.getForUser(userId);

  // Check if refresh is needed
  const needsRefresh = 
    refresh === 'true' || 
    recommendations.stale ||
    recommendations.recommendedHouses.length === 0 ||
    (Date.now() - new Date(recommendations.refreshedAt).getTime()) > 24 * 60 * 60 * 1000; // 24 hours

  if (needsRefresh) {
    // Generate new recommendations using smart match algorithm
    const newRecommendations = await generateRecommendations(user);
    await recommendations.addRecommendations(newRecommendations);
    
    // Reload with populated data
    recommendations = await Recommendation.findById(recommendations._id)
      .populate({
        path: 'recommendedHouses.houseId',
        select: 'title price rooms location images averageRating verified available amenities',
        match: { available: true }
      });
  }

  // Filter out unavailable houses and get top N
  const topRecommendations = recommendations.recommendedHouses
    .filter(rec => rec.houseId && rec.houseId.available !== false)
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, Number(limit));

  res.status(200).json({
    success: true,
    data: {
      recommendations: topRecommendations,
      algorithm: recommendations.algorithm,
      refreshedAt: recommendations.refreshedAt,
      total: topRecommendations.length
    }
  });
});

/**
 * Generate recommendations for a user
 * Uses a hybrid approach combining content-based and collaborative filtering
 * 
 * @param {Object} user - User document with preferences
 * @returns {Array} - Array of recommended houses with scores
 */
const generateRecommendations = async (user) => {
  const recommendations = [];
  
  // Get user preferences
  const preferences = user.preferences || {};

  // Build query for potential matches
  const query = { available: true };

  // Apply preference-based filters (loose matching)
  if (preferences.priceRange) {
    // Expand price range for more results
    query.price = {
      $gte: Math.max(0, (preferences.priceRange.min || 0) * 0.7),
      $lte: (preferences.priceRange.max || 999999) * 1.3
    };
  }

  // Get candidate houses
  let candidates = await House.find(query)
    .populate('ownerId', 'name rating verified')
    .limit(100)
    .sort('-createdAt');

  // Calculate smart match score for each candidate
  const scored = candidates.map(house => {
    const { score, reasons } = calculateSmartMatch(preferences, house, true);
    
    return {
      houseId: house._id,
      matchScore: score,
      reasons
    };
  });

  // Sort by score and take top results
  scored.sort((a, b) => b.matchScore - a.matchScore);
  
  // Add trending houses (high view count, recent)
  const trendingHouses = await House.find({
    available: true,
    _id: { $nin: scored.slice(0, 20).map(s => s.houseId) }
  })
    .sort('-viewCount -createdAt')
    .limit(10);

  const trendingScored = trendingHouses.map(house => ({
    houseId: house._id,
    matchScore: 50 + Math.min(house.viewCount / 10, 25), // Base score + popularity bonus
    reasons: ['trending']
  }));

  // Add verified houses boost
  const verifiedHouses = await House.find({
    available: true,
    'verified.status': true,
    _id: { $nin: [...scored.slice(0, 20).map(s => s.houseId), ...trendingScored.map(t => t.houseId)] }
  })
    .sort('-averageRating -createdAt')
    .limit(10);

  const verifiedScored = verifiedHouses.map(house => ({
    houseId: house._id,
    matchScore: 60 + (house.averageRating * 5), // Base score + rating bonus
    reasons: ['owner_verified', 'highly_rated']
  }));

  // Combine and deduplicate
  const allRecommendations = [...scored.slice(0, 30), ...trendingScored, ...verifiedScored];
  
  // Remove duplicates (keep highest score)
  const uniqueMap = new Map();
  allRecommendations.forEach(rec => {
    const existing = uniqueMap.get(rec.houseId.toString());
    if (!existing || existing.matchScore < rec.matchScore) {
      uniqueMap.set(rec.houseId.toString(), rec);
    }
  });

  return Array.from(uniqueMap.values()).slice(0, 50);
};

/**
 * @desc    Mark recommendation as viewed
 * @route   POST /api/recommendations/:userId/view/:houseId
 * @access  Private (self only)
 */
const markViewed = asyncHandler(async (req, res) => {
  const { userId, houseId } = req.params;

  if (req.user._id.toString() !== userId) {
    throw new ApiError('Not authorized', 403);
  }

  const recommendation = await Recommendation.findOne({ userId });
  
  if (recommendation) {
    await recommendation.markViewed(houseId);
  }

  res.status(200).json({
    success: true,
    message: 'Marked as viewed'
  });
});

/**
 * @desc    Record feedback on recommendations
 * @route   POST /api/recommendations/:userId/feedback
 * @access  Private (self only)
 */
const recordFeedback = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { helpful } = req.body;

  if (req.user._id.toString() !== userId) {
    throw new ApiError('Not authorized', 403);
  }

  if (helpful === undefined) {
    throw new ApiError('Please provide helpful feedback (true/false)', 400);
  }

  const recommendation = await Recommendation.findOne({ userId });
  
  if (!recommendation) {
    throw new ApiError('No recommendations found', 404);
  }

  await recommendation.recordFeedback(helpful);

  res.status(200).json({
    success: true,
    message: 'Feedback recorded',
    data: { feedback: recommendation.feedback }
  });
});

/**
 * @desc    Get similar houses (item-based recommendations)
 * @route   GET /api/recommendations/similar/:houseId
 * @access  Public
 */
const getSimilarHouses = asyncHandler(async (req, res) => {
  const { houseId } = req.params;
  const { limit = 6 } = req.query;

  const house = await House.findById(houseId);
  
  if (!house) {
    throw new ApiError('House not found', 404);
  }

  // Find similar houses based on:
  // - Same city/state
  // - Similar price range (±30%)
  // - Similar room count
  // - Overlapping amenities
  const priceMin = house.price * 0.7;
  const priceMax = house.price * 1.3;

  const similarHouses = await House.find({
    _id: { $ne: houseId },
    available: true,
    $or: [
      { 'location.city': house.location.city },
      { 'location.state': house.location.state }
    ],
    price: { $gte: priceMin, $lte: priceMax }
  })
    .select('title price rooms location images averageRating verified amenities')
    .limit(Number(limit) * 3); // Get more for sorting

  // Score and sort by similarity
  const scored = similarHouses.map(similar => {
    let score = 0;

    // Same city bonus
    if (similar.location.city === house.location.city) score += 30;
    if (similar.location.state === house.location.state) score += 10;

    // Price similarity
    const priceDiff = Math.abs(similar.price - house.price) / house.price;
    score += (1 - priceDiff) * 20;

    // Room similarity
    if (similar.rooms.bedrooms === house.rooms.bedrooms) score += 15;

    // Amenity overlap
    const commonAmenities = similar.amenities.filter(a => house.amenities.includes(a));
    score += (commonAmenities.length / Math.max(house.amenities.length, 1)) * 25;

    return { house: similar, score };
  });

  scored.sort((a, b) => b.score - a.score);

  res.status(200).json({
    success: true,
    data: {
      similar: scored.slice(0, Number(limit)).map(s => s.house)
    }
  });
});

module.exports = {
  getRecommendations,
  markViewed,
  recordFeedback,
  getSimilarHouses
};
