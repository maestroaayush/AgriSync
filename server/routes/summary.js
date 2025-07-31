const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Inventory = require('../models/Inventory');
const Delivery = require('../models/Delivery');
const Order = require('../models/Order');
const protect = require('../middleware/authMiddleware');

// Get system summary (admin only)
router.get('/', protect, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admin role required.' });
    }
    
    // Count totals
    const totalUsers = await User.countDocuments();
    const totalInventory = await Inventory.countDocuments();
    const totalDeliveries = await Delivery.countDocuments();
    const totalOrders = await Order.countDocuments();
    
    // Count by roles
    const usersByRole = await User.aggregate([
      { $group: { _id: '$role', count: { $sum: 1 } } }
    ]);
    
    // Count deliveries by status
    const deliveriesByStatus = await Delivery.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);
    
    // Count orders by status
    const ordersByStatus = await Order.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);
    
    const summary = {
      users: totalUsers,
      inventory: totalInventory,
      deliveries: totalDeliveries,
      orders: totalOrders,
      usersByRole: usersByRole.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {}),
      deliveriesByStatus: deliveriesByStatus.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {}),
      ordersByStatus: ordersByStatus.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {})
    };
    
    res.json(summary);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch summary', error: err.message });
  }
});

module.exports = router;
