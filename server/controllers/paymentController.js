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
const { asyncHandler, ApiError } = require('../middlewares/errorHandler');
const { verifyPaymentWithChapa } = require('../middlewares/chapaMiddleware');
const { PAYMENT_STATUS, logPaymentEvent } = require('../utils/paymentUtils');
const fs = require('fs');

// Helper for file logging
const fileLog = (msg) => {
  try {
    fs.appendFileSync('/tmp/payment_debug.log', `${new Date().toISOString()} - ${msg}\n`);
  } catch (err) {}
};

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
    .populate('houseId', 'title price images')
    .populate('tenantId', 'name email phone')
    .populate('ownerId', 'name email phone');

  if (!booking) {
    fileLog(`[Payment Error] Booking not found: ${bookingId}`);
    throw new ApiError('Booking not found', 404);
  }

  fileLog(`[Payment Info] Booking: ${booking._id}, Status: ${booking.status}, Tenant: ${booking.tenantId}`);

  // Verify booking belongs to user and is approved
  const tenantId = booking.tenantId._id ? booking.tenantId._id.toString() : booking.tenantId.toString();
  const userId = req.user._id.toString();

  if (tenantId !== userId) {
    fileLog(`[Payment Error] Auth mismatch: ${tenantId} !== ${userId}`);
    throw new ApiError('Not authorized to pay for this booking', 403);
  }

  if (booking.status !== 'approved') {
    fileLog(`[Payment Error] Status mismatch: ${booking.status} !== approved`);
    throw new ApiError(`Booking must be approved (current: ${booking.status}) before payment`, 400);
  }

  if (booking.paymentStatus === 'paid') {
    console.log(`[Payment Debug] Already paid: ${booking.paymentStatus}`);
    throw new ApiError('Booking has already been paid', 400);
  }

  // Calculate amounts
  const rentAmount = booking.totalAmount || 0;
  if (rentAmount <= 0) {
    console.log(`[Payment Debug] Invalid rent amount: ${rentAmount}`);
    throw new ApiError('Invalid booking amount. Please contact support.', 400);
  }
  const serviceFee = Math.round(rentAmount * 0.05); // 5% service fee
  const totalAmount = rentAmount + serviceFee;

  console.log(`[Payment] Initiating ${paymentMethod} payment for booking ${bookingId}. Total: ${totalAmount}`);

  // Use Chapa for Ethiopian payments
  if (paymentMethod === 'chapa' || !stripe) {
    return await initiateChapaPayment({
      req, res, booking, totalAmount, rentAmount, serviceFee, returnUrl, callbackUrl
    });
  }

  // Fall back to Stripe for international payments
  return await initiateStripePayment({
    req, res, booking, totalAmount, rentAmount, serviceFee
  });
});

/**
 * Initiate Chapa payment (Ethiopian Payment Gateway)
 * Supports: telebirr, CBE Birr, E-Birr, M-PESA, Awash Birr, YaYa Wallet, bank cards
 */
