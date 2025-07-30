const express = require('express');
const router = express.Router();
const Warehouse = require('../models/Warehouse');
const protect = require('../middleware/authMiddleware');

// Add or update warehouse capacity
router.post('/set-capacity', protect, async (req, res) => {
  const { location, capacityLimit } = req.body;
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Only admins can set capacity' });

  const existing = await Warehouse.findOne({ location });
  if (existing) {
    existing.capacityLimit = capacityLimit;
    await existing.save();
    return res.json({ message: 'Capacity updated', warehouse: existing });
  }

  const warehouse = new Warehouse({ location, capacityLimit });
  await warehouse.save();
  res.status(201).json({ message: 'Warehouse capacity set', warehouse });
});

module.exports = router;
