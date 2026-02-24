/**
 * Payment Utilities
 * 
 * Centralized helpers for financial transactions, status mapping,
 * and reliable logging.
 */

const AdminLog = require('../models/AdminLog');

/**
 * Standard Payment Statuses
 */
const PAYMENT_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  SUCCEEDED: 'succeeded',
  FAILED: 'failed',
  REFUNDED: 'refunded',
  PARTIALLY_REFUNDED: 'partially_refunded',
  CANCELLED: 'cancelled'
};

/**
 * Log a financial transaction event
 * @param {Object} params - Logging parameters
 */
const logPaymentEvent = async ({
  action,
  paymentId,
  userId,
  amount,
  currency = 'ETB',
  method,
  details = {},
  severity = 'low'
}) => {
  try {
    await AdminLog.logAction({
      action,
      targetId: paymentId,
      targetType: 'Payment',
      performedBy: userId,
      details: {
        amount,
        currency,
        method,
        ...details
      },
      severity
    });
  } catch (err) {
    console.error(`[PaymentLog Error] Failed to log ${action}:`, err.message);
  }
};

/**
 * Format currency for display
 * @param {number} amount 
 * @param {string} currency 
 * @returns {string}
 */
const formatCurrency = (amount, currency = 'ETB') => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
  }).format(amount);
};

module.exports = {
  PAYMENT_STATUS,
  logPaymentEvent,
  formatCurrency
};
