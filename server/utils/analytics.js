/**
 * Analytics Utility
 * 
 * Provides analytics and reporting functions for:
 * - Booking statistics
 * - Occupancy rates
 * - Revenue reports
 * - Pricing trends
 * - User activity metrics
 */

const BookingRequest = require('../models/BookingRequest');
const House = require('../models/House');
const User = require('../models/User');
const Payment = require('../models/Payment');
const mongoose = require('mongoose');

/**
 * Get comprehensive analytics for admin dashboard
 * 
 * @param {Date} startDate - Start of analytics period
 * @param {Date} endDate - End of analytics period
 * @returns {Object} - Analytics data
 */
const getAnalytics = async (startDate, endDate) => {
  const [
    bookingStats,
    revenueStats,
    userStats,
    listingStats,
    trends
  ] = await Promise.all([
    getBookingStats(startDate, endDate),
    getRevenueStats(startDate, endDate),
    getUserStats(startDate, endDate),
    getListingStats(startDate, endDate),
    getTrends(startDate, endDate)
  ]);

  return {
    bookings: bookingStats,
    revenue: revenueStats,
    users: userStats,
    listings: listingStats,
    trends
  };
};

/**
 * Get booking statistics
 */
const getBookingStats = async (startDate, endDate) => {
  const bookings = await BookingRequest.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalValue: { $sum: '$totalAmount' }
      }
    }
  ]);

  // Convert to object format
  const stats = {
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    cancelled: 0,
    completed: 0,
    conversionRate: 0
  };

  bookings.forEach(b => {
    stats[b._id] = b.count;
    stats.total += b.count;
  });

  // Calculate conversion rate
  if (stats.total > 0) {
    stats.conversionRate = Math.round(
      ((stats.approved + stats.completed) / stats.total) * 100
    );
  }

  return stats;
};

/**
 * Get revenue statistics
 */
const getRevenueStats = async (startDate, endDate) => {
  const payments = await Payment.aggregate([
    {
      $match: {
        status: 'succeeded',
        paidAt: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: null,
        totalRevenue: { $sum: '$amount' },
        totalTransactions: { $sum: 1 },
        averageTransaction: { $avg: '$amount' },
        totalRefunds: { $sum: '$refund.amount' }
      }
    }
  ]);

  const stats = payments[0] || {
    totalRevenue: 0,
    totalTransactions: 0,
    averageTransaction: 0,
    totalRefunds: 0
  };

  // Calculate net revenue
  stats.netRevenue = stats.totalRevenue - stats.totalRefunds;

  // Get daily breakdown
  const dailyRevenue = await Payment.aggregate([
    {
      $match: {
        status: 'succeeded',
        paidAt: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$paidAt' } },
        revenue: { $sum: '$amount' },
        count: { $sum: 1 }
      }
    },
    {
      $sort: { _id: 1 }
    }
  ]);

  stats.dailyBreakdown = dailyRevenue;

  return stats;
};

/**
 * Get user statistics
 */
const getUserStats = async (startDate, endDate) => {
  const newUsers = await User.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: '$role',
        count: { $sum: 1 }
      }
    }
  ]);

  const stats = {
    newTenants: 0,
    newOwners: 0,
    newAdmins: 0,
    totalNew: 0
  };

  newUsers.forEach(u => {
    if (u._id === 'tenant') stats.newTenants = u.count;
    if (u._id === 'owner') stats.newOwners = u.count;
    if (u._id === 'admin') stats.newAdmins = u.count;
    stats.totalNew += u.count;
  });

  // Get active users (users who logged in)
  const activeUsers = await User.countDocuments({
    lastLogin: { $gte: startDate, $lte: endDate }
  });

  stats.activeUsers = activeUsers;

  return stats;
};

/**
 * Get listing statistics
 */
const getListingStats = async (startDate, endDate) => {
  const newListings = await House.countDocuments({
    createdAt: { $gte: startDate, $lte: endDate }
  });

  const verifiedListings = await House.countDocuments({
    'verified.verifiedAt': { $gte: startDate, $lte: endDate }
  });

  const avgPrice = await House.aggregate([
    { $match: { available: true } },
    { $group: { _id: null, avgPrice: { $avg: '$price' } } }
  ]);

  const totalViews = await House.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: null,
        totalViews: { $sum: '$viewCount' }
      }
    }
  ]);

  // Listings by property type
  const byType = await House.aggregate([
    { $match: { available: true } },
    { $group: { _id: '$propertyType', count: { $sum: 1 } } }
  ]);

  return {
    newListings,
    verifiedListings,
    averagePrice: avgPrice[0]?.avgPrice || 0,
    totalViews: totalViews[0]?.totalViews || 0,
    byPropertyType: Object.fromEntries(byType.map(t => [t._id || 'other', t.count]))
  };
};

