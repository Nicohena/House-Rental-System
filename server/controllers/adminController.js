/**
 * Admin Controller
 * 
 * Handles administrative operations:
 * - Listing verification
 * - User management
 * - Analytics and reports
 * - Audit logs
 */

const House = require('../models/House');
const User = require('../models/User');
const BookingRequest = require('../models/BookingRequest');
const Payment = require('../models/Payment');
const AdminLog = require('../models/AdminLog');
const { asyncHandler, ApiError } = require('../middlewares/errorHandler');
const { getAnalytics } = require('../utils/analytics');

/**
 * @desc    Get pending (unverified) listings
 * @route   GET /api/admin/listings/pending
 * @access  Private (admin only)
 */
const getPendingListings = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const skip = (Number(page) - 1) * Number(limit);

  const [listings, total] = await Promise.all([
    House.find({ 'verified.status': false })
      .populate('ownerId', 'name email phone verified')
      .sort('-createdAt')
      .skip(skip)
      .limit(Number(limit)),
    House.countDocuments({ 'verified.status': false })
  ]);

  res.status(200).json({
    success: true,
    data: {
      listings,
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
 * @desc    Verify or reject a listing (VERIFIED BADGE FEATURE)
 * @route   PATCH /api/admin/listings/:id/verify
 * @access  Private (admin only)
 */
const verifyListing = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { approved, reason } = req.body;

  const house = await House.findById(id).populate('ownerId', 'name email');

  if (!house) {
    throw new ApiError('Listing not found', 404);
  }

  // Update verification status
  if (approved) {
    house.verified = {
      status: true,
      verifiedAt: new Date(),
      verifiedBy: req.user._id
    };
  } else {
    house.verified = {
      status: false,
      verifiedAt: null,
      verifiedBy: null
    };
  }

  await house.save();

  // Log admin action (AUDIT LOG)
  await AdminLog.logAction({
    action: approved ? 'HOUSE_VERIFIED' : 'HOUSE_REJECTED',
    targetId: house._id,
    targetType: 'House',
    performedBy: req.user._id,
    details: {
      reason: reason || (approved ? 'Approved' : 'Rejected'),
      previousState: { verified: !approved },
      newState: { verified: approved }
    },
    metadata: {
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    },
    severity: 'medium'
  });

  // Notify owner (SOCKET.IO INTEGRATION)
  const io = req.app.get('io');
  if (io) {
    io.to(`user_${house.ownerId._id}`).emit('listingVerification', {
      houseId: house._id,
      title: house.title,
      approved,
      reason
    });
  }

  res.status(200).json({
    success: true,
    message: `Listing ${approved ? 'verified' : 'rejected'} successfully`,
    data: { house }
  });
});

/**
 * @desc    Get all users
 * @route   GET /api/admin/users
 * @access  Private (admin only)
 */
const getUsers = asyncHandler(async (req, res) => {
  const { role, verified, search, page = 1, limit = 20 } = req.query;
  const skip = (Number(page) - 1) * Number(limit);

  const filter = {};

  if (role) {
    filter.role = role;
  }

  if (verified !== undefined) {
    filter.verified = verified === 'true';
  }

  if (search) {
    filter.$or = [
      { name: new RegExp(search, 'i') },
      { email: new RegExp(search, 'i') }
    ];
  }

  const [users, total] = await Promise.all([
    User.find(filter)
      .select('-password')
      .sort('-createdAt')
      .skip(skip)
      .limit(Number(limit)),
    User.countDocuments(filter)
  ]);

  res.status(200).json({
    success: true,
    data: {
      users,
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
 * @desc    Update user (admin action)
 * @route   PATCH /api/admin/users/:id
 * @access  Private (admin only)
 */
const updateUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { role, verified, suspended } = req.body;

  const user = await User.findById(id);

  if (!user) {
    throw new ApiError('User not found', 404);
  }

  // Store previous state for audit log
  const previousState = {
    role: user.role,
    verified: user.verified
  };

  // Update fields
  if (role) user.role = role;
  if (verified !== undefined) user.verified = verified;
  // Add suspended field if needed

  await user.save();

  // Log admin action
  await AdminLog.logAction({
    action: role ? 'USER_ROLE_CHANGED' : 'USER_UPDATED',
    targetId: user._id,
    targetType: 'User',
    performedBy: req.user._id,
    details: {
      previousState,
      newState: { role: user.role, verified: user.verified }
    },
    severity: role ? 'high' : 'medium'
  });

  res.status(200).json({
    success: true,
    message: 'User updated successfully',
    data: { user: user.getPublicProfile() }
  });
});

/**
 * @desc    Get admin analytics dashboard (ANALYTICS FEATURE)
 * @route   GET /api/admin/analytics
 * @access  Private (admin only)
 */
const getAdminAnalytics = asyncHandler(async (req, res) => {
  const { period = '30d' } = req.query;

  // Calculate date range
  let startDate;
  const endDate = new Date();

  switch (period) {
    case '7d':
      startDate = new Date(endDate - 7 * 24 * 60 * 60 * 1000);
      break;
    case '30d':
      startDate = new Date(endDate - 30 * 24 * 60 * 60 * 1000);
      break;
    case '90d':
      startDate = new Date(endDate - 90 * 24 * 60 * 60 * 1000);
      break;
    case '1y':
      startDate = new Date(endDate - 365 * 24 * 60 * 60 * 1000);
      break;
    default:
      startDate = new Date(endDate - 30 * 24 * 60 * 60 * 1000);
  }

  // Get analytics data
  const analytics = await getAnalytics(startDate, endDate);

  // Get additional counts
  const [
    totalUsers,
    totalHouses,
    totalBookings,
    pendingVerifications,
    recentPayments
  ] = await Promise.all([
    User.countDocuments(),
    House.countDocuments(),
    BookingRequest.countDocuments(),
    House.countDocuments({ 'verified.status': false }),
    Payment.aggregate([
      {
        $match: {
          status: 'succeeded',
          paidAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      }
    ])
  ]);

  res.status(200).json({
    success: true,
    data: {
      overview: {
        totalUsers,
        totalHouses,
        totalBookings,
        pendingVerifications,
        revenue: recentPayments[0]?.totalRevenue || 0,
        transactions: recentPayments[0]?.count || 0
      },
      analytics,
      period
    }
  });
});

/**
 * @desc    Get admin audit logs
 * @route   GET /api/admin/logs
 * @access  Private (admin only)
 */
const getAuditLogs = asyncHandler(async (req, res) => {
  const { action, targetType, severity, page = 1, limit = 50 } = req.query;
  const skip = (Number(page) - 1) * Number(limit);

  const filter = {};

  if (action) filter.action = action;
  if (targetType) filter.targetType = targetType;
  if (severity) filter.severity = severity;

  const [logs, total] = await Promise.all([
    AdminLog.find(filter)
      .populate('performedBy', 'name email')
      .sort('-createdAt')
      .skip(skip)
      .limit(Number(limit)),
    AdminLog.countDocuments(filter)
  ]);

  res.status(200).json({
    success: true,
    data: {
      logs,
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
 * @desc    Get system statistics
 * @route   GET /api/admin/stats
 * @access  Private (admin only)
 */
const getSystemStats = asyncHandler(async (req, res) => {
  const [
    usersByRole,
    bookingsByStatus,
    housesByType,
    recentActivity
  ] = await Promise.all([
    // Users by role
    User.aggregate([
      { $group: { _id: '$role', count: { $sum: 1 } } }
    ]),
    // Bookings by status
    BookingRequest.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]),
    // Houses by property type
    House.aggregate([
      { $group: { _id: '$propertyType', count: { $sum: 1 } } }
    ]),
    // Recent activity (last 24 hours)
    AdminLog.find({ 
      createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } 
    })
      .sort('-createdAt')
      .limit(10)
      .populate('performedBy', 'name')
  ]);

  res.status(200).json({
    success: true,
    data: {
      usersByRole: Object.fromEntries(
        usersByRole.map(r => [r._id, r.count])
      ),
      bookingsByStatus: Object.fromEntries(
        bookingsByStatus.map(b => [b._id, b.count])
      ),
      housesByType: Object.fromEntries(
        housesByType.map(h => [h._id || 'unspecified', h.count])
      ),
      recentActivity
    }
  });
});

/**
 * @desc    Get user by ID (admin)
 */
const getUserById = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id).select('-password');
  if (!user) throw new ApiError('User not found', 404);
  res.status(200).json({ success: true, data: { user } });
});

/**
 * @desc    Delete user (admin)
 */
const deleteUser = asyncHandler(async (req, res) => {
  const user = await User.findByIdAndDelete(req.params.id);
  if (!user) throw new ApiError('User not found', 404);
  res.status(200).json({ success: true, message: 'User deleted successfully' });
});

module.exports = {
  getPendingListings,
  verifyListing,
  getUsers,
  updateUser,
  getAdminAnalytics,
  getAuditLogs,
  getSystemStats,
  getUserById,
  deleteUser
};
