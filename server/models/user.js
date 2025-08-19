const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },
  password: {
    type: String,
    required: function() {
      // Password is only required if user doesn't have Google ID
      return !this.googleId;
    }
  },
  googleId: {
    type: String,
    sparse: true // Allows multiple documents with null/undefined googleId
  },
  role: {
    type: String,
    enum: ['farmer', 'transporter', 'warehouse_manager', 'market_vendor', 'admin'],
    default: 'farmer'
  },
  location: {
    type: String,
    trim: true
  },
  // Geographic coordinates for location tracking
  coordinates: {
    latitude: {
      type: Number,
      min: -90,
      max: 90
    },
    longitude: {
      type: Number,
      min: -180,
      max: 180
    },
    address: {
      type: String,
      trim: true
    },
    lastUpdated: {
      type: Date,
      default: Date.now
    }
  },
  // Current location for transporters (real-time tracking)
  currentLocation: {
    latitude: Number,
    longitude: Number,
    address: String,
    lastUpdated: Date,
    isOnline: {
      type: Boolean,
      default: false
    }
  },
  phone: {
    type: String,
    trim: true
  },
  approved: {
    type: Boolean,
    default: false
  },
  // Email verification fields
  emailVerified: {
    type: Boolean,
    default: false
  },
  emailVerificationToken: {
    type: String,
    default: null
  },
  emailVerificationExpires: {
    type: Date,
    default: null
  },
  // Password reset fields
  passwordResetToken: {
    type: String,
    default: null
  },
  passwordResetExpires: {
    type: Date,
    default: null
  },
  profilePhoto: {
    type: String,
    default: null
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('User', UserSchema);
