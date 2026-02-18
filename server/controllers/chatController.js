/**
 * Chat Controller
 * 
 * Handles chat message operations:
 * - Send messages
 * - Get chat history
 * - Get conversation list
 * - Mark messages as read
 * 
 * NOTE: Real-time messaging is handled via Socket.io in socketHandlers.js
 * This controller handles REST API operations for chat persistence
 */

const ChatMessage = require('../models/ChatMessage');
const User = require('../models/User');
const logger = require('../utils/logger');
const { asyncHandler, ApiError } = require('../middlewares/errorHandler');

/**
 * @desc    Send a new chat message
 * @route   POST /api/chat
 * @access  Private
 */
const sendMessage = asyncHandler(async (req, res) => {
  const { to, message, houseId, messageType = 'text' } = req.body;

  if (!to || !message) {
    throw new ApiError('Please provide recipient (to) and message', 400);
  }

  // Validate recipient exists
  const recipient = await User.findById(to);
  if (!recipient) {
    throw new ApiError('Recipient not found', 404);
  }

  // Prevent sending message to self
  if (to === req.user._id.toString()) {
    throw new ApiError('Cannot send message to yourself', 400);
  }

  // Generate room ID (consistent for both users)
  const roomId = ChatMessage.generateRoomId(req.user._id, to);

  // Create message
  const chatMessage = await ChatMessage.create({
    from: req.user._id,
    to,
    roomId,
    houseId,
    message,
    messageType
  });

  // Populate sender info
  await chatMessage.populate('from', 'name avatar');

  // Emit real-time message via Socket.io
  const io = req.io;
  if (io) {
    // Send to recipient
    io.to(`user_${to}`).emit('newMessage', {
      roomId,
      message: chatMessage
    });
  }

  res.status(201).json({
    success: true,
    message: 'Message sent successfully',
    data: { chatMessage }
  });
});

/**
 * @desc    Get chat history for a room
 * @route   GET /api/chat/:roomId
 * @access  Private
 */
const getChatHistory = asyncHandler(async (req, res) => {
  const { roomId } = req.params;
  const { page = 1, limit = 50 } = req.query;

  // Verify user is part of this room
  const userIds = roomId.split('_');
  if (!userIds.includes(req.user._id.toString())) {
    throw new ApiError('Not authorized to view this conversation', 403);
  }

  const skip = (Number(page) - 1) * Number(limit);

  const [messages, total] = await Promise.all([
    ChatMessage.find({
      roomId,
      deletedFor: { $ne: req.user._id }
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .populate('from', 'name avatar')
      .populate('to', 'name avatar'),
    ChatMessage.countDocuments({
      roomId,
      deletedFor: { $ne: req.user._id }
    })
  ]);

  // Mark messages as read
  await ChatMessage.markAsRead(roomId, req.user._id);

  res.status(200).json({
    success: true,
    data: {
      messages: messages.reverse(), // Return in chronological order
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
 * @desc    Get all conversations for current user
 * @route   GET /api/chat
 * @access  Private
 */
const getConversations = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  // Get unique conversations with last message
  const conversations = await ChatMessage.aggregate([
    {
      $match: {
        $or: [{ from: userId }, { to: userId }],
        deletedFor: { $ne: userId }
      }
    },
    {
      $sort: { createdAt: -1 }
    },
    {
      $group: {
        _id: '$roomId',
        lastMessage: { $first: '$$ROOT' },
        unreadCount: {
          $sum: {
            $cond: [
              { 
                $and: [
                  { $eq: ['$to', userId] }, 
                  { $eq: ['$read', false] }
                ] 
              },
              1,
              0
            ]
          }
        }
      }
    },
    {
      $sort: { 'lastMessage.createdAt': -1 }
    }
  ]);

  // Populate participant info
  const populatedConversations = await Promise.all(
    conversations.map(async (conv) => {
      const otherUserId = conv._id.split('_').find(id => id !== userId.toString());
      const otherUser = await User.findById(otherUserId).select('name avatar');

      return {
        roomId: conv._id,
        participant: otherUser,
        lastMessage: {
          message: conv.lastMessage.message,
          timestamp: conv.lastMessage.createdAt,
          isFromMe: conv.lastMessage.from.toString() === userId.toString()
        },
        unreadCount: conv.unreadCount
      };
    })
  );

  res.status(200).json({
    success: true,
    data: { conversations: populatedConversations }
  });
});

/**
 * @desc    Mark messages as read
 * @route   PATCH /api/chat/:roomId/read
 * @access  Private
 */
const markAsRead = asyncHandler(async (req, res) => {
  const { roomId } = req.params;

  // Verify user is part of this room
  const userIds = roomId.split('_');
  if (!userIds.includes(req.user._id.toString())) {
    throw new ApiError('Not authorized', 403);
  }

  const result = await ChatMessage.markAsRead(roomId, req.user._id);

  // Notify sender that messages were read (SOCKET.IO INTEGRATION)
  const io = req.io;
  if (io) {
    const otherUserId = userIds.find(id => id !== req.user._id.toString());
    io.to(`user_${otherUserId}`).emit('messagesRead', {
      roomId,
      readBy: req.user._id
    });
  }

  res.status(200).json({
    success: true,
    message: 'Messages marked as read',
    data: { modifiedCount: result.modifiedCount }
  });
});

/**
 * @desc    Get unread message count
 * @route   GET /api/chat/unread
 * @access  Private
 */
const getUnreadCount = asyncHandler(async (req, res) => {
  const count = await ChatMessage.getUnreadCount(req.user._id);

  res.status(200).json({
    success: true,
    data: { unreadCount: count }
  });
});

/**
 * @desc    Delete a message (soft delete for user)
 * @route   DELETE /api/chat/message/:messageId
 * @access  Private
 */
const deleteMessage = asyncHandler(async (req, res) => {
  const { messageId } = req.params;

  const message = await ChatMessage.findById(messageId);

  if (!message) {
    throw new ApiError('Message not found', 404);
  }

  // Check if user is sender or recipient
  if (
    message.from.toString() !== req.user._id.toString() &&
    message.to.toString() !== req.user._id.toString()
  ) {
    throw new ApiError('Not authorized to delete this message', 403);
  }

  // Soft delete (only hide from this user)
  await ChatMessage.findByIdAndUpdate(messageId, {
    $addToSet: { deletedFor: req.user._id }
  });

  res.status(200).json({
    success: true,
    message: 'Message deleted successfully'
  });
});

module.exports = {
  sendMessage,
  getChatHistory,
  getConversations,
  markAsRead,
  getUnreadCount,
  deleteMessage
};
