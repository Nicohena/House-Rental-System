/**
 * Payment Controller
 * 
 * Handles payment operations with multiple gateway support:
 * - Stripe (International payments)
 * - Chapa (Ethiopian payments - telebirr, E-Birr, YaYa Wallet, mobile money)
 * 
 * Features:
 * - Initiate payments via Chapa or Stripe
 * - Process webhooks from both gateways
 * - Update payment status
 * - Get payment history
 * - Verify payments server-side
 */

const Payment = require('../models/Payment');
const BookingRequest = require('../models/BookingRequest');
const House = require('../models/House');
const AdminLog = require('../models/AdminLog');
const { asyncHandler, ApiError } = require('../middlewares/errorHandler');
const { verifyPaymentWithChapa } = require('../middlewares/chapaMiddleware');

// Conditional Stripe import (may not be needed if using Chapa only)
let stripe;
if (process.env.STRIPE_SECRET_KEY) {
  stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
}

// Axios for Chapa API calls
const axios = require('axios');

// Chapa API configuration
const CHAPA_BASE_URL = process.env.CHAPA_BASE_URL || 'https://api.chapa.co';
const CHAPA_SECRET_KEY = process.env.CHAPA_SECRET_KEY;

/**
 * Generate unique transaction reference for Chapa
 */
const generateTxRef = () => {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `TX-${timestamp}-${random}`.toUpperCase();
};

/**
 * @desc    Initiate a payment for booking (Chapa - Ethiopian payments)
 * @route   POST /api/payments/initiate
 * @access  Private
 */
const initiatePayment = asyncHandler(async (req, res) => {
  const { bookingId, paymentMethod = 'chapa', returnUrl, callbackUrl } = req.body;

  if (!bookingId) {
    throw new ApiError('Please provide bookingId', 400);
  }

  // Get booking details
  const booking = await BookingRequest.findById(bookingId)
    .populate('houseId', 'title price images');

  if (!booking) {
    throw new ApiError('Booking not found', 404);
  }

  // Verify booking belongs to user and is approved
  if (booking.tenantId.toString() !== req.user._id.toString()) {
    throw new ApiError('Not authorized', 403);
  }

  if (booking.status !== 'approved') {
    throw new ApiError('Booking must be approved before payment', 400);
  }

  if (booking.paymentStatus === 'paid') {
    throw new ApiError('Booking has already been paid', 400);
  }

  // Calculate amounts
  const rentAmount = booking.totalAmount;
  const serviceFee = Math.round(rentAmount * 0.05); // 5% service fee
  const totalAmount = rentAmount + serviceFee;

  // Use Chapa for Ethiopian payments
  if (paymentMethod === 'chapa' || !stripe) {
    return await initiateChapaPayment(req, res, booking, totalAmount, rentAmount, serviceFee, returnUrl, callbackUrl);
  }

  // Fall back to Stripe for international payments
  return await initiateStripePayment(req, res, booking, totalAmount, rentAmount, serviceFee);
});

/**
 * Initiate Chapa payment (Ethiopian Payment Gateway)
 * Supports: telebirr, CBE Birr, E-Birr, M-PESA, Awash Birr, YaYa Wallet, bank cards
 */
