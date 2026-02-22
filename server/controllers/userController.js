/**
 * User Controller
 * 
 * Handles user profile operations:
 * - Get user by ID
 * - Update user profile
 * - Update user preferences
 */

const User = require('../models/User');
const Recommendation = require('../models/Recommendation');
const { asyncHandler, ApiError } = require('../middlewares/errorHandler');
const House = require('../models/House');

/**
 * @desc    Get user by ID
 * @route   GET /api/users/:id
 * @access  Private
 */
const getUserById = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id).select('-password');

  if (!user) {
    throw new ApiError('User not found', 404);
  }

  // Return full profile for self or admin, limited for others
  const isSelfOrAdmin = 
    req.user._id.toString() === user._id.toString() || 
    req.user.role === 'admin';

  const userData = isSelfOrAdmin 
    ? user.toObject() 
    : user.getPublicProfile();

  res.status(200).json({
    success: true,
    data: { user: userData }
  });
});

/**
 * @desc    Upload user avatar
 * @route   POST /api/users/me/avatar
 * @access  Private
 */
const uploadAvatar = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new ApiError('Please upload an image file', 400);
  }

  const avatarPath = req.file.path;
  
  const user = await User.findByIdAndUpdate(
    req.user._id,
    { avatar: avatarPath },
    { new: true }
  ).select('-password');

  if (!user) {
    throw new ApiError('User not found', 404);
  }

  res.status(200).json({
    success: true,
    message: 'Avatar uploaded successfully',
    data: { 
      avatar: avatarPath,
      user: user.getPublicProfile()
    }
  });
});

/**
 * @desc    Remove user avatar
 * @route   DELETE /api/users/me/avatar
 * @access  Private
 */
const removeAvatar = asyncHandler(async (req, res) => {
  const user = await User.findByIdAndUpdate(
    req.user._id,
    { avatar: null },
    { new: true }
  ).select('-password');

  if (!user) {
    throw new ApiError('User not found', 404);
  }

  res.status(200).json({
    success: true,
    message: 'Avatar removed successfully',
    data: { user: user.getPublicProfile() }
  });
});

/**
 * @desc    Update user profile
 * @route   PATCH /api/users/:id
 * @access  Private (self or admin)
 */
const updateUser = asyncHandler(async (req, res) => {
  const userId = req.params.id;

  // Check authorization (self or admin)
  if (req.user._id.toString() !== userId && req.user.role !== 'admin') {
    throw new ApiError('Not authorized to update this profile', 403);
  }

  // Fields that can be updated
  const allowedUpdates = ['name', 'phone', 'avatar', 'language', 'bio'];
  
  // Admin can update more fields
  if (req.user.role === 'admin') {
    allowedUpdates.push('verified', 'role');
  }

  // Filter request body to allowed fields
  const updates = {};
  Object.keys(req.body).forEach(key => {
    if (allowedUpdates.includes(key)) {
      updates[key] = req.body[key];
    }
  });

  // Update user
  const user = await User.findByIdAndUpdate(
    userId,
    updates,
    { 
      new: true, 
      runValidators: true 
    }
  ).select('-password');

  if (!user) {
    throw new ApiError('User not found', 404);
  }

  res.status(200).json({
    success: true,
    message: 'Profile updated successfully',
    data: { user: user.getPublicProfile() }
  });
});

/**
 * @desc    Update user preferences (for smart matching)
 * @route   PATCH /api/users/:id/preferences
 * @access  Private (self only)
 */
