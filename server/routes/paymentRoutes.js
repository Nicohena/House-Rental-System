/**
 * Payment Routes
 * 
 * Handles payment endpoints:
 * - POST /api/payments/initiate - Initiate payment (Chapa/Stripe)
 * - POST /api/payments/chapa/webhook - Chapa webhook handler
 * - POST /api/payments/stripe/webhook - Stripe webhook handler
 * - GET /api/payments/:id/status - Get payment status
 * - PATCH /api/payments/:id/status - Update payment status
 * - POST /api/payments/:id/refund - Process refund (admin)
 * - GET /api/payments - Get payment history
 * - GET /api/payments/:id - Get payment details
 */

const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/authMiddleware');
const { isAdmin } = require('../middlewares/roleMiddleware');
const { verifyChapaWebhook } = require('../middlewares/chapaMiddleware');
const {
  initiatePayment,
  handleChapaWebhook,
  handleStripeWebhook,
  getPaymentStatus,
  updatePaymentStatus,
  processRefund,
  getPaymentHistory,
  getPaymentById
} = require('../controllers/paymentController');

// ===== WEBHOOK ROUTES (Public - no auth) =====

// Chapa webhook (Ethiopian payments)
// Uses optional Chapa signature verification
router.post('/chapa/webhook', verifyChapaWebhook, handleChapaWebhook);

// Stripe webhook (must use raw body)
router.post('/stripe/webhook', express.raw({ type: 'application/json' }), handleStripeWebhook);

// Legacy webhook route (redirects to Chapa by default)
router.post('/webhook', verifyChapaWebhook, handleChapaWebhook);

// ===== PROTECTED ROUTES =====
router.use(protect);

// Initiate payment (Chapa or Stripe)
router.post('/initiate', initiatePayment);

// Payment history
router.get('/', getPaymentHistory);

// Single payment details
router.get('/:id', getPaymentById);

// Payment status (with live verification for Chapa)
router.get('/:id/status', getPaymentStatus);

// Update payment status (admin/system)
router.patch('/:id/status', updatePaymentStatus);

// Process refund (admin only)
router.post('/:id/refund', isAdmin, processRefund);

module.exports = router;
