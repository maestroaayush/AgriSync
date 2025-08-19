const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  message: { type: String, required: true },
  type: { 
    type: String, 
    enum: ['info', 'success', 'warning', 'error'],
    default: 'info'
  },
  category: {
    type: String,
    enum: ['inventory', 'delivery', 'transporter', 'approval', 'general'],
    default: 'general'
  },
  data: {
    deliveryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Delivery' },
    inventoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Inventory' },
    transporterId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    estimatedDate: { type: Date },
    quantity: { type: String },
    itemName: { type: String }
  },
  read: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Update the updatedAt field before saving
notificationSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Notification', notificationSchema);
