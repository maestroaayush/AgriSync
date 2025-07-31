const express = require('express');
const router = express.Router();
const Delivery = require('../models/Delivery');
const protect = require('../middleware/authMiddleware');
const Inventory = require('../models/Inventory');

// Farmers create delivery
router.post('/', protect, async (req, res) => {
  if (req.user.role !== 'farmer') return res.status(403).json({ message: 'Only farmers can schedule deliveries' });

  const { pickupLocation, dropoffLocation, goodsDescription, quantity } = req.body;

  const delivery = new Delivery({
    farmer: req.user.id,
    pickupLocation,
    dropoffLocation,
    goodsDescription,
    quantity
  });

  await delivery.save();
  res.status(201).json(delivery);
});

// Transporters view unassigned deliveries
router.get('/', protect, async (req, res) => {
  if (req.user.role === 'transporter') {
    // Return all deliveries assigned to this transporter + unassigned pending deliveries
    const deliveries = await Delivery.find({
      $or: [
        { transporter: req.user.id }, // All deliveries assigned to this transporter
        { status: 'pending', transporter: null } // Unassigned pending deliveries
      ]
    });
    return res.json(deliveries);
  }

  // Farmers see their own requests
  if (req.user.role === 'farmer') {
    const deliveries = await Delivery.find({ farmer: req.user.id });
    return res.json(deliveries);
  }

  res.status(403).json({ message: 'Access denied' });
});

// Transporter accepts a delivery
router.put('/:id/assign', protect, async (req, res) => {
  if (req.user.role !== 'transporter') return res.status(403).json({ message: 'Only transporters can accept deliveries' });

  const delivery = await Delivery.findById(req.params.id);
  if (!delivery || delivery.status !== 'pending') return res.status(404).json({ message: 'Delivery not available' });

  delivery.transporter = req.user.id;
  delivery.status = 'assigned';

  await delivery.save();
  res.json({ message: 'Delivery assigned', delivery });
});

// Update delivery status (enhanced with notifications)
router.put('/:id/status', protect, async (req, res) => {
  try {
    const delivery = await Delivery.findById(req.params.id);
    if (!delivery) return res.status(404).json({ message: 'Delivery not found' });

    // Allow both transporters and farmers to update status
    const canUpdate = (req.user.role === 'transporter' && delivery.transporter?.toString() === req.user.id) ||
                     (req.user.role === 'farmer' && delivery.farmer.toString() === req.user.id);
    
    if (!canUpdate) {
      return res.status(403).json({ message: 'Not authorized to update this delivery' });
    }

    const { status } = req.body;
    const validStatuses = ['pending', 'in-transit', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const oldStatus = delivery.status;
    delivery.status = status;
    
    // Add timestamp for status change
    delivery.statusHistory = delivery.statusHistory || [];
    delivery.statusHistory.push({
      status,
      updatedBy: req.user.id,
      updatedAt: new Date(),
      previousStatus: oldStatus
    });
    
    await delivery.save();

    // Create notification for status change
    const Notification = require('../models/Notification');
    const recipientId = req.user.role === 'transporter' ? delivery.farmer : delivery.transporter;
    
    if (recipientId) {
      await Notification.create({
        user: recipientId,
        message: `📦 Delivery status updated: ${delivery.goodsDescription} is now ${status}`,
        type: 'delivery_update'
      });
    }
    
    res.json(delivery);
  } catch (error) {
    res.status(500).json({ message: 'Error updating delivery status', error: error.message });
  }
});

// Warehouse manager confirms receipt
router.put('/:id/confirm-receipt', protect, async (req, res) => {
  if (req.user.role !== 'warehouse_manager') {
    return res.status(403).json({ message: 'Only warehouse managers can confirm delivery receipt' });
  }

  const { unit, location } = req.body;
  if (!unit || !location) {
    return res.status(400).json({ message: 'Unit and location are required' });
  }

  const delivery = await Delivery.findById(req.params.id);
  if (!delivery) return res.status(404).json({ message: 'Delivery not found' });

  if (delivery.receivedByWarehouse) {
    return res.status(400).json({ message: 'Already confirmed' });
  }

  delivery.receivedByWarehouse = true;
  await delivery.save();

  const inventoryItem = new Inventory({
    user: req.user.id, // warehouse manager
    itemName: delivery.goodsDescription,
    quantity: delivery.quantity,
    unit,
    location,
    addedByRole: req.user.role
  });

  await inventoryItem.save();

  res.json({
    message: 'Delivery confirmed and added to inventory',
    delivery,
    inventoryItem
  });
});


// Get delivery analytics
router.get('/analytics', protect, async (req, res) => {
  try {
    const deliveries = await Delivery.find({ farmer: req.user.id });
    
    const totalDeliveries = deliveries.length;
    const pendingDeliveries = deliveries.filter(d => d.status === 'pending').length;
    const inTransitDeliveries = deliveries.filter(d => d.status === 'in-transit' || d.status === 'assigned').length;
    const completedDeliveries = deliveries.filter(d => d.status === 'delivered').length;
    const cancelledDeliveries = deliveries.filter(d => d.status === 'cancelled').length;
    
    const successRate = totalDeliveries > 0 ? ((completedDeliveries / totalDeliveries) * 100).toFixed(1) : 0;
    
    // Delivery trends over time
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const deliveryTrends = await Delivery.aggregate([
      { $match: { farmer: req.user._id, createdAt: { $gte: thirtyDaysAgo } } },
      { $group: {
        _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
        deliveriesCreated: { $sum: 1 },
        totalQuantity: { $sum: '$quantity' }
      }},
      { $sort: { '_id': 1 } }
    ]);
    
    // Urgency breakdown
    const urgencyBreakdown = [
      { name: 'Low', value: deliveries.filter(d => d.urgency === 'low').length, fill: '#10B981' },
      { name: 'Normal', value: deliveries.filter(d => d.urgency === 'normal').length, fill: '#60A5FA' },
      { name: 'High', value: deliveries.filter(d => d.urgency === 'high').length, fill: '#F59E0B' },
      { name: 'Urgent', value: deliveries.filter(d => d.urgency === 'urgent').length, fill: '#EF4444' }
    ];
    
    res.json({
      summary: {
        totalDeliveries,
        pendingDeliveries,
        inTransitDeliveries,
        completedDeliveries,
        cancelledDeliveries,
        successRate: parseFloat(successRate)
      },
      deliveryTrends,
      urgencyBreakdown,
      lastUpdated: new Date()
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching delivery analytics', error: error.message });
  }
});

module.exports = router;
