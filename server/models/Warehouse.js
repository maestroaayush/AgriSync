const mongoose = require('mongoose');

const warehouseSchema = new mongoose.Schema({
  location: { type: String, unique: true, required: true },
  capacityLimit: { type: Number, required: true }, // total allowed quantity
  currentCapacity: { type: Number, default: 0 }, // current used capacity
  manager: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  }, // Warehouse manager user
  isManuallyAdded: { type: Boolean, default: false }, // Track if manually added by admin
  addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Admin who added it
  coordinates: {
    latitude: Number,
    longitude: Number
  },
  // Helper methods for capacity tracking
  availableCapacity: {
    type: Number,
    get: function() {
      return this.capacityLimit - this.currentCapacity;
    }
  },
  capacityPercentage: {
    type: Number,
    get: function() {
      return (this.currentCapacity / this.capacityLimit) * 100;
    }
  }
}, {
  timestamps: true,
  toJSON: { getters: true },
  toObject: { getters: true }
});

module.exports = mongoose.model('Warehouse', warehouseSchema);
