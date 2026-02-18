/**
 * ChatMessage Model
 * 
 * Represents chat messages between users (tenants and owners)
 * Used with Socket.io for real-time messaging
 * 
 * Features:
 * - Room-based chat organization
 * - Read receipts
 * - Message types (text, image, system)
 */

const mongoose = require('mongoose');

const chatMessageSchema = new mongoose.Schema({
  // Sender user ID
  from: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Message must have a sender']
  },
  // Recipient user ID
  to: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Message must have a recipient']
  },
  // Room ID for grouping conversations
  // Format: sorted combination of user IDs, e.g., "userId1_userId2"
  roomId: {
    type: String,
    required: true,
    index: true
  },
  // Optional reference to a house (if discussing a specific listing)
  houseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'House'
  },
  // Message content
  message: {
    type: String,
    required: [true, 'Message content is required'],
    maxlength: [2000, 'Message cannot exceed 2000 characters']
  },
  // Message type
  messageType: {
    type: String,
    enum: ['text', 'image', 'audio', 'file', 'system'],
    default: 'text'
  },
  // Attachment URL (for image/file messages)
  attachment: {
    url: String,
    fileName: String,
    fileSize: Number,
    mimeType: String
  },
  // Read status
  read: {
    type: Boolean,
    default: false
  },
  readAt: {
    type: Date
  },
  // Delivery status
  delivered: {
    type: Boolean,
    default: false
  },
  deliveredAt: {
    type: Date
  },
  // Soft delete (hide from user but keep in DB)
  deletedFor: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }]
}, {
  timestamps: true
});

// Indexes for faster queries
chatMessageSchema.index({ from: 1 });
chatMessageSchema.index({ to: 1 });
chatMessageSchema.index({ roomId: 1, createdAt: -1 });
chatMessageSchema.index({ houseId: 1 });
chatMessageSchema.index({ read: 1, to: 1 });

/**
 * Static method to generate consistent room ID
 * Always sorts user IDs to ensure same room regardless of who initiates
 * @param {string} userId1 - First user ID
 * @param {string} userId2 - Second user ID
 * @returns {string} - Consistent room ID
 */
chatMessageSchema.statics.generateRoomId = function(userId1, userId2) {
  const ids = [userId1.toString(), userId2.toString()].sort();
  return `${ids[0]}_${ids[1]}`;
};

/**
 * Static method to get conversation between two users
 * @param {string} userId1 - First user ID
 * @param {string} userId2 - Second user ID
 * @param {Object} options - Pagination options
 */
chatMessageSchema.statics.getConversation = async function(userId1, userId2, options = {}) {
  const { page = 1, limit = 50 } = options;
  const roomId = this.generateRoomId(userId1, userId2);

  return this.find({
    roomId,
    deletedFor: { $ne: userId1 } // Don't show messages deleted by requesting user
  })
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .populate('from', 'name avatar')
    .populate('to', 'name avatar');
};

/**
 * Static method to get all conversations for a user
 * Returns the last message from each unique conversation
 * @param {string} userId - User ID
 */
chatMessageSchema.statics.getConversationList = async function(userId) {
  return this.aggregate([
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
              { $and: [{ $eq: ['$to', userId] }, { $eq: ['$read', false] }] },
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
};

/**
 * Static method to mark messages as read
 * @param {string} roomId - Room ID
 * @param {string} userId - ID of the user who read the messages
 */
chatMessageSchema.statics.markAsRead = async function(roomId, userId) {
  return this.updateMany(
    {
      roomId,
      to: userId,
      read: false
    },
    {
      $set: {
        read: true,
        readAt: new Date()
      }
    }
  );
};

/**
 * Static method to get unread message count for a user
 * @param {string} userId - User ID
 */
chatMessageSchema.statics.getUnreadCount = async function(userId) {
  return this.countDocuments({
    to: userId,
    read: false
  });
};

module.exports = mongoose.model('ChatMessage', chatMessageSchema);
