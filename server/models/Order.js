const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  vendor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // Enhanced item information
  itemName: {
    type: String,
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  unit: {
    type: String,
    required: true
  },
  requestedPrice: {
    type: Number,
    default: 0
  },
  
  // Warehouse and location information
  warehouseLocation: {
    type: String,
    required: true
  },
  warehouse: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Warehouse'
  },
  vendorLocation: {
    type: String,
    required: true
  },
  
  // Status and workflow tracking
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'fulfilled', 'in_delivery', 'delivered', 'cancelled'],
    default: 'pending'
  },
  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal'
  },
  
  // Fulfillment tracking
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approvedAt: Date,
  fulfilledBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  fulfilledAt: Date,
  
  // Delivery integration
  delivery: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Delivery'
  },
  
  // Inventory integration
  reservedInventoryItems: [{
    inventoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Inventory'
    },
    reservedQuantity: Number,
    reservedAt: Date
  }],
  
  // Notes and communication
  vendorNotes: {
    type: String,
    default: ''
  },
  warehouseNotes: {
    type: String,
    default: ''
  },
  rejectionReason: {
    type: String,
    default: ''
  },
  
  // Pricing and payment
  agreedPrice: Number,
  totalCost: Number,
  
  // Quality specifications
  qualityRequirements: {
    type: String,
    default: ''
  },
  
  // Timestamps
  requestedDeliveryDate: Date,
  actualDeliveryDate: Date
}, {
  timestamps: true
});

module.exports = mongoose.model('Order', orderSchema);
