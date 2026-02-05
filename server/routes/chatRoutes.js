/**
 * Chat Routes
 * 
 * Handles chat message endpoints:
 * - GET /api/chat - Get all conversations
 * - POST /api/chat - Send message
 * - GET /api/chat/unread - Get unread count
 * - GET /api/chat/:roomId - Get chat history
 * - PATCH /api/chat/:roomId/read - Mark as read
 * - DELETE /api/chat/message/:messageId - Delete message
 * 
 * NOTE: Real-time messaging handled via Socket.io
 */

const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/authMiddleware');
const {
  sendMessage,
  getChatHistory,
  getConversations,
  markAsRead,
  getUnreadCount,
  deleteMessage
} = require('../controllers/chatController');

// All routes require authentication
router.use(protect);

// Chat routes
router.route('/')
  .get(getConversations)
  .post(sendMessage);

// Unread count
router.get('/unread', getUnreadCount);

// Room-specific routes
router.get('/:roomId', getChatHistory);
router.patch('/:roomId/read', markAsRead);

// Message operations
router.delete('/message/:messageId', deleteMessage);

module.exports = router;
