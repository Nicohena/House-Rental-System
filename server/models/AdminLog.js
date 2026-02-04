/**
 * AdminLog Model
 * 
 * Audit log for tracking administrative actions
 * Used for accountability, debugging, and compliance
 * 
 * Features:
 * - Action tracking with details
 * - Target reference (user, house, booking, etc.)
 * - IP address and user agent logging
 */

const mongoose = require('mongoose');

const adminLogSchema = new mongoose.Schema({
  // Type of action performed
  action: {
    type: String,
    required: [true, 'Action type is required'],
    enum: [
      // User management
      'USER_CREATED',
      'USER_UPDATED',
      'USER_DELETED',
      'USER_VERIFIED',
      'USER_SUSPENDED',
      'USER_ROLE_CHANGED',
      // House/listing management
      'HOUSE_CREATED',
      'HOUSE_UPDATED',
      'HOUSE_DELETED',
      'HOUSE_VERIFIED',
      'HOUSE_REJECTED',
      'HOUSE_FEATURED',
      // Booking management
      'BOOKING_CREATED',
      'BOOKING_APPROVED',
      'BOOKING_REJECTED',
      'BOOKING_CANCELLED',
      // Payment management
      'PAYMENT_PROCESSED',
      'PAYMENT_REFUNDED',
      'PAYMENT_FAILED',
      // System actions
      'SYSTEM_CONFIG_CHANGED',
      'REPORT_GENERATED',
      'DATA_EXPORTED',
      // General
      'OTHER'
    ]
  },
  // ID of the affected entity
  targetId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    refPath: 'targetType'
  },
  // Type of entity affected
  targetType: {
    type: String,
    required: true,
    enum: ['User', 'House', 'BookingRequest', 'Payment', 'System']
  },
  // Admin who performed the action
  performedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Admin user reference is required']
  },
  // Additional details about the action
  details: {
    // Previous state (for updates)
    previousState: {
      type: mongoose.Schema.Types.Mixed
    },
    // New state (for updates)
    newState: {
      type: mongoose.Schema.Types.Mixed
    },
    // Reason for the action (e.g., rejection reason)
    reason: String,
    // Additional notes
    notes: String
  },
  // Request metadata
  metadata: {
    ipAddress: String,
    userAgent: String,
    requestId: String
  },
  // Severity level for filtering
  severity: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'low'
  }
}, {
  timestamps: true
});

// Indexes for faster queries
adminLogSchema.index({ action: 1 });
adminLogSchema.index({ targetId: 1 });
adminLogSchema.index({ performedBy: 1 });
adminLogSchema.index({ createdAt: -1 });
adminLogSchema.index({ severity: 1 });

/**
 * Static method to log an admin action
 * @param {Object} logData - Log entry data
 * @returns {Promise<AdminLog>} - Created log entry
 */
adminLogSchema.statics.logAction = async function(logData) {
  const log = new this({
    action: logData.action,
    targetId: logData.targetId,
    targetType: logData.targetType,
    performedBy: logData.performedBy,
    details: logData.details || {},
    metadata: logData.metadata || {},
    severity: logData.severity || 'low'
  });

  return log.save();
};

/**
 * Static method to get logs for a specific entity
 * @param {string} targetId - Entity ID
 * @param {string} targetType - Entity type
 */
adminLogSchema.statics.getLogsForEntity = async function(targetId, targetType) {
  return this.find({ targetId, targetType })
    .sort({ createdAt: -1 })
    .populate('performedBy', 'name email');
};

/**
 * Static method to get logs by admin
 * @param {string} adminId - Admin user ID
 * @param {Object} options - Pagination options
 */
adminLogSchema.statics.getLogsByAdmin = async function(adminId, options = {}) {
  const { page = 1, limit = 50 } = options;

  return this.find({ performedBy: adminId })
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit);
};

/**
 * Static method to get recent critical actions
 */
adminLogSchema.statics.getRecentCritical = async function(limit = 20) {
  return this.find({ severity: { $in: ['high', 'critical'] } })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('performedBy', 'name email');
};

/**
 * Static method to generate activity summary
 * @param {Date} startDate - Start of period
 * @param {Date} endDate - End of period
 */
adminLogSchema.statics.getActivitySummary = async function(startDate, endDate) {
  return this.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: '$action',
        count: { $sum: 1 }
      }
    },
    {
      $sort: { count: -1 }
    }
  ]);
};

module.exports = mongoose.model('AdminLog', adminLogSchema);
