const mongoose = require('mongoose');

const warehouseSchema = new mongoose.Schema({
  location: { type: String, unique: true, required: true },
  capacityLimit: { type: Number, required: true }, // total allowed quantity
  isManuallyAdded: { type: Boolean, default: false }, // Track if manually added by admin
  addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Admin who added it
  coordinates: {
    latitude: Number,
    longitude: Number
  },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Warehouse', warehouseSchema);
