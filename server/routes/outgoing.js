const express = require('express');
const router = express.Router();
const Inventory = require('../models/Inventory');
const Outgoing = require('../models/OutgoingInventory');
const protect = require('../middleware/authMiddleware');
const Notification = require('../models/Notification');

// Dispatch inventory
router.post('/dispatch/:id', protect, async (req, res) => {
  const { quantityDispatched, recipient } = req.body;

  if (req.user.role !== 'warehouse_manager') {
    return res.status(403).json({ message: 'Only warehouse managers can dispatch inventory' });
  }

  const item = await Inventory.findById(req.params.id);
  if (!item) return res.status(404).json({ message: 'Inventory item not found' });

  if (quantityDispatched > item.quantity) {
    return res.status(400).json({ message: 'Not enough quantity in stock' });
  }

  // Subtract dispatched quantity
  item.quantity -= quantityDispatched;
  await item.save();

  const log = new Outgoing({
    inventoryItem: item._id,
    dispatchedBy: req.user.id,
    quantityDispatched,
    recipient
  });

  await log.save();

await Notification.create({
  user: req.user.id,
  message: `Dispatched ${quantityDispatched} units of "${item.itemName}" to ${recipient}`
});

  res.json({ message: 'Inventory dispatched', item, log });
});

// View outgoing logs
router.get('/logs', protect, async (req, res) => {
  if (req.user.role !== 'warehouse_manager') {
    return res.status(403).json({ message: 'Access denied' });
  }

  const logs = await Outgoing.find({ dispatchedBy: req.user.id })
    .populate('inventoryItem', 'itemName location')
    .sort({ dispatchedAt: -1 });

  res.json(logs);
});

module.exports = router;