const updatePreferences = asyncHandler(async (req, res) => {
  const userId = req.params.id;

  // Only self can update preferences
  if (req.user._id.toString() !== userId) {
    throw new ApiError('Not authorized to update preferences', 403);
  }

  const { preferences } = req.body;

  if (!preferences) {
    throw new ApiError('Please provide preferences object', 400);
  }

  // Validate preference structure
  const validPreferences = {};

  if (preferences.priceRange) {
    validPreferences['preferences.priceRange'] = {
      min: Math.max(0, preferences.priceRange.min || 0),
      max: Math.min(999999, preferences.priceRange.max || 999999)
    };
  }

  if (preferences.preferredRooms) {
    validPreferences['preferences.preferredRooms'] = {
      min: Math.max(1, preferences.preferredRooms.min || 1),
      max: Math.min(20, preferences.preferredRooms.max || 10)
    };
  }

  if (preferences.preferredLocations) {
    validPreferences['preferences.preferredLocations'] = preferences.preferredLocations;
  }

  if (preferences.requiredAmenities) {
    validPreferences['preferences.requiredAmenities'] = preferences.requiredAmenities;
  }

  if (preferences.maxDistance) {
    validPreferences['preferences.maxDistance'] = Math.max(1, Math.min(500, preferences.maxDistance));
  }

  if (preferences.preferredCoordinates) {
    validPreferences['preferences.preferredCoordinates'] = {
      lat: preferences.preferredCoordinates.lat,
      lng: preferences.preferredCoordinates.lng
    };
  }

  // Update user preferences
  const user = await User.findByIdAndUpdate(
    userId,
    { $set: validPreferences },
    { new: true, runValidators: true }
  ).select('-password');

  if (!user) {
    throw new ApiError('User not found', 404);
  }

  // Mark recommendations as stale (need refresh)
  await Recommendation.markStale(userId);

  res.status(200).json({
    success: true,
    message: 'Preferences updated successfully',
    data: { 
      preferences: user.preferences 
    }
  });
});

/**
 * @desc    Get user's preferences
 * @route   GET /api/users/:id/preferences
 * @access  Private (self only)
 */
const getPreferences = asyncHandler(async (req, res) => {
  const userId = req.params.id;

  // Only self can view preferences
  if (req.user._id.toString() !== userId) {
    throw new ApiError('Not authorized to view preferences', 403);
  }

  const user = await User.findById(userId).select('preferences');

  if (!user) {
    throw new ApiError('User not found', 404);
  }

  res.status(200).json({
    success: true,
    data: { preferences: user.preferences }
  });
});

/**
 * @desc    Delete user account
 * @route   DELETE /api/users/:id
 * @access  Private (self or admin)
 */
const deleteUser = asyncHandler(async (req, res) => {
  const userId = req.params.id;

  // Check authorization
  if (req.user._id.toString() !== userId && req.user.role !== 'admin') {
    throw new ApiError('Not authorized to delete this account', 403);
  }

  const user = await User.findById(userId);

  if (!user) {
    throw new ApiError('User not found', 404);
  }

  // Prevent admin from deleting themselves
  if (user.role === 'admin' && req.user._id.toString() === userId) {
    throw new ApiError('Admins cannot delete their own account', 400);
  }

  await User.findByIdAndDelete(userId);

  // TODO: Handle cascading deletes (houses, bookings, etc.)

  res.status(200).json({
    success: true,
    message: 'Account deleted successfully'
  });
});

/**
 * @desc    Get saved homes (wishlist) for user
 * @route   GET /api/users/:id/saved-homes
 * @access  Private (self only)
 */
const getSavedHomes = asyncHandler(async (req, res) => {
  const userId = req.params.id;

  if (req.user._id.toString() !== userId) {
    throw new ApiError('Not authorized to view saved homes', 403);
  }

  const user = await User.findById(userId).populate({
    path: 'savedHomes',
    select: 'title price location rooms size images verified averageRating'
  });

  if (!user) {
    throw new ApiError('User not found', 404);
  }

  res.status(200).json({
    success: true,
    data: {
      houses: user.savedHomes || []
    }
  });
});

/**
 * @desc    Add a house to user's saved homes
 * @route   POST /api/users/:id/saved-homes
 * @access  Private (self only)
 */
