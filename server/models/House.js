/**
 * House Model
 * 
 * Represents rental property listings in the Smart Rental System
 * 
 * Features:
 * - Geospatial coordinates for map integration
 * - Ratings and reviews from tenants
 * - Verified listing badge (admin-approved)
 * - Amenities array for smart matching
 * - Price for fairness comparison
 */

const mongoose = require('mongoose');

// Sub-schema for ratings/reviews
const ratingSchema = new mongoose.Schema({
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  score: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  comment: {
    type: String,
    maxlength: [500, 'Comment cannot exceed 500 characters']
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Sub-schema for location with geospatial support
const locationSchema = new mongoose.Schema({
  address: {
    type: String,
    required: [true, 'Please provide an address'],
    default: ''
  },
  city: {
    type: String,
    required: [true, 'Please provide a city']
  },
  state: {
    type: String,
    required: [true, 'Please provide a state']
  },
  zip: {
    type: String,
    default: ''
  },
  country: {
    type: String,
    default: 'USA'
  },
  // GeoJSON Point for map integration and distance queries
  coordinates: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      index: '2dsphere'
    }
  }
}, { _id: false });

const houseSchema = new mongoose.Schema({
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'House must have an owner']
  },
  title: {
    type: String,
    required: [true, 'Please provide a title'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  description: {
    type: String,
    required: [true, 'Please provide a description'],
    maxlength: [2000, 'Description cannot exceed 2000 characters']
  },
  // Monthly rental price
  price: {
    type: Number,
    required: [true, 'Please provide a price'],
    min: [0, 'Price cannot be negative']
  },
  // Property type
  propertyType: {
    type: String,
    enum: ['apartment', 'house', 'condo', 'townhouse', 'studio', 'room'],
    default: 'apartment'
  },
  // Number of rooms
  rooms: {
    bedrooms: {
      type: Number,
      required: true,
      min: 0
    },
    bathrooms: {
      type: Number,
      required: true,
      min: 0
    },
    totalRooms: {
      type: Number,
      default: 1
    }
  },
  // Square footage
  size: {
    type: Number,
    min: 0
  },
  // Amenities for smart matching
  amenities: [{
    type: String,
    enum: [
      'wifi', 'parking', 'pool', 'gym', 'laundry', 'ac', 'heating',
      'dishwasher', 'balcony', 'garden', 'security', 'elevator',
      'furnished', 'pet-friendly', 'storage', 'ev-charging'
    ]
  }],
  // Location with map coordinates
  location: locationSchema,
  // Image URLs
  images: [{
    url: {
      type: String,
      required: true
    },
    caption: String,
    isPrimary: {
      type: Boolean,
      default: false
    }
  }],
  // Admin verification status - VERIFIED LISTING BADGE
  verified: {
    status: {
      type: Boolean,
      default: false
    },
    verifiedAt: Date,
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  // Availability status
  available: {
    type: Boolean,
    default: true
  },
  // Tenant ratings and reviews
  ratings: [ratingSchema],
  // Calculated average rating
  averageRating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },
  // Total number of views (for analytics)
  viewCount: {
    type: Number,
    default: 0
  },
  // Availability dates
  availableFrom: {
    type: Date
  },
  // Minimum lease duration in months
  minLeaseDuration: {
    type: Number,
    default: 1
  },
  // Deposit amount
  deposit: {
    type: Number,
    default: 0
  },
  // Rules and policies
  rules: {
    petsAllowed: { type: Boolean, default: false },
    smokingAllowed: { type: Boolean, default: false },
    maxOccupants: { type: Number, default: 4 }
  }
}, {
  timestamps: true
});

// Indexes for faster queries
houseSchema.index({ ownerId: 1 });
houseSchema.index({ price: 1 });
houseSchema.index({ 'location.city': 1, 'location.state': 1 });
houseSchema.index({ 'location.coordinates': '2dsphere' });
houseSchema.index({ available: 1 });
houseSchema.index({ 'verified.status': 1 });
houseSchema.index({ amenities: 1 });
houseSchema.index({ averageRating: -1 });

/**
 * Pre-save middleware to calculate average rating
 */
houseSchema.pre('save', function(next) {
  if (this.ratings && this.ratings.length > 0) {
    const totalScore = this.ratings.reduce((sum, rating) => sum + rating.score, 0);
    this.averageRating = Math.round((totalScore / this.ratings.length) * 10) / 10;
  } else {
    this.averageRating = 0;
  }
  next();
});

/**
 * Static method to find houses within a radius
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @param {number} radius - Radius in kilometers
 */
houseSchema.statics.findWithinRadius = async function(lat, lng, radius) {
  const radiusInRadians = radius / 6371; // Earth's radius in km
  
  return this.find({
    'location.coordinates': {
      $geoWithin: {
        $centerSphere: [[lng, lat], radiusInRadians]
      }
    }
  });
};

/**
 * Instance method to add a rating
 * @param {ObjectId} tenantId - ID of the tenant
 * @param {number} score - Rating score (1-5)
 * @param {string} comment - Optional comment
 */
houseSchema.methods.addRating = async function(tenantId, score, comment) {
  // Check if tenant already rated
  const existingRating = this.ratings.find(
    r => r.tenantId.toString() === tenantId.toString()
  );

  if (existingRating) {
    existingRating.score = score;
    existingRating.comment = comment;
    existingRating.createdAt = new Date();
  } else {
    this.ratings.push({ tenantId, score, comment });
  }

  await this.save();
  return this;
};

/**
 * Instance method to get summary for listings
 */
houseSchema.methods.getSummary = function() {
  return {
    id: this._id,
    title: this.title,
    price: this.price,
    rooms: this.rooms,
    location: {
      city: this.location.city,
      state: this.location.state
    },
    primaryImage: this.images.find(img => img.isPrimary)?.url || this.images[0]?.url,
    averageRating: this.averageRating,
    verified: this.verified.status,
    available: this.available
  };
};

module.exports = mongoose.model('House', houseSchema);