/**
 * Get trends (weekly/monthly comparisons)
 */
const getTrends = async (startDate, endDate) => {
  // Calculate period length
  const periodDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
  const previousStart = new Date(startDate - (endDate - startDate));
  const previousEnd = startDate;

  // Current period stats
  const current = {
    bookings: await BookingRequest.countDocuments({
      createdAt: { $gte: startDate, $lte: endDate }
    }),
    users: await User.countDocuments({
      createdAt: { $gte: startDate, $lte: endDate }
    }),
    listings: await House.countDocuments({
      createdAt: { $gte: startDate, $lte: endDate }
    }),
    revenue: (await Payment.aggregate([
      { $match: { status: 'succeeded', paidAt: { $gte: startDate, $lte: endDate } } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]))[0]?.total || 0
  };

  // Previous period stats
  const previous = {
    bookings: await BookingRequest.countDocuments({
      createdAt: { $gte: previousStart, $lte: previousEnd }
    }),
    users: await User.countDocuments({
      createdAt: { $gte: previousStart, $lte: previousEnd }
    }),
    listings: await House.countDocuments({
      createdAt: { $gte: previousStart, $lte: previousEnd }
    }),
    revenue: (await Payment.aggregate([
      { $match: { status: 'succeeded', paidAt: { $gte: previousStart, $lte: previousEnd } } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]))[0]?.total || 0
  };

  // Calculate percentage changes
  const calculateChange = (current, previous) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 100);
  };

  return {
    periodDays,
    current,
    previous,
    changes: {
      bookings: calculateChange(current.bookings, previous.bookings),
      users: calculateChange(current.users, previous.users),
      listings: calculateChange(current.listings, previous.listings),
      revenue: calculateChange(current.revenue, previous.revenue)
    }
  };
};

/**
 * Get owner-specific analytics
 * 
 * @param {string} ownerId - Owner's user ID
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 */
const getOwnerAnalytics = async (ownerId, startDate, endDate) => {
  const ownerObjectId = mongoose.Types.ObjectId(ownerId);

  // Get owner's listings
  const listings = await House.find({ ownerId }).select('_id title viewCount averageRating');
  const listingIds = listings.map(l => l._id);

  // Booking stats for owner's properties
  const bookings = await BookingRequest.aggregate([
    {
      $match: {
        houseId: { $in: listingIds },
        createdAt: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        revenue: { $sum: '$totalAmount' }
      }
    }
  ]);

  // Revenue for owner
  const revenue = await Payment.aggregate([
    {
      $match: {
        ownerId: ownerObjectId,
        status: 'succeeded',
        paidAt: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: null,
        total: { $sum: '$amount' }
      }
    }
  ]);

  // Occupancy calculation
  const approvedBookings = await BookingRequest.find({
    houseId: { $in: listingIds },
    status: { $in: ['approved', 'completed'] },
    startDate: { $lte: endDate },
    endDate: { $gte: startDate }
  });

  // Calculate total booked days
  let bookedDays = 0;
  approvedBookings.forEach(b => {
    const start = b.startDate > startDate ? b.startDate : startDate;
    const end = b.endDate < endDate ? b.endDate : endDate;
    const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    bookedDays += days;
  });

  const totalDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
  const maxBookedDays = totalDays * listings.length;
  const occupancyRate = maxBookedDays > 0 ? Math.round((bookedDays / maxBookedDays) * 100) : 0;

  return {
    listings: listings.length,
    totalViews: listings.reduce((sum, l) => sum + (l.viewCount || 0), 0),
    averageRating: listings.length > 0
      ? listings.reduce((sum, l) => sum + (l.averageRating || 0), 0) / listings.length
      : 0,
    bookings: Object.fromEntries(bookings.map(b => [b._id, { count: b.count, revenue: b.revenue }])),
    totalRevenue: revenue[0]?.total || 0,
    occupancyRate
  };
};

module.exports = {
  getAnalytics,
  getBookingStats,
  getRevenueStats,
  getUserStats,
  getListingStats,
  getTrends,
  getOwnerAnalytics
};
