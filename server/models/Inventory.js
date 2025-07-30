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
  quantity: {
    type: Number,
    required: true
  },
  unit: {
    type: String,
    enum: ['kg', 'liters', 'pieces'],
    required: true
  },
  location: {
    type: String,
    required: true
  },
  addedByRole: {
    type: String,
    enum: ['farmer', 'warehouse_manager'],
    required: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Inventory', inventorySchema);
