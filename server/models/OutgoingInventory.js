const mongoose = require('mongoose');

const outgoingSchema = new mongoose.Schema({
  inventoryItem: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Inventory',
    required: true
  },
  dispatchedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  quantityDispatched: {
    type: Number,
    required: true
  },
  recipient: {
    type: String,
    required: true
  },
  dispatchedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('OutgoingInventory', outgoingSchema);
