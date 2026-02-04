/**
 * Payment Model
 * 
 * Represents payment transactions in the Smart Rental System
 * Supports multiple payment gateways:
 * - Stripe (International)
 * - Chapa (Ethiopian payments - mobile money, telebirr, E-Birr, YaYa Wallet)
 * 
 * Features:
 * - Multiple payment methods support
 * - Status tracking through payment lifecycle
 * - Refund handling
 * - Integration with booking system
 */

const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  // User who made the payment (tenant)
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Payment must have a user']
  },
  // House being paid for
  houseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'House',
    required: [true, 'Payment must reference a house']
  },
  // Associated booking
  bookingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'BookingRequest',
    required: [true, 'Payment must reference a booking']
  },
  // Owner receiving the payment
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // Payment amount
  amount: {
    type: Number,
    required: [true, 'Payment amount is required'],
    min: [0, 'Amount cannot be negative']
  },
  // Currency code
  currency: {
    type: String,
    default: 'ETB',
    uppercase: true,
    enum: ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'ETB'] // Added ETB for Ethiopian Birr
  },
  // Payment status
  status: {
    type: String,
    enum: {
      values: ['pending', 'processing', 'succeeded', 'failed', 'refunded', 'partially_refunded', 'cancelled'],
      message: 'Invalid payment status'
    },
    default: 'pending'
  },
  // Payment method/gateway
  method: {
    type: String,
    enum: ['stripe', 'paypal', 'chapa', 'bank_transfer', 'cash'],
    default: 'chapa'
  },
  // Transaction ID from payment gateway
  transactionId: {
    type: String,
    index: true
  },
  // Stripe-specific fields
  stripe: {
    paymentIntentId: String,
    chargeId: String,
    customerId: String,
    paymentMethodId: String,
    clientSecret: String
  },
  // PayPal-specific fields
  paypal: {
    orderId: String,
    captureId: String,
    payerId: String
  },
  // Chapa-specific fields (Ethiopian Payment Gateway)
  chapa: {
    // Chapa transaction reference (tx_ref)
    txRef: {
      type: String,
      index: true
    },
    // Chapa checkout URL for redirect
    checkoutUrl: String,
    // Chapa payment method used
    paymentMethod: {
      type: String,
      enum: ['telebirr', 'cbe_birr', 'ebirr', 'mpesa', 'awash_birr', 'yayawallet', 'bank_card', 'mobile_money', null]
    },
    // Chapa verification status
    verified: {
      type: Boolean,
      default: false
    },
    // Chapa response data
    chapaResponse: {
      type: mongoose.Schema.Types.Mixed
    }
  },
  // Breakdown of charges
  breakdown: {
    rent: { type: Number, default: 0 },
    deposit: { type: Number, default: 0 },
    serviceFee: { type: Number, default: 0 },
    taxes: { type: Number, default: 0 },
    discount: { type: Number, default: 0 }
  },
  // Refund information
  refund: {
    amount: { type: Number, default: 0 },
    reason: String,
    refundedAt: Date,
    refundId: String // Generic refund ID (works for any gateway)
  },
  // Payment metadata
  metadata: {
    ipAddress: String,
    userAgent: String,
    description: String,
    // Customer details for Chapa
    customerEmail: String,
    customerPhone: String,
    customerName: String,
    // Callback URLs
    callbackUrl: String,
    returnUrl: String
  },
  // Timestamp when payment was completed
  paidAt: Date,
  // Invoice/receipt number
  invoiceNumber: {
    type: String,
    unique: true,
    sparse: true
  }
}, {
  timestamps: true
});

// Indexes for faster queries
// Note: transactionId, chapa.txRef, and invoiceNumber already have indexes from field definitions
paymentSchema.index({ userId: 1 });
paymentSchema.index({ houseId: 1 });
paymentSchema.index({ bookingId: 1 });
paymentSchema.index({ ownerId: 1 });
paymentSchema.index({ status: 1 });
paymentSchema.index({ method: 1 });
paymentSchema.index({ 'stripe.paymentIntentId': 1 });
paymentSchema.index({ createdAt: -1 });