const initiateChapaPayment = async ({
  req, res, booking, totalAmount, rentAmount, serviceFee, returnUrl, callbackUrl
}) => {
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
    tx_ref: txRef,
    callback_url: callbackUrl || defaultCallbackUrl,
    return_url: returnUrl || defaultReturnUrl
    // Removing `customization` and `meta` completely. 
    // Chapa's internal Vue widget crashes with `checkInGroup` error when parsing them.
  };

  // Only include phone if it looks like a valid Ethiopian number
  if (req.user.phone) {
    const phone = req.user.phone.replace(/\s|-/g, '');
    if (/^(\+251|0)[97]\d{8}$/.test(phone)) {
      chapaPayload.phone_number = phone;
    } else {
      fileLog(`[Payment Info] Omitting invalid phone for Chapa: ${phone}`);
    }
  }

  fileLog(`[Payment Info] Chapa Payload: ${JSON.stringify(chapaPayload)}`);

  try {
    // Initialize Chapa payment
    const response = await axios.post(
      `${CHAPA_BASE_URL}/v1/transaction/initialize`,
      chapaPayload,
      {
        headers: {
          'Authorization': `Bearer ${CHAPA_SECRET_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      }
    );

    fileLog(`[Payment Info] Chapa Response: ${JSON.stringify(response.data)}`);

    if (response.data.status !== 'success') {
      throw new ApiError(response.data.message || 'Failed to initialize Chapa payment', 500);
    }

    // Resolve ownerId (may be populated or plain ObjectId)
    const ownerId = booking.ownerId._id || booking.ownerId;

    fileLog(`[Payment Info] Creating payment record. ownerId=${ownerId}, houseId=${booking.houseId._id}, bookingId=${booking._id}`);

    // Create payment record
    let payment;
    try {
      payment = await Payment.createPaymentRecord({
        userId: req.user._id,
        houseId: booking.houseId._id,
        bookingId: booking._id,
        ownerId,
        amount: totalAmount,
        currency: 'ETB',
        method: 'chapa',
        breakdown: {
          rent: rentAmount,
          total: totalAmount,
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
      fileLog(`[Payment Info] Payment record created: ${payment._id}`);
    } catch (dbErr) {
      fileLog(`[Payment Error] DB Error creating payment: ${dbErr.message}`);
      throw new ApiError('Failed to save payment record: ' + dbErr.message, 500);
    }

    // Store Chapa transaction details
    payment.chapa = {
      txRef,
      checkoutUrl: response.data.data.checkout_url,
      verified: false
    };
    payment.status = PAYMENT_STATUS.PROCESSING;
    await payment.save();

    // Update booking with payment ID
    booking.paymentId = payment._id;
    await booking.save();

    // Log initiation
    await logPaymentEvent({
      action: 'PAYMENT_INITIATED',
      paymentId: payment._id,
      userId: req.user._id,
      amount: totalAmount,
      method: 'chapa',
      details: { txRef, bookingId: booking._id }
    });

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
    const chapaErrData = error.response?.data;
    fileLog(`[Payment Error] Chapa Error: ${JSON.stringify(chapaErrData || error.message)}`);
    console.error('[Chapa] Initiation error:', JSON.stringify(chapaErrData || error.message, null, 2));
    
    // Extract meaningful error message from possible object structures
    let message = 'Failed to initiate Chapa payment';
    if (chapaErrData?.message) {
      if (typeof chapaErrData.message === 'string') {
        message = chapaErrData.message;
      } else if (typeof chapaErrData.message === 'object') {
        // Handle nested error objects from Chapa (e.g. { message: { 'customization.title': ['...'] } })
        const values = Object.values(chapaErrData.message);
        message = Array.isArray(values[0]) ? values[0][0] : JSON.stringify(chapaErrData.message);
      }
    } else if (chapaErrData?.errorDetails) {
      message = typeof chapaErrData.errorDetails === 'string' 
        ? chapaErrData.errorDetails 
        : JSON.stringify(chapaErrData.errorDetails);
    }
    
    throw new ApiError(message, error.response?.status || 500);
  }
};

/**
 * Initiate Stripe payment (International)
 */
const initiateStripePayment = async ({
  req, res, booking, totalAmount, rentAmount, serviceFee
}) => {
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
        total: totalAmount,
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
    payment.status = PAYMENT_STATUS.PROCESSING;
    await payment.save();

    booking.paymentId = payment._id;
    await booking.save();

    // Log initiation
    await logPaymentEvent({
      action: 'PAYMENT_INITIATED',
      paymentId: payment._id,
      userId: req.user._id,
      amount: totalAmount,
      currency: 'USD',
      method: 'stripe',
      details: { paymentIntentId: paymentIntent.id, bookingId: booking._id }
    });

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
    console.error('[Stripe] Error:', stripeError);
    throw new ApiError('Failed to create Stripe payment intent', 500);
  }
};

/**
 * @desc    Handle Chapa webhook events
 * @route   POST /api/payments/chapa/webhook
 * @access  Public (Chapa)
 */
const handleChapaWebhook = asyncHandler(async (req, res) => {
  const { tx_ref, reference, payment_type } = req.body;

  console.log(`[Chapa Webhook] Received: tx_ref=${tx_ref}, reference=${reference}`);

  if (!tx_ref) {
    return res.status(400).json({ success: false, message: 'Missing tx_ref' });
  }

  // Find payment by transaction reference
  const payment = await Payment.findByChapaRef(tx_ref);

  if (!payment) {
    console.error(`[Chapa Webhook] Payment not found for tx_ref: ${tx_ref}`);
    return res.status(404).json({ success: false, message: 'Payment record not found' });
  }

  // Verification helper to avoid duplicate logic
  const verifyAndProcess = async () => {
    const verification = await verifyPaymentWithChapa(tx_ref);

    if (!verification.success || !verification.verified) {
      console.error(`[Chapa Webhook] Verification failed for ${tx_ref}:`, verification.error);
      
      payment.status = PAYMENT_STATUS.FAILED;
      payment.chapa.chapaResponse = verification.data || { error: verification.error };
      await payment.save();

      await BookingRequest.findByIdAndUpdate(payment.bookingId, { paymentStatus: 'failed' });

      await logPaymentEvent({
        action: 'PAYMENT_FAILED',
        paymentId: payment._id,
        userId: payment.userId,
        amount: payment.amount,
        method: 'chapa',
        details: { txRef: tx_ref, error: verification.error },
        severity: 'high'
      });

      return { success: false, message: 'Verification failed' };
    }

    // Success
    payment.status = PAYMENT_STATUS.SUCCEEDED;
    payment.paidAt = new Date();
    payment.transactionId = reference || verification.data?.reference;
    payment.chapa = {
      ...payment.chapa,
      verified: true,
      paymentMethod: payment_type || verification.data?.payment_type,
      chapaResponse: verification.data
    };
    await payment.save();

    await BookingRequest.findByIdAndUpdate(payment.bookingId, { paymentStatus: 'paid' });

    await logPaymentEvent({
      action: 'PAYMENT_PROCESSED',
      paymentId: payment._id,
      userId: payment.userId,
      amount: payment.amount,
      method: 'chapa',
      details: { txRef: tx_ref, paymentType: payment.chapa.paymentMethod }
    });

    return { success: true };
  };

  const result = await verifyAndProcess();

  // Notify via Socket.io
  const io = req.app.get('io');
  if (io) {
    const eventName = result.success ? 'payment:success' : 'payment:failed';
    io.to(`user_${payment.userId}`).emit(eventName, {
      paymentId: payment._id,
      amount: payment.amount,
      message: result.success ? 'Payment verified successfully!' : 'Payment verification failed'
    });

    if (result.success) {
      io.to(`user_${payment.ownerId}`).emit('payment:received', {
        paymentId: payment._id,
        amount: payment.amount,
        tenantId: payment.userId,
        message: 'You have received a new rental payment!'
      });
    }
  }

  res.status(200).json(result);
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
    throw new ApiError('Not authorized to view this payment status', 403);
  }

  // If payment is processing via Chapa, verify current status
  if (payment.method === 'chapa' && payment.status === PAYMENT_STATUS.PROCESSING && payment.chapa?.txRef) {
    const verification = await verifyPaymentWithChapa(payment.chapa.txRef);
    
    if (verification.verified) {
      payment.status = PAYMENT_STATUS.SUCCEEDED;
      payment.paidAt = new Date();
      payment.chapa.verified = true;
      payment.chapa.chapaResponse = verification.data;
      await payment.save();

      await BookingRequest.findByIdAndUpdate(payment.bookingId, { paymentStatus: 'paid' });

      await logPaymentEvent({
        action: 'PAYMENT_PROCESSED',
        paymentId: payment._id,
        userId: payment.userId,
        amount: payment.amount,
        method: 'chapa',
        details: { txRef: payment.chapa.txRef, source: 'polling' }
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
    [PAYMENT_STATUS.PENDING]: [PAYMENT_STATUS.PROCESSING, PAYMENT_STATUS.FAILED, PAYMENT_STATUS.CANCELLED],
    [PAYMENT_STATUS.PROCESSING]: [PAYMENT_STATUS.SUCCEEDED, PAYMENT_STATUS.FAILED],
    [PAYMENT_STATUS.SUCCEEDED]: [PAYMENT_STATUS.REFUNDED, PAYMENT_STATUS.PARTIALLY_REFUNDED],
    [PAYMENT_STATUS.FAILED]: [PAYMENT_STATUS.PENDING],
    [PAYMENT_STATUS.REFUNDED]: [],
    [PAYMENT_STATUS.PARTIALLY_REFUNDED]: [],
    [PAYMENT_STATUS.CANCELLED]: []
  };

  if (!validTransitions[payment.status]?.includes(status)) {
    throw new ApiError(`Invalid status transition from ${payment.status} to ${status}`, 400);
  }

  const oldStatus = payment.status;
  payment.status = status;
  
  if (transactionId) {
    payment.transactionId = transactionId;
  }

  if (status === PAYMENT_STATUS.SUCCEEDED) {
    payment.paidAt = new Date();
    await BookingRequest.findByIdAndUpdate(payment.bookingId, { paymentStatus: 'paid' });

    await logPaymentEvent({
      action: 'PAYMENT_PROCESSED',
      paymentId: payment._id,
      userId: req.user?._id || payment.userId,
      amount: payment.amount,
      method: payment.method,
      details: { source: 'manual_update', oldStatus }
    });
  }

  if (status === PAYMENT_STATUS.FAILED) {
    await BookingRequest.findByIdAndUpdate(payment.bookingId, { paymentStatus: 'failed' });

    await logPaymentEvent({
      action: 'PAYMENT_FAILED',
      paymentId: payment._id,
      userId: req.user?._id || payment.userId,
      amount: payment.amount,
      method: payment.method,
      details: { source: 'manual_update', oldStatus },
      severity: 'high'
    });
  }

  await payment.save();

  // Notify user
  const io = req.app.get('io');
  if (io) {
    io.to(`user_${payment.userId}`).emit('payment:update', {
      paymentId: payment._id,
      status,
      amount: payment.amount
    });
  }

  res.status(200).json({
    success: true,
    message: `Payment status updated to ${status}`,
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
    console.error('[Stripe Webhook] Signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  const io = req.app.get('io');

  switch (event.type) {
    case 'payment_intent.succeeded': {
      const paymentIntent = event.data.object;
      const payment = await Payment.findOne({ 'stripe.paymentIntentId': paymentIntent.id });

      if (payment) {
        payment.status = PAYMENT_STATUS.SUCCEEDED;
        payment.paidAt = new Date();
        payment.transactionId = paymentIntent.latest_charge;
        payment.stripe.chargeId = paymentIntent.latest_charge;
        await payment.save();

        await BookingRequest.findByIdAndUpdate(payment.bookingId, { paymentStatus: 'paid' });

        await logPaymentEvent({
          action: 'PAYMENT_PROCESSED',
          paymentId: payment._id,
          userId: payment.userId,
          amount: payment.amount,
          currency: 'USD',
          method: 'stripe',
          details: { paymentIntentId: paymentIntent.id }
        });

        if (io) {
          io.to(`user_${payment.userId}`).emit('payment:success', {
            paymentId: payment._id,
            amount: payment.amount,
            message: 'International payment successful!'
          });
          io.to(`user_${payment.ownerId}`).emit('payment:received', {
            paymentId: payment._id,
            amount: payment.amount,
            tenantId: payment.userId,
            message: 'International payment received!'
          });
        }
      }
      break;
    }

    case 'payment_intent.payment_failed': {
      const failedIntent = event.data.object;
      const payment = await Payment.findOne({ 'stripe.paymentIntentId': failedIntent.id });

      if (payment) {
        payment.status = PAYMENT_STATUS.FAILED;
        await payment.save();

        await BookingRequest.findByIdAndUpdate(payment.bookingId, { paymentStatus: 'failed' });

        await logPaymentEvent({
          action: 'PAYMENT_FAILED',
          paymentId: payment._id,
          userId: payment.userId,
          amount: payment.amount,
          currency: 'USD',
          method: 'stripe',
          details: { error: failedIntent.last_payment_error?.message },
          severity: 'high'
        });

        if (io) {
          io.to(`user_${payment.userId}`).emit('payment:failed', {
            paymentId: payment._id,
            message: 'Stripe payment failed'
          });
        }
      }
      break;
    }

    default:
      console.log(`[Stripe Webhook] Unhandled event type: ${event.type}`);
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

  if (payment.status !== PAYMENT_STATUS.SUCCEEDED) {
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
        amount: Math.round(refundAmount * 100)
      });
      refundId = refund.id;
    } catch (stripeError) {
      console.error('[Stripe] Refund error:', stripeError);
      throw new ApiError('Failed to process Stripe refund', 500);
    }
  } else if (payment.method === 'chapa') {
    // Note: Chapa refunds are currently manual via dashboard
    refundId = `REFUND-MANUAL-${Date.now()}`;
    console.log(`[Chapa] Manual refund requested for ${payment._id}. Reference: ${refundId}`);
  }

  // Update payment record
  await payment.processRefund(refundAmount, reason, refundId);

  // Update booking
  await BookingRequest.findByIdAndUpdate(payment.bookingId, { paymentStatus: 'refunded' });

  // Log refund
  await logPaymentEvent({
    action: 'PAYMENT_REFUNDED',
    paymentId: payment._id,
    userId: req.user._id,
    amount: refundAmount,
    method: payment.method,
    details: { reason, refundId, originalAmount: payment.amount },
    severity: 'high'
  });

  // Notify user via Socket.io
  const io = req.app.get('io');
  if (io) {
    io.to(`user_${payment.userId}`).emit('refund:processed', {
      paymentId: payment._id,
      refundAmount,
      reason,
      message: 'Your refund has been processed.'
    });
  }

  res.status(200).json({
    success: true,
    message: 'Refund processed and recorded successfully',
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

  const filter = {};
  
  // Scoping: tenants see their own, owners see payments for their houses, admins see all
  if (req.user.role === 'admin') {
    // No filter refinement
  } else if (req.user.role === 'owner') {
    filter.ownerId = req.user._id;
  } else {
    filter.userId = req.user._id;
  }

  if (status) filter.status = status;
  if (method) filter.method = method;

  const [payments, total] = await Promise.all([
    Payment.find(filter)
      .populate('houseId', 'title images location')
      .populate('bookingId', 'startDate endDate status')
      .populate('userId', 'name email')
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
    .populate('ownerId', 'name email')
    .populate('userId', 'name email phone');

  if (!payment) {
    throw new ApiError('Payment not found', 404);
  }

  // Authorization check
  const isTenant = payment.userId._id.toString() === req.user._id.toString();
  const isOwner = payment.ownerId._id.toString() === req.user._id.toString();
  const isAdmin = req.user.role === 'admin';

  if (!isTenant && !isOwner && !isAdmin) {
    throw new ApiError('Not authorized to access this payment record', 403);
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
