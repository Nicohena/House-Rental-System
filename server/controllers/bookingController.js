/**
 * Booking Controller
 * 
 * Handles booking request operations:
 * - Create booking request
 * - Get bookings (with role-based filtering)
 * - Update booking status
 */

const BookingRequest = require('../models/BookingRequest');
const House = require('../models/House');
const User = require('../models/User');
const logger = require('../utils/logger');
const { asyncHandler, ApiError } = require('../middlewares/errorHandler');

/**
 * @desc    Create a booking request
 * @route   POST /api/bookings
 * @access  Private (tenants only)
 */
const createBooking = asyncHandler(async (req, res) => {
  const { houseId, startDate, endDate, message, occupants } = req.body;

  // Validate required fields
  if (!houseId || !startDate || !endDate) {
    throw new ApiError('Please provide houseId, startDate, and endDate', 400);
  }

  // Check if house exists and is available
  const house = await House.findById(houseId).populate('ownerId', 'name email');

  if (!house) {
    throw new ApiError('House not found', 404);
  }

  if (!house.available) {
    throw new ApiError('This property is currently not available', 400);
  }

  // Prevent owner from booking their own property
  if (house.ownerId._id.toString() === req.user._id.toString()) {
    throw new ApiError('You cannot book your own property', 400);
  }

  // Perform validations
  const start = new Date(startDate);
  const end = new Date(endDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (start < today) {
    throw new ApiError('Check-in date cannot be in the past', 400);
  }

  if (end <= start) {
    throw new ApiError('Check-out date must be after check-in date', 400);
  }

  // Validate minimum lease duration
  if (house.minLeaseDuration) {
    const diffMs = end - start;
    const diffMonths = diffMs / (1000 * 60 * 60 * 24 * 30.44); // avg month length
    if (diffMonths < house.minLeaseDuration) {
      throw new ApiError(`Minimum lease duration is ${house.minLeaseDuration} month${house.minLeaseDuration !== 1 ? 's' : ''}`, 400);
    }
  }

  // Check for date overlap with existing approved/pending bookings
  const hasOverlap = await BookingRequest.hasOverlap(
    houseId,
    start,
    end
  );

  if (hasOverlap) {
    throw new ApiError('The selected dates overlap with an existing booking', 400);
  }

  // Calculate total price dynamically matching frontend logic
  const diffDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
  const daysInMonth = new Date(start.getFullYear(), start.getMonth() + 1, 0).getDate();
  const dailyRate = house.price / daysInMonth;
  const totalAmount = Math.round(dailyRate * diffDays);

  // Create booking request
  const booking = await BookingRequest.create({
    houseId,
    tenantId: req.user._id,
    ownerId: house.ownerId._id,
    startDate: start,
    endDate: end,
    totalAmount,
    message,
    occupants: occupants || { adults: 1, children: 0 }
  });

  // Emit real-time notification to owner (SOCKET.IO INTEGRATION)
  const io = req.io;
  if (io) {
    io.to(`user_${house.ownerId._id}`).emit('newBookingRequest', {
      bookingId: booking._id,
      house: house.title,
      tenant: req.user.name,
      dates: { startDate, endDate }
    });
  }

  res.status(201).json({
    success: true,
    message: 'Booking request submitted successfully',
    data: { booking }
  });
});

/**
 * @desc    Get bookings with role-based filtering
 * @route   GET /api/bookings
 * @access  Private
 * 
 * - Tenants see their own bookings
 * - Owners see bookings for their properties
 * - Admins see all bookings
 */
const getBookings = asyncHandler(async (req, res) => {
  const { status, page = 1, limit = 20 } = req.query;
  
  let filter = {};

  // Role-based filtering
  if (req.user.role === 'tenant') {
    filter.tenantId = req.user._id;
  } else if (req.user.role === 'owner') {
    filter.ownerId = req.user._id;
  }
  // Admins see all bookings (no filter)

  // Status filter
  if (status) {
    filter.status = status;
  }

  const skip = (Number(page) - 1) * Number(limit);

  const [bookings, total] = await Promise.all([
    BookingRequest.find(filter)
      .populate('houseId', 'title price images location')
      .populate('tenantId', 'name email phone avatar')
      .populate('ownerId', 'name email phone')
      .sort('-createdAt')
      .skip(skip)
      .limit(Number(limit)),
    BookingRequest.countDocuments(filter)
  ]);

  res.status(200).json({
    success: true,
    data: {
      bookings,
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
 * @desc    Get single booking by ID
 * @route   GET /api/bookings/:id
 * @access  Private
 */
const getBookingById = asyncHandler(async (req, res) => {
  const booking = await BookingRequest.findById(req.params.id)
    .populate('houseId', 'title price images location rooms amenities')
    .populate('tenantId', 'name email phone avatar rating')
    .populate('ownerId', 'name email phone avatar');

  if (!booking) {
    throw new ApiError('Booking not found', 404);
  }

  // Check authorization
  const isAuthorized = 
    req.user.role === 'admin' ||
    booking.tenantId._id.toString() === req.user._id.toString() ||
    booking.ownerId._id.toString() === req.user._id.toString();

  if (!isAuthorized) {
    throw new ApiError('Not authorized to view this booking', 403);
  }

  res.status(200).json({
    success: true,
    data: { booking }
  });
});

/**
 * @desc    Update booking status (approve/reject)
 * @route   PATCH /api/bookings/:id
 * @access  Private (owner or admin)
 */
const updateBooking = asyncHandler(async (req, res) => {
  const { status, message } = req.body;

  const booking = await BookingRequest.findById(req.params.id)
    .populate('houseId', 'title')
    .populate('tenantId', 'name email');

  if (!booking) {
    throw new ApiError('Booking not found', 404);
  }

  // Check authorization (owner of the property or admin)
  const isOwner = booking.ownerId.toString() === req.user._id.toString();
  const isAdmin = req.user.role === 'admin';
  const isTenant = booking.tenantId._id.toString() === req.user._id.toString();

  // Owners and admins can approve/reject
  // Tenants can only cancel
  if (!isOwner && !isAdmin && !isTenant) {
    throw new ApiError('Not authorized to update this booking', 403);
  }

  // Validate status transitions
  const validTransitions = {
    pending: ['approved', 'rejected', 'cancelled'],
    approved: ['cancelled', 'completed'],
    rejected: [],
    cancelled: [],
    completed: []
  };

  if (!validTransitions[booking.status].includes(status)) {
    throw new ApiError(`Cannot change status from ${booking.status} to ${status}`, 400);
  }

  // Tenant can only cancel their own booking
  if (isTenant && status !== 'cancelled') {
    throw new ApiError('You can only cancel this booking', 403);
  }

  // Update booking
  booking.status = status;
  
  if (message) {
    booking.ownerResponse = {
      message,
      respondedAt: new Date()
    };
  }

  if (status === 'cancelled') {
    booking.cancellation = {
      cancelledBy: req.user._id,
      reason: message || 'No reason provided',
      cancelledAt: new Date()
    };
  }

  await booking.save();

  // Emit real-time notification (SOCKET.IO INTEGRATION)
  const io = req.io;
  if (io) {
    // Notify tenant
    io.to(`user_${booking.tenantId._id}`).emit('bookingStatusUpdate', {
      bookingId: booking._id,
      house: booking.houseId.title,
      status,
      message
    });
  }

  res.status(200).json({
    success: true,
    message: `Booking ${status} successfully`,
    data: { booking }
  });
});

/**
 * @desc    Get booking statistics
 * @route   GET /api/bookings/stats
 * @access  Private (owners/admins)
 */
const getBookingStats = asyncHandler(async (req, res) => {
  let matchFilter = {};

  if (req.user.role === 'owner') {
    matchFilter.ownerId = req.user._id;
  }

  const stats = await BookingRequest.aggregate([
    { $match: matchFilter },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalRevenue: {
          $sum: {
            $cond: [{ $eq: ['$paymentStatus', 'paid'] }, '$totalAmount', 0]
          }
        }
      }
    }
  ]);

  // Format stats
  const formattedStats = {
    pending: 0,
    approved: 0,
    rejected: 0,
    cancelled: 0,
    completed: 0,
    totalRevenue: 0
  };

  stats.forEach(stat => {
    formattedStats[stat._id] = stat.count;
    formattedStats.totalRevenue += stat.totalRevenue;
  });

  res.status(200).json({
    success: true,
    data: { stats: formattedStats }
  });
});

/**
 * @desc    Get pending booking requests for owner
 * @route   GET /api/bookings/pending
 * @access  Private (owner only)
 */
const getPendingBookings = asyncHandler(async (req, res) => {
  if (req.user.role !== 'owner') {
    throw new ApiError('Only owners can view pending requests', 403);
  }

  const pendingBookings = await BookingRequest.find({
    ownerId: req.user._id,
    status: 'pending'
  })
    .populate('houseId', 'title')
    .populate('tenantId', 'name email avatar')
    .sort('-createdAt');

  res.status(200).json({
    success: true,
    count: pendingBookings.length,
    data: { bookings: pendingBookings }
  });
});

/**
 * @desc    Get revenue analytics
 * @route   GET /api/bookings/revenue
 * @access  Private (owner only)
 */
const getRevenueAnalytics = asyncHandler(async (req, res) => {
  if (req.user.role !== 'owner') {
    throw new ApiError('Only owners can view revenue analytics', 403);
  }

  const { range = '6m' } = req.query;
  
  // Calculate date range
  const now = new Date();
  let startDate = new Date();
  
  if (range === '1y') {
    startDate.setFullYear(now.getFullYear() - 1);
  } else if (range === '3m') {
    startDate.setMonth(now.getMonth() - 3);
  } else {
    // Default 6 months
    startDate.setMonth(now.getMonth() - 6);
  }

  const revenueData = await BookingRequest.aggregate([
    {
      $match: {
        ownerId: req.user._id,
        status: 'completed', // Or whatever status indicates paid/completed
        paymentStatus: 'paid',
        endDate: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: {
          month: { $month: '$endDate' },
          year: { $year: '$endDate' }
        },
        revenue: { $sum: '$totalAmount' }
      }
    },
    { $sort: { '_id.year': 1, '_id.month': 1 } }
  ]);

  // Format for chart (fill in missing months)
  const formattedData = [];
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  
  // Create map of existing data
  const revenueMap = {};
  revenueData.forEach(item => {
    const key = `${item._id.year}-${item._id.month}`;
    revenueMap[key] = item.revenue;
  });

  // Generate last N months labels
  let currentDate = new Date(startDate);
  // Move to start of next month to ensure we cover the range correctly
  currentDate.setMonth(currentDate.getMonth() + 1);
  currentDate.setDate(1);

  while (currentDate <= now) {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth() + 1; // 1-indexed for map key
    const monthIndex = currentDate.getMonth(); // 0-indexed for array lookup
    
    const key = `${year}-${month}`;
    formattedData.push({
      label: monthNames[monthIndex],
      value: revenueMap[key] || 0
    });
    
    currentDate.setMonth(currentDate.getMonth() + 1);
  }

  // If no data, return at least empty structure or mock if needed (but better to return real empty data)
  
  res.status(200).json({
    success: true,
    data: { revenue: formattedData }
  });
});

/**
 * @desc    Get all bookings (admin only)
 * @route   GET /api/bookings/all
 * @access  Private (admin only)
 */
const getAllBookings = asyncHandler(async (req, res) => {
  const bookings = await BookingRequest.find()
    .populate('houseId', 'title price')
    .populate('tenantId', 'name email')
    .populate('ownerId', 'name email')
    .sort('-createdAt');

  res.status(200).json({
    success: true,
    count: bookings.length,
    data: { bookings }
  });
});

/**
 * @desc    Cancel booking (alias for updateBooking with status cancelled)
 * @route   POST /api/bookings/:id/cancel
 * @access  Private (tenant, owner, or admin)
 */
const cancelBooking = asyncHandler(async (req, res, next) => {
  req.body.status = 'cancelled';
  return updateBooking(req, res, next);
});

/**
 * @desc    Get unavailable dates for a house
 * @route   GET /api/bookings/house/:houseId/unavailable-dates
 * @access  Public
 */
const getUnavailableDates = asyncHandler(async (req, res) => {
  const { houseId } = req.params;

  const bookings = await BookingRequest.find({
    houseId,
    status: { $in: ['approved', 'pending'] },
    endDate: { $gte: new Date() }
  }).select('startDate endDate');

  res.status(200).json({
    success: true,
    data: {
      unavailableDates: bookings.map(b => ({
        start: b.startDate,
        end: b.endDate
      }))
    }
  });
});

module.exports = {
  createBooking,
  getBookings,
  getBookingById,
  updateBooking,
  getBookingStats,
  getAllBookings,
  getPendingBookings,
  getRevenueAnalytics,
  cancelBooking,
  getUnavailableDates
};
