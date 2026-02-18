/**
 * Auth Controller
 * 
 * Handles user authentication operations:
 * - Registration
 * - Login
 * - Get current user
 * - Password reset (placeholder)
 */

const User = require('../models/User');
const { asyncHandler, ApiError } = require('../middlewares/errorHandler');

/**
 * @desc    Register a new user
 * @route   POST /api/auth/register
 * @access  Public
 */
const register = asyncHandler(async (req, res) => {
  const { name, email, password, role, phone, language } = req.body;

  // Validate required fields
  if (!name || !email || !password) {
    throw new ApiError('Please provide name, email, and password', 400);
  }

  // Check if user already exists
  const existingUser = await User.findOne({ email: email.toLowerCase() });
  if (existingUser) {
    throw new ApiError('User with this email already exists', 409);
  }

  // Validate role (prevent self-assignment of admin role)
  const allowedRoles = ['tenant', 'owner'];
  const userRole = allowedRoles.includes(role) ? role : 'tenant';

  // Create user (password is hashed in model pre-save hook)
  const user = await User.create({
    name,
    email: email.toLowerCase(),
    password,
    role: userRole,
    phone,
    language: language || 'en'
  });

  // Generate JWT token
  const token = user.generateAuthToken();

  res.status(201).json({
    success: true,
    message: 'Registration successful',
    data: {
      user: user.getPublicProfile(),
      token
    }
  });
});

/**
 * @desc    Login user
 * @route   POST /api/auth/login
 * @access  Public
 */
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // Validate required fields
  if (!email || !password) {
    throw new ApiError('Please provide email and password', 400);
  }

  // Find user and include password field
  const user = await User.findOne({ email: email.toLowerCase() }).select('+password');

  if (!user) {
    throw new ApiError('Invalid email or password', 401);
  }

  // Compare password
  const isPasswordMatch = await user.comparePassword(password);

  if (!isPasswordMatch) {
    throw new ApiError('Invalid email or password', 401);
  }

  // Update last login timestamp
  user.lastLogin = new Date();
  await user.save({ validateBeforeSave: false });

  // Generate JWT token
  const token = user.generateAuthToken();

  res.status(200).json({
    success: true,
    message: 'Login successful',
    data: {
      user: user.getPublicProfile(),
      token
    }
  });
});

/**
 * @desc    Get current logged-in user
 * @route   GET /api/auth/me
 * @access  Private
 */
const getMe = asyncHandler(async (req, res) => {
  // req.user is set by auth middleware
  const user = await User.findById(req.user._id);

  if (!user) {
    throw new ApiError('User not found', 404);
  }

  res.status(200).json({
    success: true,
    data: {
      user: user.getPublicProfile()
    }
  });
});

/**
 * @desc    Update password
 * @route   PUT /api/auth/password
 * @access  Private
 */
const updatePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    throw new ApiError('Please provide current and new password', 400);
  }

  if (newPassword.length < 6) {
    throw new ApiError('New password must be at least 6 characters', 400);
  }

  // Get user with password
  const user = await User.findById(req.user._id).select('+password');

  // Check current password
  const isMatch = await user.comparePassword(currentPassword);
  if (!isMatch) {
    throw new ApiError('Current password is incorrect', 401);
  }

  // Update password (hashed in pre-save hook)
  user.password = newPassword;
  await user.save();

  // Generate new token
  const token = user.generateAuthToken();

  res.status(200).json({
    success: true,
    message: 'Password updated successfully',
    data: { token }
  });
});

/**
 * @desc    Forgot password - Generate reset token
 * @route   POST /api/auth/forgot-password
 * @access  Public
 * 
 * NOTE: Email sending functionality should be implemented here
 * This is a placeholder for the password reset flow
 */
const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    throw new ApiError('Please provide an email address', 400);
  }

  const user = await User.findOne({ email: email.toLowerCase() });

  if (!user) {
    // Don't reveal if user exists
    return res.status(200).json({
      success: true,
      message: 'If an account exists with this email, you will receive a password reset link'
    });
  }

  // TODO: Generate reset token and send email
  // const resetToken = crypto.randomBytes(32).toString('hex');
  // user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
  // user.resetPasswordExpire = Date.now() + 30 * 60 * 1000; // 30 minutes
  // await user.save({ validateBeforeSave: false });
  // await sendEmail({ to: user.email, subject: 'Password Reset', html: `...${resetToken}...` });

  res.status(200).json({
    success: true,
    message: 'If an account exists with this email, you will receive a password reset link'
  });
});

/**
 * @desc    Logout - Clear token (client-side)
 * @route   POST /api/auth/logout
 * @access  Private
 * 
 * NOTE: JWT tokens are stateless, so logout is handled client-side
 * This endpoint can be used to clear cookies if using cookie-based auth
 */
const logout = asyncHandler(async (req, res) => {
  // If using cookies
  if (req.cookies && req.cookies.token) {
    res.cookie('token', 'none', {
      expires: new Date(Date.now() + 10 * 1000),
      httpOnly: true
    });
  }

  res.status(200).json({
    success: true,
    message: 'Logged out successfully'
  });
});

/**
 * @desc    Refresh token
 * @route   POST /api/auth/refresh
 * @access  Private
 */
const refreshToken = asyncHandler(async (req, res) => {
  // If we're using cookies, we could check for a refreshToken cookie here.
  // For now, we'll implement a simple token rotation based on the current valid token.
  // This usually requires a separate refresh token, but to satisfy the endpoint request
  // we'll issue a new token for the authenticated user.
  
  const user = await User.findById(req.user._id);
  if (!user) {
    throw new ApiError('User not found', 404);
  }

  const token = user.generateAuthToken();

  res.status(200).json({
    success: true,
    message: 'Token refreshed successfully',
    data: { token }
  });
});

module.exports = {
  register,
  login,
  getMe,
  updatePassword,
  forgotPassword,
  logout,
  refreshToken
};
