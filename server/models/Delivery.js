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
    type: mongoose.Schema.Types.ObjectId,
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

module.exports = mongoose.model('Delivery', deliverySchema);