const initiateChapaPayment = async (req, res, booking, totalAmount, rentAmount, serviceFee, returnUrl, callbackUrl) => {
  if (!CHAPA_SECRET_KEY) {
    throw new ApiError('Chapa payment gateway not configured', 500);
  }

  // Generate unique transaction reference
  const txRef = generateTxRef();

  // Default callback URL if not provided
  const defaultCallbackUrl = `${process.env.SERVER_URL || 'http://localhost:5000'}/api/payments/chapa/webhook`;
  const defaultReturnUrl = `${process.env.CLIENT_URL || 'http://localhost:3000'}/payment/success`;

  // Prepare Chapa payment request
  const chapaPayload = {
    amount: totalAmount.toString(),
    currency: 'ETB',
    email: req.user.email,
    first_name: req.user.name.split(' ')[0] || req.user.name,
    last_name: req.user.name.split(' ').slice(1).join(' ') || 'User',
    phone_number: req.user.phone || '',
    tx_ref: txRef,
    callback_url: callbackUrl || defaultCallbackUrl,
    return_url: returnUrl || defaultReturnUrl,
    'customization[title]': 'Smart Rental System',
    'customization[description]': `Payment for ${booking.houseId.title}`,
    'meta[booking_id]': booking._id.toString(),
    'meta[user_id]': req.user._id.toString(),
    'meta[house_id]': booking.houseId._id.toString()
  };

  try {
    // Initialize Chapa payment
    const response = await axios.post(
      `${CHAPA_BASE_URL}/v1/transaction/initialize`,
      chapaPayload,
      {
        headers: {
          'Authorization': `Bearer ${CHAPA_SECRET_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (response.data.status !== 'success') {
      throw new ApiError(response.data.message || 'Failed to initialize Chapa payment', 500);
    }

    // Create payment record
    const payment = await Payment.createPaymentRecord({
      userId: req.user._id,
      houseId: booking.houseId._id,
      bookingId: booking._id,
      ownerId: booking.ownerId,
      amount: totalAmount,
      currency: 'ETB',
      method: 'chapa',
      breakdown: {
        rent: rentAmount,
        serviceFee,
        deposit: 0,
        taxes: 0
      },
      metadata: {
        description: `Payment for ${booking.houseId.title}`,
        customerEmail: req.user.email,
        customerPhone: req.user.phone,
        customerName: req.user.name,
        callbackUrl: callbackUrl || defaultCallbackUrl,
        returnUrl: returnUrl || defaultReturnUrl
      }
    });

    // Store Chapa transaction details
    payment.chapa = {
      txRef,
      checkoutUrl: response.data.data.checkout_url,
      verified: false
    };
    payment.status = 'processing';
    await payment.save();

    // Update booking with payment ID
    booking.paymentId = payment._id;
    await booking.save();

    res.status(200).json({
      success: true,
      message: 'Chapa payment initiated',
      data: {
        paymentId: payment._id,
        checkoutUrl: response.data.data.checkout_url,
        txRef,
        amount: totalAmount,
        currency: 'ETB',
        breakdown: payment.breakdown
      }
    });

  } catch (error) {
    console.error('Chapa initiation error:', error.response?.data || error.message);
    throw new ApiError(
      error.response?.data?.message || 'Failed to initiate Chapa payment',
      error.response?.status || 500
    );
  }
};

/**
 * Initiate Stripe payment (International)
 */
const initiateStripePayment = async (req, res, booking, totalAmount, rentAmount, serviceFee) => {
  if (!stripe) {
    throw new ApiError('Stripe payment gateway not configured', 500);
  }

  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: totalAmount * 100, // Stripe uses cents
      currency: 'usd',
      metadata: {
        bookingId: booking._id.toString(),
        userId: req.user._id.toString(),
        houseId: booking.houseId._id.toString()
      },
      description: `Rental payment for ${booking.houseId.title}`
    });

    // Create payment record
    const payment = await Payment.createPaymentRecord({
      userId: req.user._id,
      houseId: booking.houseId._id,
      bookingId: booking._id,
      ownerId: booking.ownerId,
      amount: totalAmount,
      currency: 'USD',
      method: 'stripe',
      breakdown: {
        rent: rentAmount,
        serviceFee,
        deposit: 0,
        taxes: 0
      },
      metadata: {
        description: `Rental payment for ${booking.houseId.title}`
      }
    });

    payment.stripe = {
      paymentIntentId: paymentIntent.id,
      clientSecret: paymentIntent.client_secret
    };
    payment.status = 'processing';
    await payment.save();

    booking.paymentId = payment._id;
    await booking.save();

    res.status(200).json({
      success: true,
      message: 'Stripe payment initiated',
      data: {
        paymentId: payment._id,
        clientSecret: paymentIntent.client_secret,
        amount: totalAmount,
        currency: 'USD',
        breakdown: payment.breakdown
      }
    });

  } catch (stripeError) {
    console.error('Stripe error:', stripeError);
    throw new ApiError('Failed to create payment intent', 500);
  }
};

/**
 * @desc    Handle Chapa webhook events
 * @route   POST /api/payments/chapa/webhook
 * @access  Public (Chapa)
 */
const handleChapaWebhook = asyncHandler(async (req, res) => {
  const { tx_ref, status, reference, amount, currency, payment_type } = req.body;

  console.log('📥 Chapa webhook received:', { tx_ref, status, reference });

  if (!tx_ref) {
    return res.status(400).json({ success: false, message: 'Missing tx_ref' });
  }

  // Find payment by transaction reference
  const payment = await Payment.findByChapaRef(tx_ref);

  if (!payment) {
    console.error('Payment not found for tx_ref:', tx_ref);
    return res.status(404).json({ success: false, message: 'Payment not found' });
  }

  // Verify payment with Chapa API (server-side verification)
  const verification = await verifyPaymentWithChapa(tx_ref);

  if (!verification.success || !verification.verified) {
    console.error('Chapa verification failed:', verification.error);
    
    // Update payment as failed
    payment.status = 'failed';
    payment.chapa.chapaResponse = verification.data || { error: verification.error };
    await payment.save();

    // Update booking
    await BookingRequest.findByIdAndUpdate(payment.bookingId, {
      paymentStatus: 'failed'
    });

    // Notify tenant of failure
    const io = req.app.get('io');
    if (io) {
      io.to(`user_${payment.userId}`).emit('paymentFailed', {
        paymentId: payment._id,
        message: 'Payment verification failed'
      });
    }

    return res.status(200).json({ success: false, message: 'Verification failed' });
  }

  // Payment verified successfully
  payment.status = 'succeeded';
  payment.paidAt = new Date();
  payment.transactionId = reference || verification.data?.reference;
  payment.chapa = {
    ...payment.chapa,
    verified: true,
    paymentMethod: payment_type || verification.data?.payment_type,
    chapaResponse: verification.data
  };
  await payment.save();

  // Update booking payment status
  await BookingRequest.findByIdAndUpdate(payment.bookingId, {
    paymentStatus: 'paid'
  });

  // Log payment success
  await AdminLog.logAction({
    action: 'PAYMENT_PROCESSED',
    targetId: payment._id,
    targetType: 'Payment',
    performedBy: payment.userId,
    details: {
      amount: payment.amount,
      currency: payment.currency,
      method: 'chapa',
      paymentType: payment_type || verification.data?.payment_type,
      txRef: tx_ref
    },
    severity: 'low'
  });

  // Notify tenant and owner via Socket.io
  const io = req.app.get('io');
  if (io) {
    // Notify tenant
    io.to(`user_${payment.userId}`).emit('paymentSuccess', {
      paymentId: payment._id,
      amount: payment.amount,
      currency: payment.currency,
      message: 'Payment successful!'
    });

    // Notify owner
    io.to(`user_${payment.ownerId}`).emit('paymentReceived', {
      paymentId: payment._id,
      amount: payment.amount,
      currency: payment.currency,
      tenantId: payment.userId,
      houseId: payment.houseId,
      message: 'You received a payment!'
    });
  }

  res.status(200).json({ success: true, message: 'Payment verified and processed' });
});

/**
 * @desc    Get payment status for a booking
 * @route   GET /api/payments/:id/status
 * @access  Private
 */
const getPaymentStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const payment = await Payment.findById(id)
    .populate('bookingId', 'startDate endDate status')
    .populate('houseId', 'title');

  if (!payment) {
    throw new ApiError('Payment not found', 404);
  }

  // Check authorization
  if (
    payment.userId.toString() !== req.user._id.toString() &&
    payment.ownerId.toString() !== req.user._id.toString() &&
    req.user.role !== 'admin'
  ) {
    throw new ApiError('Not authorized', 403);
  }

  // If payment is processing via Chapa, verify current status
  if (payment.method === 'chapa' && payment.status === 'processing' && payment.chapa?.txRef) {
    const verification = await verifyPaymentWithChapa(payment.chapa.txRef);
    
    if (verification.verified) {
      payment.status = 'succeeded';
      payment.paidAt = new Date();
      payment.chapa.verified = true;
      payment.chapa.chapaResponse = verification.data;
      await payment.save();

      await BookingRequest.findByIdAndUpdate(payment.bookingId, {
        paymentStatus: 'paid'
      });
    }
  }

  res.status(200).json({
    success: true,
    data: {
      paymentId: payment._id,
      status: payment.status,
      amount: payment.amount,
      currency: payment.currency,
      method: payment.method,
      paymentMethod: payment.chapa?.paymentMethod,
      transactionId: payment.transactionId,
      paidAt: payment.paidAt,
      bookingStatus: payment.bookingId?.status
    }
  });
});

/**
 * @desc    Update payment status (manual/admin)
 * @route   PATCH /api/payments/:id/status
 * @access  Private (admin/system)
 */
const updatePaymentStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status, transactionId } = req.body;

  const payment = await Payment.findById(id);

  if (!payment) {
    throw new ApiError('Payment not found', 404);
  }

  // Validate status transition
  const validTransitions = {
    pending: ['processing', 'failed', 'cancelled'],
    processing: ['succeeded', 'failed'],
    succeeded: ['refunded', 'partially_refunded'],
    failed: ['pending'],
    refunded: [],
    partially_refunded: [],
    cancelled: []
  };

  if (!validTransitions[payment.status]?.includes(status)) {
    throw new ApiError(`Invalid status transition from ${payment.status} to ${status}`, 400);
  }

  payment.status = status;
  
  if (transactionId) {
    payment.transactionId = transactionId;
  }

  if (status === 'succeeded') {
    payment.paidAt = new Date();
    await BookingRequest.findByIdAndUpdate(payment.bookingId, {
      paymentStatus: 'paid'
    });

    await AdminLog.logAction({
      action: 'PAYMENT_PROCESSED',
      targetId: payment._id,
      targetType: 'Payment',
      performedBy: req.user?._id || payment.userId,
      details: { amount: payment.amount, method: payment.method },
      severity: 'low'
    });
  }

  if (status === 'failed') {
    await BookingRequest.findByIdAndUpdate(payment.bookingId, {
      paymentStatus: 'failed'
    });

    await AdminLog.logAction({
      action: 'PAYMENT_FAILED',
      targetId: payment._id,
      targetType: 'Payment',
      performedBy: req.user?._id || payment.userId,
      severity: 'high'
    });
  }

  await payment.save();

  // Notify user
  const io = req.app.get('io');
  if (io) {
    io.to(`user_${payment.userId}`).emit('paymentUpdate', {
      paymentId: payment._id,
      status,
      amount: payment.amount
    });
  }

  res.status(200).json({
    success: true,
    message: 'Payment status updated',
    data: { payment }
  });
});

/**
 * @desc    Handle Stripe webhook (kept for international payments)
 * @route   POST /api/payments/stripe/webhook
 * @access  Public (Stripe)
 */
const handleStripeWebhook = asyncHandler(async (req, res) => {
  if (!stripe) {
    return res.status(400).json({ success: false, message: 'Stripe not configured' });
  }

  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('Stripe webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  switch (event.type) {
    case 'payment_intent.succeeded':
      const paymentIntent = event.data.object;
      const payment = await Payment.findOne({
        'stripe.paymentIntentId': paymentIntent.id
      });

      if (payment) {
        payment.status = 'succeeded';
        payment.paidAt = new Date();
        payment.transactionId = paymentIntent.latest_charge;
        payment.stripe.chargeId = paymentIntent.latest_charge;
        await payment.save();

        await BookingRequest.findByIdAndUpdate(payment.bookingId, {
          paymentStatus: 'paid'
        });
      }
      break;

    case 'payment_intent.payment_failed':
      const failedIntent = event.data.object;
      const failedPayment = await Payment.findOne({
        'stripe.paymentIntentId': failedIntent.id
      });

      if (failedPayment) {
        failedPayment.status = 'failed';
        await failedPayment.save();

        await BookingRequest.findByIdAndUpdate(failedPayment.bookingId, {
          paymentStatus: 'failed'
        });
      }
      break;

    default:
      console.log(`Unhandled Stripe event type: ${event.type}`);
  }

  res.status(200).json({ received: true });
});

/**
 * @desc    Process refund
 * @route   POST /api/payments/:id/refund
 * @access  Private (admin only)
 */
const processRefund = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { amount, reason } = req.body;

  const payment = await Payment.findById(id);

  if (!payment) {
    throw new ApiError('Payment not found', 404);
  }

  if (payment.status !== 'succeeded') {
    throw new ApiError('Can only refund successful payments', 400);
  }

  const refundAmount = amount || payment.amount;

  if (refundAmount > payment.amount) {
    throw new ApiError('Refund amount cannot exceed payment amount', 400);
  }

  let refundId = null;

  // Process refund based on payment method
  if (payment.method === 'stripe' && stripe) {
    try {
      const refund = await stripe.refunds.create({
        payment_intent: payment.stripe.paymentIntentId,
        amount: refundAmount * 100
      });
      refundId = refund.id;
    } catch (stripeError) {
      console.error('Stripe refund error:', stripeError);
      throw new ApiError('Failed to process Stripe refund', 500);
    }
  } else if (payment.method === 'chapa') {
    // Note: Chapa refunds may need to be processed manually or via their dashboard
    // This creates a record of the refund request
    refundId = `REFUND-${Date.now()}`;
    console.log('⚠️ Chapa refund requested - process manually via Chapa dashboard');
  }

  // Update payment record
  await payment.processRefund(refundAmount, reason, refundId);

  // Update booking
  await BookingRequest.findByIdAndUpdate(payment.bookingId, {
    paymentStatus: 'refunded'
  });

  // Log refund
  await AdminLog.logAction({
    action: 'PAYMENT_REFUNDED',
    targetId: payment._id,
    targetType: 'Payment',
    performedBy: req.user._id,
    details: { refundAmount, reason, refundId },
    severity: 'high'
  });

  // Notify user
  const io = req.app.get('io');
  if (io) {
    io.to(`user_${payment.userId}`).emit('refundProcessed', {
      paymentId: payment._id,
      refundAmount,
      reason
    });
  }

  res.status(200).json({
    success: true,
    message: 'Refund processed successfully',
    data: { payment }
  });
});

/**
 * @desc    Get payment history for user
 * @route   GET /api/payments
 * @access  Private
 */
const getPaymentHistory = asyncHandler(async (req, res) => {
  const { status, method, page = 1, limit = 20 } = req.query;
  const skip = (Number(page) - 1) * Number(limit);

  const filter = { userId: req.user._id };
  if (status) filter.status = status;
  if (method) filter.method = method;

  const [payments, total] = await Promise.all([
    Payment.find(filter)
      .populate('houseId', 'title images')
      .populate('bookingId', 'startDate endDate')
      .sort('-createdAt')
      .skip(skip)
      .limit(Number(limit)),
    Payment.countDocuments(filter)
  ]);

  res.status(200).json({
    success: true,
    data: {
      payments,
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
 * @desc    Get single payment details
 * @route   GET /api/payments/:id
 * @access  Private
 */
const getPaymentById = asyncHandler(async (req, res) => {
  const payment = await Payment.findById(req.params.id)
    .populate('houseId', 'title images location')
    .populate('bookingId', 'startDate endDate status')
    .populate('ownerId', 'name email');

  if (!payment) {
    throw new ApiError('Payment not found', 404);
  }

  if (
    payment.userId.toString() !== req.user._id.toString() &&
    payment.ownerId._id.toString() !== req.user._id.toString() &&
    req.user.role !== 'admin'
  ) {
    throw new ApiError('Not authorized', 403);
  }

  res.status(200).json({
    success: true,
    data: { payment }
  });
});

module.exports = {
  initiatePayment,
  handleChapaWebhook,
  handleStripeWebhook,
  getPaymentStatus,
  updatePaymentStatus,
  processRefund,
  getPaymentHistory,
  getPaymentById
};
