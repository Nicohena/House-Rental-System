/**
 * User Model
 * 
 * Represents users in the Smart Rental System
 * Roles: tenant (renter), owner (landlord), admin (system administrator)
 * 
 * Features:
 * - Password hashing with bcrypt
 * - JWT token generation
 * - Multi-language support (language preference)
 * - User preferences for smart matching
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide a name'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  email: {
    type: String,
    required: [true, 'Please provide an email'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [
      /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
      'Please provide a valid email'
    ]
  },
  password: {
    type: String,
    required: [true, 'Please provide a password'],
    minlength: [6, 'Password must be at least 6 characters'],
    select: false // Don't include password in queries by default
  },
  role: {
    type: String,
    enum: {
      values: ['tenant', 'owner', 'admin'],
      message: 'Role must be tenant, owner, or admin'
    },
    default: 'tenant'
  },
  phone: {
    type: String,
    trim: true,
    match: [/^[+]?[\d\s-()]+$/, 'Please provide a valid phone number']
  },
  verified: {
    type: Boolean,
    default: false
  },
  rating: {
    average: {
      type: Number,
      min: 0,
      max: 5,
      default: 0
    },
    count: {
      type: Number,
      default: 0
    }
  },
  // Multi-language support - store user's preferred language
  language: {
    type: String,
    enum: ['en', 'es', 'fr', 'de', 'zh', 'ar', 'hi', 'pt'],
    default: 'en'
  },
  // User preferences for smart matching algorithm
  preferences: {
    // Price range preference
    priceRange: {
      min: { type: Number, default: 0 },
      max: { type: Number, default: 999999 }
    },
    // Preferred number of rooms
    preferredRooms: {
      min: { type: Number, default: 1 },
      max: { type: Number, default: 10 }
    },
    // Preferred location (city/state)
    preferredLocations: [{
      city: String,
      state: String
    }],
    // Required amenities
    requiredAmenities: [{
      type: String
    }],
    // Maximum distance from preferred coordinates (in km)
    maxDistance: {
      type: Number,
      default: 50
    },
    // Preferred coordinates for location-based matching
    preferredCoordinates: {
      lat: { type: Number },
      lng: { type: Number }
    }
  },
  // Profile image URL
  avatar: {
    type: String,
    default: ''
  },
  // Last login timestamp
  lastLogin: {
    type: Date
  },
  // Password reset fields
  resetPasswordToken: String,
  resetPasswordExpire: Date
}, {
  timestamps: true // Adds createdAt and updatedAt
});

// Index for faster queries
// Note: email index is already created by unique: true on line 28
userSchema.index({ role: 1 });

/**
 * Pre-save middleware to hash password
 * Only runs if password field is modified
 */
userSchema.pre('save', async function(next) {
  // Only hash if password is modified
  if (!this.isModified('password')) {
    return next();
  }

  try {
    // Generate salt and hash password
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

/**
 * Compare entered password with hashed password in database
 * @param {string} enteredPassword - Plain text password to compare
 * @returns {Promise<boolean>} - True if passwords match
 */
userSchema.methods.comparePassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

/**
 * Generate JWT token for authentication
 * @returns {string} - JWT token
 */
userSchema.methods.generateAuthToken = function() {
  return jwt.sign(
    { 
      id: this._id,
      email: this.email,
      role: this.role 
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || '7d' }
  );
};

/**
 * Get public profile (exclude sensitive data)
 * @returns {Object} - User profile without sensitive fields
 */
userSchema.methods.getPublicProfile = function() {
  return {
    id: this._id,
    name: this.name,
    email: this.email,
    role: this.role,
    phone: this.phone,
    verified: this.verified,
    rating: this.rating,
    language: this.language,
    avatar: this.avatar,
    createdAt: this.createdAt
  };
};

module.exports = mongoose.model('User', userSchema);
