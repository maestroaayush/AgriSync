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
    const deliveries = await Delivery.find({ status: 'pending' });
    return res.json(deliveries);
  }

  // Farmers see their own requests
  if (req.user.role === 'farmer') {
    const deliveries = await Delivery.find({ farmer: req.user.id });
    return res.json(deliveries);
  }

  // Warehouse managers see all deliveries (to manage incoming ones)
  if (req.user.role === 'warehouse_manager') {
    const deliveries = await Delivery.find();
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

// Update delivery status
router.put('/:id/status', protect, async (req, res) => {
  const delivery = await Delivery.findById(req.params.id);
  if (!delivery) return res.status(404).json({ message: 'Delivery not found' });

  if (req.user.role !== 'transporter' || delivery.transporter.toString() !== req.user.id)
    return res.status(403).json({ message: 'Not authorized to update this delivery' });

  const { status } = req.body;
  if (!['in_transit', 'delivered'].includes(status)) return res.status(400).json({ message: 'Invalid status' });

  delivery.status = status;
  await delivery.save();
  res.json(delivery);
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


module.exports = router;
