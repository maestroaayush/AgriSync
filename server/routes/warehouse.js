const express = require('express');
const router = express.Router();
const Warehouse = require('../models/Warehouse');
const Inventory = require('../models/Inventory');
const protect = require('../middleware/authMiddleware');
const WarehouseService = require('../services/warehouseService');

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

// Get warehouse statistics for dashboard
router.get('/statistics', protect, async (req, res) => {
  try {
    const stats = await WarehouseService.getWarehouseStatistics();
    
    if (!stats) {
      return res.status(500).json({ message: 'Failed to generate warehouse statistics' });
    }
    
    res.json(stats);
  } catch (err) {
    console.error('Error fetching warehouse statistics:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Get optimal warehouse for a delivery (admin/transporter tool)
router.post('/find-optimal', protect, async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'transporter') {
      return res.status(403).json({ message: 'Only admins and transporters can access this endpoint' });
    }

    const { farmerCoordinates, deliveryQuantity, itemType, preferredLocation } = req.body;
    
    if (!farmerCoordinates || !deliveryQuantity) {
      return res.status(400).json({ 
        message: 'Farmer coordinates and delivery quantity are required' 
      });
    }

    const optimalWarehouse = await WarehouseService.findOptimalWarehouse(
      farmerCoordinates,
      deliveryQuantity,
      itemType,
      preferredLocation
    );

    if (!optimalWarehouse) {
      return res.status(404).json({ 
        message: 'No suitable warehouse found for the given parameters' 
      });
    }

    res.json({
      success: true,
      recommendation: {
        warehouse: {
          id: optimalWarehouse.warehouse._id,
          location: optimalWarehouse.warehouse.location,
          coordinates: optimalWarehouse.warehouse.coordinates,
          capacityLimit: optimalWarehouse.warehouse.capacityLimit
        },
        distance: optimalWarehouse.distance === Infinity ? null : optimalWarehouse.distance,
        utilization: optimalWarehouse.utilization,
        scores: optimalWarehouse.scores,
        reasoning: `Selected based on proximity (${optimalWarehouse.scores.proximity.toFixed(1)}), capacity (${optimalWarehouse.scores.capacity.toFixed(1)}), utilization (${optimalWarehouse.scores.utilization}), and preference (${optimalWarehouse.scores.preference}) scores.`
      }
    });
  } catch (err) {
    console.error('Error finding optimal warehouse:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Get warehouse utilization for specific warehouse
router.get('/:id/utilization', protect, async (req, res) => {
  try {
    const warehouse = await Warehouse.findById(req.params.id);
    if (!warehouse) {
      return res.status(404).json({ message: 'Warehouse not found' });
    }

    const utilization = await WarehouseService.getWarehouseUtilization(warehouse.location);
    
    if (!utilization) {
      return res.status(500).json({ message: 'Failed to calculate warehouse utilization' });
    }

    res.json({
      warehouseId: warehouse._id,
      location: warehouse.location,
      ...utilization
    });
  } catch (err) {
    console.error('Error fetching warehouse utilization:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Get warehouse manager for a location (admin tool)
router.get('/location/:location/manager', protect, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only admins can access this endpoint' });
    }

    const manager = await WarehouseService.getWarehouseManager(req.params.location);
    
    if (!manager) {
      return res.status(404).json({ 
        message: `No warehouse manager found for location: ${req.params.location}` 
      });
    }

    res.json({
      manager: {
        id: manager._id,
        name: manager.name,
        email: manager.email,
        location: manager.location,
        role: manager.role
      },
      location: req.params.location
    });
  } catch (err) {
    console.error('Error fetching warehouse manager:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
