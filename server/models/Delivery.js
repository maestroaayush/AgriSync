const mongoose = require('mongoose');

const deliverySchema = new mongoose.Schema({
  farmer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false // No longer required since vendors can also create deliveries
  },
  vendor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  // Universal fields for both farmers and vendors
  requestedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  requesterType: {
    type: String,
    enum: ['farmer', 'market_vendor'],
    required: true
  },
  pickupLocation: {
    type: String,
    required: true
  },
  dropoffLocation: {
    type: String,
    required: false,
    default: null
  },
  goodsDescription: {
    type: String,
    required: true
  },
receivedByWarehouse: {
  type: Boolean,
  default: false
},
  quantity: Number,
  unit: {
    type: String,
    default: 'units'
  },
  // Detailed items array for multiple products in a single delivery
  items: [{
    crop: {
      type: String,
      required: true
    },
    productName: String,
    product: String,
    quantity: {
      type: Number,
      required: true
    },
    unit: {
      type: String,
      default: 'kg'
    },
    description: String
  }],
  status: {
    type: String,
    enum: ['pending', 'assigned', 'in_transit', 'delivered', 'requested', 'rejected'],
    default: 'pending'
  },
  transporter: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  urgency: {
    type: String,
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal'
  },
  statusHistory: [{
    status: String,
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    updatedAt: Date,
    previousStatus: String
  }],
  // Real-time location tracking
  currentLocation: {
    latitude: Number,
    longitude: Number,
    address: String,
    lastUpdated: Date
  },
  locationHistory: [{
    latitude: {
      type: Number,
      required: true
    },
    longitude: {
      type: Number,
      required: true
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    speed: Number, // km/h
    heading: Number, // degrees
    accuracy: Number // meters
  }],
  estimatedArrival: Date,
  scheduledPickupTime: Date,
  scheduledDeliveryTime: Date,
  actualPickupTime: Date,
  actualDeliveryTime: Date,
  pickedUp: {
    type: Boolean,
    default: false
  },
  pickedUpAt: Date,
  adminNotes: String,
  
  // Route and location information
  pickupCoordinates: {
    latitude: Number,
    longitude: Number,
    address: String
  },
  dropoffCoordinates: {
    latitude: Number,
    longitude: Number,
    address: String
  },
  warehouseLocation: {
    type: mongoose.Schema.Types.Mixed, // Allow any type initially
    ref: 'Warehouse'
  },
  
  // Admin assignment fields
  assignedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  assignedAt: Date,
  
  // Rejection fields
  rejectedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  rejectedAt: Date,
  rejectionReason: String
}, {
  timestamps: true
});

// Pre-save middleware to validate and clean warehouseLocation
deliverySchema.pre('validate', function(next) {
  // Handle warehouseLocation validation BEFORE Mongoose validation to prevent BSONError
  if (this.warehouseLocation !== undefined && this.warehouseLocation !== null) {
    console.log('🔍 Pre-validate: Processing warehouseLocation:', typeof this.warehouseLocation, this.warehouseLocation);
    
    try {
      // If it's a string, validate and convert or remove
      if (typeof this.warehouseLocation === 'string') {
        const trimmedLocation = this.warehouseLocation.trim();
        
        // Remove invalid string values
        if (trimmedLocation === '' || 
            trimmedLocation === 'null' || 
            trimmedLocation === 'undefined' || 
            trimmedLocation === 'false' || 
            trimmedLocation === 'true') {
          console.log('⚠️ Pre-validate: Removing invalid warehouseLocation string:', trimmedLocation);
          this.warehouseLocation = undefined;
        } else if (mongoose.Types.ObjectId.isValid(trimmedLocation)) {
          // Convert valid ObjectId string to ObjectId
          this.warehouseLocation = new mongoose.Types.ObjectId(trimmedLocation);
          console.log('✅ Pre-validate: Converted valid ObjectId string to ObjectId');
        } else {
          // Invalid ObjectId string - remove to prevent BSONError
          console.log('❌ Pre-validate: Removing invalid ObjectId string:', trimmedLocation);
          this.warehouseLocation = undefined;
        }
      } 
      // If it's not a valid ObjectId instance, try to validate it
      else if (!(this.warehouseLocation instanceof mongoose.Types.ObjectId)) {
        if (mongoose.Types.ObjectId.isValid(this.warehouseLocation)) {
          this.warehouseLocation = new mongoose.Types.ObjectId(this.warehouseLocation);
          console.log('✅ Pre-validate: Converted to valid ObjectId instance');
        } else {
          console.log('❌ Pre-validate: Removing invalid warehouseLocation (not ObjectId):', this.warehouseLocation);
          this.warehouseLocation = undefined;
        }
      } else {
        console.log('✅ Pre-validate: warehouseLocation is already a valid ObjectId instance');
      }
    } catch (error) {
      console.error('❌ Pre-validate warehouseLocation error:', error.message);
      // Remove field entirely to prevent validation failure
      this.warehouseLocation = undefined;
      console.log('🔧 Pre-validate: Removed warehouseLocation due to error');
    }
  } else {
    console.log('✅ Pre-validate: warehouseLocation is null/undefined - no processing needed');
  }
  
  next();
});

// Additional pre-save middleware for final safety check
deliverySchema.pre('save', function(next) {
  // Final safety check before saving
  if (this.warehouseLocation !== undefined && this.warehouseLocation !== null) {
    if (!(this.warehouseLocation instanceof mongoose.Types.ObjectId)) {
      console.warn('⚠️ Pre-save final check: warehouseLocation is not ObjectId, removing:', this.warehouseLocation);
      this.warehouseLocation = undefined;
    }
  }
  next();
});

// Additional validation for warehouseLocation field
deliverySchema.path('warehouseLocation').validate(function(value) {
  if (value === null || value === undefined) {
    return true; // Allow null/undefined
  }
  
  // Must be a valid ObjectId if present
  return mongoose.Types.ObjectId.isValid(value);
}, 'warehouseLocation must be a valid ObjectId or null');

module.exports = mongoose.model('Delivery', deliverySchema);
