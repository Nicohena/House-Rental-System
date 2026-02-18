/**
 * User Routes
 * 
 * Handles user profile endpoints:
 * - GET /api/users/:id - Get user by ID
 * - PATCH /api/users/:id - Update user profile
 * - GET /api/users/:id/preferences - Get user preferences
 * - PATCH /api/users/:id/preferences - Update user preferences
 * - DELETE /api/users/:id - Delete user account
 */

const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/authMiddleware');
const { upload } = require('../controllers/uploadController');
const {
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
} = require('../controllers/userController');

// All routes require authentication
router.use(protect);

// Current user profile aliases
const { getMe, updatePassword } = require('../controllers/authController');
router.get('/me', getMe);
router.patch('/me/password', updatePassword); // Alias for updating password via users/me/password
router.put('/me/password', updatePassword);   // Supporting both PUT and PATCH for password update

// Avatar upload/remove for current user
router.post('/me/avatar', upload.single('avatar'), uploadAvatar);
router.delete('/me/avatar', removeAvatar);

router.route('/:id')
  .get(getUserById)
  .patch(updateUser)
  .delete(deleteUser);

router.route('/:id/preferences')
  .get(getPreferences)
  .patch(updatePreferences);

// Saved homes (wishlist)
router.route('/:id/saved-homes')
  .get(getSavedHomes)
  .post(addSavedHome);

router.route('/:id/saved-homes/:houseId')
  .delete(removeSavedHome);

// Notifications
router.route('/:id/notifications')
  .get(getNotifications);

router.route('/:id/notifications/mark-all-read')
  .patch(markAllNotificationsRead);

router.route('/:id/notifications/:notificationId')
  .patch(markNotificationRead);

module.exports = router;
