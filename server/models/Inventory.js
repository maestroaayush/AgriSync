const mongoose = require('mongoose');

const inventorySchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  itemName: {
    type: String,
    required: true
  },
  category: {
    type: String,
    enum: ['grains', 'vegetables', 'fruits', 'dairy', 'meat', 'seeds', 'other'],
    default: 'other'
  },
  quantity: {
    type: Number,
    required: true
  },
  unit: {
    type: String,
    enum: ['kg', 'tons', 'liters', 'pieces', 'bags', 'units'],
    required: true
  },
  price: {
    type: Number,
    default: 0
  },
  qualityGrade: {
    type: String,
    enum: ['A', 'B', 'C', 'Premium', 'Standard'],
    default: 'Standard'
  },
  qualityCertification: {
    type: String,
    default: ''
  },
  images: [{
    type: String // URLs to images
  }],
  description: {
    type: String,
    default: ''
  },
  location: {
    type: String,
    required: true
  },
  harvestDate: {
    type: Date
  },
  expiryDate: {
    type: Date
  },
  status: {
    type: String,
    enum: ['available', 'reserved', 'sold', 'expired'],
    default: 'available'
  },
  addedByRole: {
    type: String,
    enum: ['farmer', 'warehouse_manager', 'system'],
    required: true
  },
  // Link to source delivery if auto-added
  sourceDelivery: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Delivery'
  },
  // Additional notes for tracking
  notes: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Inventory', inventorySchema);
