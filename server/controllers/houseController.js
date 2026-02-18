/**
 * House Controller
 * 
 * Handles house/listing operations:
 * - CRUD operations
 * - Filtering and searching
 * - Ratings and reviews
 * - Smart match integration
 * - Price fairness check
 */

const House = require('../models/House');
const User = require('../models/User');
const { asyncHandler, ApiError } = require('../middlewares/errorHandler');
const { calculateSmartMatch } = require('../utils/smartMatch');
const { getPriceFairness } = require('../utils/priceFairness');

/**
 * @desc    Create a new house listing
 * @route   POST /api/houses
 * @access  Private (owners only)
 */
const createHouse = asyncHandler(async (req, res) => {
  // Check if user is an owner
  if (req.user.role !== 'owner' && req.user.role !== 'admin') {
    throw new ApiError('Only property owners can create listings', 403);
  }

  const houseData = {
    ...req.body,
    ownerId: req.user._id
  };

  // Create house
  const house = await House.create(houseData);

  res.status(201).json({
    success: true,
    message: 'Listing created successfully',
    data: { house }
  });
});

/**
 * @desc    Get all houses with filters
 * @route   GET /api/houses
 * @access  Public
 * 
 * Query parameters:
 * - minPrice, maxPrice: Price range
 * - minRooms, maxRooms: Number of bedrooms
 * - city, state: Location filters
 * - amenities: Comma-separated list
 * - available: true/false
 * - verified: true/false (show only verified listings)
 * - sort: price, -price, rating, createdAt, -createdAt
 * - page, limit: Pagination
 * - lat, lng, radius: Location-based search (km)
 */
const getHouses = asyncHandler(async (req, res) => {
  const {
    minPrice,
    maxPrice,
    minRooms,
    maxRooms,
    city,
    state,
    amenities,
    available,
    verified,
    propertyType,
    sort = '-createdAt',
    page = 1,
    limit = 20,
    lat,
    lng,
    radius
  } = req.query;

  // Build filter object
  const filter = {};

  // Price filter
  if (minPrice || maxPrice) {
    filter.price = {};
    if (minPrice) filter.price.$gte = Number(minPrice);
    if (maxPrice) filter.price.$lte = Number(maxPrice);
  }

  // Rooms filter
  if (minRooms || maxRooms) {
    filter['rooms.bedrooms'] = {};
    if (minRooms) filter['rooms.bedrooms'].$gte = Number(minRooms);
    if (maxRooms) filter['rooms.bedrooms'].$lte = Number(maxRooms);
  }

  // Location filters
  if (city) {
    filter['location.city'] = new RegExp(city, 'i');
  }
  if (state) {
    filter['location.state'] = new RegExp(state, 'i');
  }

  // Amenities filter (match any of the provided amenities)
  if (amenities) {
    const amenityList = amenities.split(',').map(a => a.trim());
    filter.amenities = { $all: amenityList };
  }

  // Property type filter
  if (propertyType) {
    filter.propertyType = propertyType;
  }

  // Availability filter
  if (available !== undefined) {
    filter.available = available === 'true';
  }

  // VERIFIED BADGE FILTER - Show only admin-verified listings
  if (verified === 'true') {
    filter['verified.status'] = true;
  }

  // Geo-location filter (MAP INTEGRATION)
  if (lat && lng && radius) {
    const radiusInRadians = Number(radius) / 6371; // Earth's radius in km
    filter['location.coordinates'] = {
      $geoWithin: {
        $centerSphere: [[Number(lng), Number(lat)], radiusInRadians]
      }
    };
  }

  // Build sort object
  let sortOption = {};
  if (sort.startsWith('-')) {
    sortOption[sort.substring(1)] = -1;
  } else {
    sortOption[sort] = 1;
  }

  // Execute query with pagination
  const skip = (Number(page) - 1) * Number(limit);

  const [houses, total] = await Promise.all([
    House.find(filter)
      .populate('ownerId', 'name rating verified')
      .sort(sortOption)
      .skip(skip)
      .limit(Number(limit)),
    House.countDocuments(filter)
  ]);

  // If user is authenticated, calculate smart match scores
  let housesWithMatch = houses;
  if (req.user && req.user.preferences) {
    housesWithMatch = houses.map(house => {
      const matchScore = calculateSmartMatch(req.user.preferences, house);
      return {
        ...house.toObject(),
        matchScore
      };
    });

    // Optionally sort by match score
    if (sort === 'match') {
      housesWithMatch.sort((a, b) => b.matchScore - a.matchScore);
    }
  }

  res.status(200).json({
    success: true,
    data: {
      houses: housesWithMatch,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / Number(limit))
      }
    }
  });
});

/**
 * @desc    Get single house by ID
 * @route   GET /api/houses/:id
 * @access  Public
 */
const getHouseById = asyncHandler(async (req, res) => {
  const house = await House.findById(req.params.id)
    .populate('ownerId', 'name email phone rating verified avatar')
    .populate('ratings.tenantId', 'name avatar');

  if (!house) {
    throw new ApiError('House not found', 404);
  }

  // Increment view count
  house.viewCount += 1;
  await house.save({ validateBeforeSave: false });

  // Get price fairness score (PRICE FAIRNESS FEATURE)
  const priceFairness = await getPriceFairness(house);

  // Calculate smart match if user is authenticated
  let matchScore = null;
  if (req.user && req.user.preferences) {
    matchScore = calculateSmartMatch(req.user.preferences, house);
  }

  res.status(200).json({
    success: true,
    data: {
      house,
      priceFairness,
      matchScore
    }
  });
});

