/**
 * Chapa Webhook Verification Middleware
 * 
 * Verifies authenticity of Chapa webhook requests
 * by checking the secret hash header
 */

const crypto = require('crypto');

/**
 * Verify Chapa webhook signature
 * Chapa sends a hash in the 'Chapa-Signature' header
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const verifyChapaWebhook = (req, res, next) => {
  try {
    const chapaSignature = req.headers['chapa-signature'] || req.headers['x-chapa-signature'];
    const secretHash = process.env.CHAPA_WEBHOOK_SECRET;

    // If no webhook secret configured, skip verification (development only)
    if (!secretHash) {
      console.warn('⚠️ CHAPA_WEBHOOK_SECRET not configured - skipping webhook verification');
      return next();
    }

    // If no signature provided
    if (!chapaSignature) {
      console.error('❌ Chapa webhook: No signature provided');
      return res.status(401).json({
        success: false,
        message: 'No webhook signature provided'
      });
    }

    // Get raw body for hash verification
    const rawBody = typeof req.body === 'string' 
      ? req.body 
      : JSON.stringify(req.body);

    // Create HMAC hash of the body using secret
    const hash = crypto
      .createHmac('sha256', secretHash)
      .update(rawBody)
      .digest('hex');

    // Compare signatures
    if (hash !== chapaSignature) {
      console.error('❌ Chapa webhook: Invalid signature');
      return res.status(401).json({
        success: false,
        message: 'Invalid webhook signature'
      });
    }

    // Signature valid, proceed
    console.log('✅ Chapa webhook signature verified');
    next();
  } catch (error) {
    console.error('❌ Chapa webhook verification error:', error);
    return res.status(500).json({
      success: false,
      message: 'Webhook verification failed'
    });
  }
};

/**
 * Alternative verification using transaction reference
 * Verifies payment by calling Chapa API directly
 * 
 * @param {string} txRef - Transaction reference
 * @returns {Promise<Object>} - Verification result
 */
const verifyPaymentWithChapa = async (txRef) => {
  const axios = require('axios');
  
  try {
    const response = await axios.get(
      `${process.env.CHAPA_BASE_URL || 'https://api.chapa.co'}/v1/transaction/verify/${txRef}`,
      {
        headers: {
          'Authorization': `Bearer ${process.env.CHAPA_SECRET_KEY}`
        }
      }
    );

    return {
      success: true,
      verified: response.data.status === 'success',
      data: response.data.data
    };
  } catch (error) {
    console.error('Chapa verification error:', error.response?.data || error.message);
    return {
      success: false,
      verified: false,
      error: error.response?.data?.message || error.message
    };
  }
};

module.exports = {
  verifyChapaWebhook,
  verifyPaymentWithChapa
};
