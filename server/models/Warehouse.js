const mongoose = require('mongoose');

const warehouseSchema = new mongoose.Schema({
  location: { type: String, unique: true, required: true },
  capacityLimit: { type: Number, required: true } // total allowed quantity
});

module.exports = mongoose.model('Warehouse', warehouseSchema);