/**
 * @desc    Update house listing
 * @route   PATCH /api/houses/:id
 * @access  Private (owner only)
 */
const updateHouse = asyncHandler(async (req, res) => {
  let house = await House.findById(req.params.id);

  if (!house) {
    throw new ApiError('House not found', 404);
  }

  // Check ownership (owner or admin)
  if (house.ownerId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    throw new ApiError('Not authorized to update this listing', 403);
  }

  // Fields that owners can update
  const allowedUpdates = [
    'title', 'description', 'price', 'rooms', 'amenities',
    'images', 'available', 'availableFrom', 'minLeaseDuration',
    'deposit', 'rules', 'propertyType', 'size'
  ];

  // Filter updates
  const updates = {};
  Object.keys(req.body).forEach(key => {
    if (allowedUpdates.includes(key)) {
      updates[key] = req.body[key];
    }
  });

  // Handle location update separately (nested object)
  if (req.body.location) {
    updates.location = { ...house.location.toObject(), ...req.body.location };
  }

  // Update listing (verified status revoked on significant changes)
  if (updates.price || updates.location || updates.rooms) {
    updates['verified.status'] = false;
    updates['verified.verifiedAt'] = null;
    updates['verified.verifiedBy'] = null;
  }

  house = await House.findByIdAndUpdate(
    req.params.id,
    updates,
    { new: true, runValidators: true }
  );

  res.status(200).json({
    success: true,
    message: 'Listing updated successfully',
    data: { house }
  });
});

/**
 * @desc    Delete house listing
 * @route   DELETE /api/houses/:id
 * @access  Private (owner only)
 */
const deleteHouse = asyncHandler(async (req, res) => {
  const house = await House.findById(req.params.id);

  if (!house) {
    throw new ApiError('House not found', 404);
  }

  // Check ownership
  if (house.ownerId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    throw new ApiError('Not authorized to delete this listing', 403);
  }

  // TODO: Check for active bookings before deletion

  await House.findByIdAndDelete(req.params.id);

  res.status(200).json({
    success: true,
    message: 'Listing deleted successfully'
  });
});

/**
 * @desc    Add rating/review to house
 * @route   POST /api/houses/:id/ratings
 * @access  Private (tenants who have booked)
 */
const addRating = asyncHandler(async (req, res) => {
  const { score, comment } = req.body;

  if (!score || score < 1 || score > 5) {
    throw new ApiError('Please provide a valid score (1-5)', 400);
  }

  const house = await House.findById(req.params.id);

  if (!house) {
    throw new ApiError('House not found', 404);
  }

  // TODO: Verify user has completed a booking at this property

  // Add or update rating
  await house.addRating(req.user._id, score, comment);

  res.status(200).json({
    success: true,
    message: 'Rating added successfully',
    data: {
      averageRating: house.averageRating,
      totalRatings: house.ratings.length
    }
  });
});

/**
 * @desc    Get houses owned by current user
 * @route   GET /api/houses/my-listings
 * @access  Private (owners)
 */
const getMyListings = asyncHandler(async (req, res) => {
  const houses = await House.find({ ownerId: req.user._id })
    .sort('-createdAt');

  res.status(200).json({
    success: true,
    data: { 
      houses,
      count: houses.length 
    }
  });
});

/**
 * @desc    Upload images to house listing
 * @route   POST /api/houses/:id/images
 * @access  Private (owner or admin)
 */
const uploadImages = asyncHandler(async (req, res) => {
  const { images } = req.body; // Expects array of { url, caption, isPrimary }
  
  if (!images || !Array.isArray(images) || images.length === 0) {
    throw new ApiError('Please provide at least one image', 400);
  }

  const house = await House.findById(req.params.id);
  if (!house) {
    throw new ApiError('House not found', 404);
  }

  // Check ownership
  if (house.ownerId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    throw new ApiError('Not authorized to update this listing', 403);
  }

  // Add images
  house.images.push(...images);
  await house.save();

  res.status(200).json({
    success: true,
    message: 'Images uploaded successfully',
    data: { images: house.images }
  });
});

/**
 * @desc    Remove an image from house listing
 * @route   DELETE /api/houses/:id/images/:imgId
 * @access  Private (owner or admin)
 */
const removeImage = asyncHandler(async (req, res) => {
  const house = await House.findById(req.params.id);
  if (!house) {
    throw new ApiError('House not found', 404);
  }

  // Check ownership
  if (house.ownerId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    throw new ApiError('Not authorized to update this listing', 403);
  }

  // Remove image
  house.images = house.images.filter(img => img._id.toString() !== req.params.imgId);
  await house.save();

  res.status(200).json({
    success: true,
    message: 'Image removed successfully',
    data: { images: house.images }
  });
});

module.exports = {
  createHouse,
  getHouses,
  getHouseById,
  updateHouse,
  deleteHouse,
  addRating,
  getMyListings,
  uploadImages,
  removeImage
};
