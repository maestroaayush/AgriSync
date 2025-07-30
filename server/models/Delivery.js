const mongoose = require('mongoose');

const deliverySchema = new mongoose.Schema({
  farmer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  pickupLocation: {
    type: String,
    required: true
  },
  dropoffLocation: {
    type: String,
    required: true
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
  status: {
    type: String,
    enum: ['pending', 'assigned', 'in_transit', 'delivered'],
    default: 'pending'
  },
  transporter: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Delivery', deliverySchema);
