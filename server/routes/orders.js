const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const protect = require('../middleware/authMiddleware');
const allowRoles = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) return res.status(403).json({ message: 'Access denied' });
  next();
};

// Vendor places an order
router.post('/', protect, allowRoles('market_vendor'), async (req, res) => {
  const { itemName, quantity, unit, location } = req.body;
  const order = new Order({
    vendor: req.user.id,
    itemName,
    quantity,
    unit,
    location
  });
  await order.save();
  res.status(201).json({ message: 'Order placed', order });
});

// Warehouse manager approves/fulfills
router.put('/:id/fulfill', protect, allowRoles('warehouse_manager'), async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order || order.status !== 'pending') return res.status(404).json({ message: 'Order not found or already processed' });

  order.status = 'fulfilled';
  order.fulfilledBy = req.user.id;
  await order.save();
  const Notification = require('../models/Notification');

await Notification.create({
  user: order.vendor,
  message: `✅ Your order for ${order.quantity} ${order.unit} of "${order.itemName}" has been fulfilled.`
});

  res.json({ message: 'Order fulfilled', order });
});

// Users view their orders (vendors view orders they placed, farmers/warehouses see all orders for their locations)
router.get('/', protect, async (req, res) => {
  try {
    let orders;
    
    if (req.user.role === 'market_vendor') {
      // Vendors see only their own orders
      orders = await Order.find({ vendor: req.user.id }).sort({ createdAt: -1 });
    } else if (req.user.role === 'warehouse_manager') {
      // Warehouse managers see orders for their location
      orders = await Order.find({ location: req.user.location }).sort({ createdAt: -1 });
    } else if (req.user.role === 'farmer' || req.user.role === 'admin') {
      // Farmers and admins can view all orders (for analytics/overview)
      orders = await Order.find().sort({ createdAt: -1 });
    } else {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching orders', error: error.message });
  }
});

module.exports = router;