const addSavedHome = asyncHandler(async (req, res) => {
  const userId = req.params.id;
  const { houseId } = req.body;

  if (!houseId) {
    throw new ApiError('Please provide houseId', 400);
  }

  if (req.user._id.toString() !== userId) {
    throw new ApiError('Not authorized to update saved homes', 403);
  }

  const [user, house] = await Promise.all([
    User.findById(userId),
    House.findById(houseId)
  ]);

  if (!user) {
    throw new ApiError('User not found', 404);
  }

  if (!house) {
    throw new ApiError('House not found', 404);
  }

  const alreadySaved = user.savedHomes.some(
    (savedId) => savedId.toString() === houseId
  );

  if (!alreadySaved) {
    user.savedHomes.push(houseId);

    // Add lightweight notification
    user.notifications.unshift({
      type: 'saved_home',
      title: 'Home saved',
      message: `You saved "${house.title}" to your favorites.`,
      metadata: { house: house._id }
    });

    // Keep only the most recent 50 notifications
    if (user.notifications.length > 50) {
      user.notifications = user.notifications.slice(0, 50);
    }

    await user.save();
  }

  res.status(200).json({
    success: true,
    message: 'Home saved successfully',
    data: {
      savedHomes: user.savedHomes
    }
  });
});

/**
 * @desc    Remove a house from user's saved homes
 * @route   DELETE /api/users/:id/saved-homes/:houseId
 * @access  Private (self only)
 */
const removeSavedHome = asyncHandler(async (req, res) => {
  const userId = req.params.id;
  const { houseId } = req.params;

  if (req.user._id.toString() !== userId) {
    throw new ApiError('Not authorized to update saved homes', 403);
  }

  const user = await User.findById(userId);

  if (!user) {
    throw new ApiError('User not found', 404);
  }

  user.savedHomes = (user.savedHomes || []).filter(
    (savedId) => savedId.toString() !== houseId
  );

  await user.save();

  res.status(200).json({
    success: true,
    message: 'Home removed from saved list',
    data: {
      savedHomes: user.savedHomes
    }
  });
});

/**
 * @desc    Get user notifications
 * @route   GET /api/users/:id/notifications
 * @access  Private (self only)
 */
const getNotifications = asyncHandler(async (req, res) => {
  const userId = req.params.id;

  if (req.user._id.toString() !== userId) {
    throw new ApiError('Not authorized to view notifications', 403);
  }

  const user = await User.findById(userId).select('notifications');

  if (!user) {
    throw new ApiError('User not found', 404);
  }

  // Notifications are stored newest-first
  res.status(200).json({
    success: true,
    data: {
      notifications: user.notifications || []
    }
  });
});

/**
 * @desc    Mark a single notification as read
 * @route   PATCH /api/users/:id/notifications/:notificationId
 * @access  Private (self only)
 */
const markNotificationRead = asyncHandler(async (req, res) => {
  const userId = req.params.id;
  const { notificationId } = req.params;

  if (req.user._id.toString() !== userId) {
    throw new ApiError('Not authorized to update notifications', 403);
  }

  const user = await User.findById(userId).select('notifications');

  if (!user) {
    throw new ApiError('User not found', 404);
  }

  const notification = user.notifications.id(notificationId);
  if (!notification) {
    throw new ApiError('Notification not found', 404);
  }

  notification.read = true;
  await user.save();

  res.status(200).json({
    success: true,
    message: 'Notification marked as read'
  });
});

/**
 * @desc    Mark all notifications as read
 * @route   PATCH /api/users/:id/notifications/mark-all-read
 * @access  Private (self only)
 */
const markAllNotificationsRead = asyncHandler(async (req, res) => {
  const userId = req.params.id;

  if (req.user._id.toString() !== userId) {
    throw new ApiError('Not authorized to update notifications', 403);
  }

  const user = await User.findById(userId).select('notifications');

  if (!user) {
    throw new ApiError('User not found', 404);
  }

  user.notifications = (user.notifications || []).map((notif) => {
    notif.read = true;
    return notif;
  });

  await user.save();

  res.status(200).json({
    success: true,
    message: 'All notifications marked as read'
  });
});

module.exports = {
  getUserById,
  uploadAvatar,
  removeAvatar,
  updateUser,
  updatePreferences,
  getPreferences,
  deleteUser,
  getSavedHomes,
  addSavedHome,
  removeSavedHome,
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead
};
