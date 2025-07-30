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

// Vendor views their orders
router.get('/', protect, allowRoles('market_vendor'), async (req, res) => {
  const orders = await Order.find({ vendor: req.user.id }).sort({ createdAt: -1 });
  res.json(orders);
});

module.exports = router;