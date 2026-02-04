/**
 * BookingRequest Model
 * 
 * Represents rental booking requests from tenants to property owners
 * 
 * Features:
 * - Status tracking (pending/approved/rejected)
 * - Payment status integration
 * - Date range for rental period
 */

const mongoose = require('mongoose');

const bookingRequestSchema = new mongoose.Schema({
  houseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'House',
    required: [true, 'Booking must reference a house']
  },
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Booking must have a tenant']
  },
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Booking must reference an owner']
  },
  // Booking status
  status: {
    type: String,
    enum: {
      values: ['pending', 'approved', 'rejected', 'cancelled', 'completed'],
      message: 'Status must be pending, approved, rejected, cancelled, or completed'
    },
    default: 'pending'
  },
  // Rental period
  startDate: {
    type: Date,
    required: [true, 'Please provide a start date']
  },
  endDate: {
    type: Date,
    required: [true, 'Please provide an end date']
  },
  // Payment tracking
  paymentStatus: {
    type: String,
    enum: {
      values: ['pending', 'paid', 'refunded', 'failed'],
      message: 'Payment status must be pending, paid, refunded, or failed'
    },
    default: 'pending'
  },
  // Reference to payment record
  paymentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Payment'
  },
  // Total amount for the booking
  totalAmount: {
    type: Number,
    required: true,
    min: 0
  },
  // Optional message from tenant
  message: {
    type: String,
    maxlength: [500, 'Message cannot exceed 500 characters']
  },
  // Number of occupants
  occupants: {
    adults: { type: Number, default: 1, min: 1 },
    children: { type: Number, default: 0, min: 0 }
  },
  // Owner's response message
  ownerResponse: {
    message: String,
    respondedAt: Date
  },
  // Cancellation details
  cancellation: {
    cancelledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    reason: String,
    cancelledAt: Date
  },
  // Check-in/check-out tracking
  checkIn: {
    completed: { type: Boolean, default: false },
    timestamp: Date
  },
  checkOut: {
    completed: { type: Boolean, default: false },
    timestamp: Date
  }
}, {
  timestamps: true
});

// Indexes for faster queries
bookingRequestSchema.index({ houseId: 1 });
bookingRequestSchema.index({ tenantId: 1 });
bookingRequestSchema.index({ ownerId: 1 });
bookingRequestSchema.index({ status: 1 });
bookingRequestSchema.index({ createdAt: -1 });
bookingRequestSchema.index({ startDate: 1, endDate: 1 });

/**
 * Validate that end date is after start date
 */
bookingRequestSchema.pre('save', function(next) {
  if (this.endDate <= this.startDate) {
    const error = new Error('End date must be after start date');
    error.statusCode = 400;
    return next(error);
  }
  next();
});

/**
 * Virtual to calculate rental duration in days
 */
bookingRequestSchema.virtual('durationDays').get(function() {
  if (!this.startDate || !this.endDate) return 0;
  const diffTime = Math.abs(this.endDate - this.startDate);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

/**
 * Virtual to calculate rental duration in months
 */
bookingRequestSchema.virtual('durationMonths').get(function() {
  if (!this.startDate || !this.endDate) return 0;
  const months = (this.endDate.getFullYear() - this.startDate.getFullYear()) * 12;
  return months + (this.endDate.getMonth() - this.startDate.getMonth());
});

/**
 * Check if booking dates overlap with existing approved bookings
 */
bookingRequestSchema.statics.hasOverlap = async function(houseId, startDate, endDate, excludeBookingId = null) {
  const query = {
    houseId,
    status: { $in: ['approved', 'pending'] },
    $or: [
      { startDate: { $lt: endDate }, endDate: { $gt: startDate } }
    ]
  };

  if (excludeBookingId) {
    query._id = { $ne: excludeBookingId };
  }

  const overlapping = await this.findOne(query);
  return !!overlapping;
};

/**
 * Get booking summary
 */
bookingRequestSchema.methods.getSummary = function() {
  return {
    id: this._id,
    houseId: this.houseId,
    status: this.status,
    startDate: this.startDate,
    endDate: this.endDate,
    totalAmount: this.totalAmount,
    paymentStatus: this.paymentStatus,
    createdAt: this.createdAt
  };
};

// Ensure virtuals are included in JSON output
bookingRequestSchema.set('toJSON', { virtuals: true });
bookingRequestSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('BookingRequest', bookingRequestSchema);
