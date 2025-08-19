const express = require('express');
const router = express.Router();
const Warehouse = require('../models/Warehouse');
const Inventory = require('../models/Inventory');
const protect = require('../middleware/authMiddleware');

// Get all warehouses (optionally filter by manually added only)
router.get('/', protect, async (req, res) => {
  try {
    const { manualOnly } = req.query;
    const filter = manualOnly === 'true' ? { isManuallyAdded: true } : {};
    const warehouses = await Warehouse.find(filter).populate('addedBy', 'name email');
    res.json(warehouses);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Get warehouse free space (capacity - current stock) for manually added warehouses
router.get('/free-space', protect, async (req, res) => {
  try {
    // Get only manually added warehouses
    const warehouses = await Warehouse.find({ isManuallyAdded: true });
    // Aggregate inventory totals per location
    const inventoryTotals = await Inventory.aggregate([
      { $group: { _id: "$location", totalQuantity: { $sum: "$quantity" } } }
    ]);
    // Map location to totalQuantity
    const inventoryMap = {};
    inventoryTotals.forEach(i => {
      inventoryMap[i._id] = i.totalQuantity;
    });
    // Build result array
    const result = warehouses.map(w => {
      const used = inventoryMap[w.location] || 0;
      return {
        location: w.location,
        capacityLimit: w.capacityLimit,
        currentStock: used,
        freeSpace: w.capacityLimit - used
      };
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Add or update warehouse capacity
router.post('/set-capacity', protect, async (req, res) => {
  const { location, capacityLimit, coordinates } = req.body;
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Only admins can set capacity' });

  try {
    const existing = await Warehouse.findOne({ location });
    if (existing) {
      existing.capacityLimit = capacityLimit;
      if (coordinates) existing.coordinates = coordinates;
      // Mark as manually added if admin is updating it
      existing.isManuallyAdded = true;
      existing.addedBy = req.user.id;
      await existing.save();
      return res.json({ message: 'Capacity updated', warehouse: existing });
    }

    const warehouse = new Warehouse({ 
      location, 
      capacityLimit,
      coordinates,
      isManuallyAdded: true,
      addedBy: req.user.id
    });
    await warehouse.save();
    res.status(201).json({ message: 'Warehouse capacity set', warehouse });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Remove auto-generated/test warehouses (admin only)
router.delete('/cleanup-test-data', protect, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Only admins can cleanup test data' });
  }

  try {
    // Delete warehouses that are not manually added
    const result = await Warehouse.deleteMany({ 
      $or: [
        { isManuallyAdded: { $ne: true } },
        { isManuallyAdded: { $exists: false } }
      ]
    });
    
    res.json({ 
      message: `Cleaned up ${result.deletedCount} auto-generated warehouses`,
      deletedCount: result.deletedCount
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Delete specific warehouse (admin only)
router.delete('/:id', protect, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Only admins can delete warehouses' });
  }

  try {
    const warehouse = await Warehouse.findById(req.params.id);
    if (!warehouse) {
      return res.status(404).json({ message: 'Warehouse not found' });
    }

    // Check if there's any inventory in this warehouse
    const inventoryCount = await Inventory.countDocuments({ location: warehouse.location });
    if (inventoryCount > 0) {
      return res.status(400).json({ 
        message: `Cannot delete warehouse with existing inventory (${inventoryCount} items)` 
      });
    }

    await Warehouse.findByIdAndDelete(req.params.id);
    res.json({ message: 'Warehouse deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
