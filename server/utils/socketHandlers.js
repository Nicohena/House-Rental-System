/**
 * Socket.io Event Handlers
 * 
 * Handles real-time communication for:
 * - Chat messaging
 * - Booking notifications
 * - Status updates
 * - Typing indicators
 * 
 * NOTE: JWT authentication for sockets included
 */

const jwt = require('jsonwebtoken');
const User = require('../models/User');
const ChatMessage = require('../models/ChatMessage');
const logger = require('./logger');

/**
 * Setup Socket.io event handlers
 * 
 * @param {Object} io - Socket.io server instance
 */
const setupSocketHandlers = (io) => {
  // Authentication middleware for sockets
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token || 
                    socket.handshake.headers.authorization?.split(' ')[1];

      if (!token) {
        return next(new Error('Authentication required'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select('-password');

      if (!user) {
        return next(new Error('User not found'));
      }

      // Attach user to socket
      socket.user = user;
      next();
    } catch (error) {
      next(new Error('Invalid token'));
    }
  });

  // Track online users
  // Map<userId, { socketId, lastSeen }>
  const onlineUsers = new Map();

  // Connection handler
  io.on('connection', (socket) => {
    const userId = socket.user._id.toString();
    logger.info(`🔌 User connected: ${socket.user.name} (${userId})`);

    // Add to online users
    onlineUsers.set(userId, {
      socketId: socket.id,
      lastSeen: new Date()
    });

    // Broadcast online status to all users
    io.emit('user-status', {
      userId,
      status: 'online',
      lastSeen: new Date()
    });

    // Join user's personal room for notifications
    socket.join(`user_${userId}`);

    // ===== CHAT EVENTS =====

    /**
     * Get online status of specific users
     * @event get-online-status
     * @param {Array<string>} userIds - List of user IDs to check
     */
    socket.on('get-online-status', (userIds, callback) => {
      if (!Array.isArray(userIds) || typeof callback !== 'function') return;

      const STATUS_MAP = {};
      userIds.forEach(id => {
        if (onlineUsers.has(id)) {
          STATUS_MAP[id] = 'online';
        } else {
          STATUS_MAP[id] = 'offline';
        }
      });
      
      callback(STATUS_MAP);
    });

    /**
     * Join a chat room
     * @event join-room
     * @param {string} roomId - Chat room ID
     */
    socket.on('join-room', async (roomId) => {
      // Verify user is part of this room
      const userIds = roomId.split('_');
      if (!userIds.includes(userId)) {
        socket.emit('error', { message: 'Not authorized to join this room' });
        return;
      }

      socket.join(roomId);
      logger.debug(`User ${socket.user.name} joined room: ${roomId}`);

      // Mark messages as read
      await ChatMessage.markAsRead(roomId, userId);

      // Notify other user that messages were read
      const otherUserId = userIds.find(id => id !== userId);
      io.to(`user_${otherUserId}`).emit('messages-read', {
        roomId,
        readBy: userId
      });
    });

    /**
     * Leave a chat room
     * @event leave-room
     * @param {string} roomId - Chat room ID
     */
    socket.on('leave-room', (roomId) => {
      socket.leave(roomId);
      logger.debug(`User ${socket.user.name} left room: ${roomId}`);
    });

    /**
     * Send a chat message (real-time)
     * @event send-message
     * @param {Object} data - Message data
     */
    socket.on('send-message', async (data) => {
      try {
        const { to, message, houseId, messageType = 'text', attachment, tempId } = data;

        if (!to || !message) {
          socket.emit('error', { message: 'Invalid message data' });
          return;
        }

        // Generate room ID
        const roomId = ChatMessage.generateRoomId(userId, to);

        // Save message to database
        const chatMessage = await ChatMessage.create({
          from: userId,
          to,
          roomId,
          houseId,
          message,
          messageType,
          attachment,
          delivered: true,
          deliveredAt: new Date()
        });

        // Populate sender info
        await chatMessage.populate('from', 'name avatar');

        // Send to recipient (both in room and personal channel)
        socket.to(roomId).emit('receive_message', chatMessage);
        io.to(`user_${to}`).emit('receive_message', chatMessage); // Redundant if both in room, but ensures delivery if not in room but online

        // Send confirmation to sender - include tempId for optimistic UI correlation
        const messageResponse = chatMessage.toObject();
        if (tempId) {
            messageResponse.tempId = tempId;
        }
        socket.emit('message-sent', messageResponse);

      } catch (error) {
        logger.error(`Send message error: ${error.message}`);
        console.error(error);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    /**
     * Typing indicator
     * @event typing
     * @param {Object} data - { roomId, isTyping }
     */
    socket.on('typing', (data) => {
      const { roomId, isTyping } = data;
      socket.to(roomId).emit('user-typing', {
        userId,
        userName: socket.user.name,
        isTyping
      });
    });

    /**
     * Mark messages as read
     * @event mark-read
     * @param {Object} data - { roomId }
     */
    socket.on('mark-read', async (data) => {
      try {
        const { roomId } = data;
        await ChatMessage.markAsRead(roomId, userId);

        // Notify other user
        const userIds = roomId.split('_');
        const otherUserId = userIds.find(id => id !== userId);
        io.to(`user_${otherUserId}`).emit('messages-read', {
          roomId,
          readBy: userId
        });
      } catch (error) {
        logger.error(`Mark read error: ${error.message}`);
      }
    });

    // ===== NOTIFICATION EVENTS =====

    /**
     * Subscribe to booking updates
     * @event subscribe-bookings
     */
    socket.on('subscribe-bookings', () => {
      socket.join(`bookings_${userId}`);
      logger.debug(`User ${socket.user.name} subscribed to booking updates`);
    });

    /**
     * Subscribe to listing updates (for owners)
     * @event subscribe-listings
     */
    socket.on('subscribe-listings', () => {
      if (socket.user.role === 'owner' || socket.user.role === 'admin') {
        socket.join(`listings_${userId}`);
        logger.debug(`User ${socket.user.name} subscribed to listing updates`);
      }
    });

    // ===== PRESENCE EVENTS =====

    /**
     * User status update
     * @event status-update
     * @param {string} status - 'online' | 'away' | 'busy'
     */
    socket.on('status-update', (status) => {
      socket.user.status = status;
      
      // Update map
      if (onlineUsers.has(userId)) {
        const userData = onlineUsers.get(userId);
        userData.status = status;
        onlineUsers.set(userId, userData);
      }

      // Broadcast to relevant users (could be contacts/recent chats)
      io.emit('user-status', {
        userId,
        status
      });
    });

    // ===== DISCONNECT =====

    socket.on('disconnect', (reason) => {
      logger.info(`🔌 User disconnected: ${socket.user.name} - ${reason}`);
      
      // Remove from online users
      onlineUsers.delete(userId);

      // Notify relevant users that this user is offline
      io.emit('user-status', {
        userId,
        status: 'offline',
        lastSeen: new Date()
      });
    });

    // ===== ERROR HANDLING =====

    socket.on('error', (error) => {
      logger.error(`Socket error for user ${socket.user.name}: ${error.message}`);
    });
  });

  // Emit function helpers for use in controllers
  return {
    // Send notification to specific user
    notifyUser: (userId, event, data) => {
      io.to(`user_${userId}`).emit(event, data);
    },

    // Send booking notification
    notifyBooking: (userId, bookingData) => {
      io.to(`user_${userId}`).emit('booking-update', bookingData);
    },

    // Send listing notification
    notifyListing: (userId, listingData) => {
      io.to(`user_${userId}`).emit('listing-update', listingData);
    },

    // Broadcast to all connected users
    broadcast: (event, data) => {
      io.emit(event, data);
    }
  };
};

/**
 * Emit notification to user (called from controllers)
 * 
 * @param {Object} io - Socket.io instance (from req.app.get('io'))
 * @param {string} userId - Target user ID
 * @param {string} event - Event name
 * @param {Object} data - Event data
 */
const emitToUser = (io, userId, event, data) => {
  if (io) {
    io.to(`user_${userId}`).emit(event, data);
  }
};

module.exports = setupSocketHandlers;
module.exports.emitToUser = emitToUser;