/**
 * Pre-save middleware to generate invoice number
 */
paymentSchema.pre('save', async function(next) {
  if (!this.invoiceNumber && this.status === 'succeeded') {
    // Generate invoice number: INV-YYYYMMDD-XXXXX
    const date = new Date();
    const dateStr = date.toISOString().split('T')[0].replace(/-/g, '');
    const random = Math.floor(10000 + Math.random() * 90000);
    this.invoiceNumber = `INV-${dateStr}-${random}`;
  }
  next();
});

/**
 * Static method to create payment record
 */
paymentSchema.statics.createPaymentRecord = async function(paymentData) {
  const payment = new this({
    userId: paymentData.userId,
    houseId: paymentData.houseId,
    bookingId: paymentData.bookingId,
    ownerId: paymentData.ownerId,
    amount: paymentData.amount,
    currency: paymentData.currency || 'ETB',
    method: paymentData.method || 'chapa',
    breakdown: paymentData.breakdown || {},
    metadata: paymentData.metadata || {}
  });

  return payment.save();
};

/**
 * Instance method to process successful payment
 */
paymentSchema.methods.markAsSucceeded = async function(gatewayData = {}) {
  this.status = 'succeeded';
  this.paidAt = new Date();
  
  // Store transaction ID
  if (gatewayData.transactionId) {
    this.transactionId = gatewayData.transactionId;
  }

  // Stripe-specific
  if (gatewayData.chargeId) {
    this.stripe.chargeId = gatewayData.chargeId;
  }

  // Chapa-specific
  if (gatewayData.chapaResponse) {
    this.chapa.chapaResponse = gatewayData.chapaResponse;
    this.chapa.verified = true;
    if (gatewayData.paymentMethod) {
      this.chapa.paymentMethod = gatewayData.paymentMethod;
    }
  }

  return this.save();
};

/**
 * Instance method to process refund
 */
paymentSchema.methods.processRefund = async function(amount, reason, refundId) {
  const refundAmount = amount || this.amount;
  
  this.refund = {
    amount: refundAmount,
    reason,
    refundedAt: new Date(),
    refundId
  };

  this.status = refundAmount >= this.amount ? 'refunded' : 'partially_refunded';

  return this.save();
};

/**
 * Static method to find payment by Chapa transaction reference
 */
paymentSchema.statics.findByChapaRef = async function(txRef) {
  return this.findOne({ 'chapa.txRef': txRef });
};

/**
 * Static method to get payment analytics
 */
paymentSchema.statics.getAnalytics = async function(ownerId, startDate, endDate) {
  const match = {
    status: 'succeeded',
    paidAt: { $gte: startDate, $lte: endDate }
  };

  if (ownerId) {
    match.ownerId = new mongoose.Types.ObjectId(ownerId);
  }

  return this.aggregate([
    { $match: match },
    {
      $group: {
        _id: '$method',
        totalRevenue: { $sum: '$amount' },
        totalTransactions: { $sum: 1 },
        averageAmount: { $avg: '$amount' },
        totalRefunds: {
          $sum: { $ifNull: ['$refund.amount', 0] }
        }
      }
    }
  ]);
};

/**
 * Get payment summary for receipts
 */
paymentSchema.methods.getReceipt = function() {
  return {
    invoiceNumber: this.invoiceNumber,
    transactionId: this.transactionId,
    amount: this.amount,
    currency: this.currency,
    status: this.status,
    breakdown: this.breakdown,
    paidAt: this.paidAt,
    method: this.method,
    paymentMethod: this.method === 'chapa' ? this.chapa.paymentMethod : null
  };
};

module.exports = mongoose.model('Payment', paymentSchema);
