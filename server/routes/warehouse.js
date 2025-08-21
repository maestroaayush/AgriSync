const express = require('express');
const router = express.Router();
const Warehouse = require('../models/Warehouse');
const Inventory = require('../models/Inventory');
const Delivery = require('../models/Delivery');
const protect = require('../middleware/authMiddleware');
const WarehouseService = require('../services/warehouseService');
const NotificationService = require('../services/notificationService');

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
  const { location, capacityLimit, coordinates, managerId } = req.body;
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Only admins can set capacity' });

  try {
    let warehouseLocation = location;
    let warehouseCoordinates = coordinates;
    let warehouseManager = null;
    
    // If managerId is provided, get manager details and use their location
    if (managerId) {
      const User = require('../models/user');
      warehouseManager = await User.findById(managerId);
      
      if (!warehouseManager) {
        return res.status(404).json({ message: 'Warehouse manager not found' });
      }
      
      // Update user role to warehouse_manager if not already
      if (warehouseManager.role !== 'warehouse_manager') {
        console.log(`Updating user ${warehouseManager.name} role from ${warehouseManager.role} to warehouse_manager`);
        warehouseManager.role = 'warehouse_manager';
        await warehouseManager.save();
      }
      
      // Use manager's location and coordinates
      warehouseLocation = warehouseManager.location || `${warehouseManager.name}'s Warehouse`;
      warehouseCoordinates = warehouseManager.coordinates || coordinates;
      
      console.log('Using warehouse manager location:', {
        managerId: warehouseManager._id,
        managerName: warehouseManager.name,
        location: warehouseLocation,
        coordinates: warehouseCoordinates
      });
    }
    
    if (!warehouseLocation) {
      return res.status(400).json({ message: 'Warehouse location is required' });
    }

    const existing = await Warehouse.findOne({ location: warehouseLocation });
    if (existing) {
      existing.capacityLimit = capacityLimit;
      if (warehouseCoordinates) existing.coordinates = warehouseCoordinates;
      if (warehouseManager) existing.manager = warehouseManager._id;
      // Mark as manually added if admin is updating it
      existing.isManuallyAdded = true;
      existing.addedBy = req.user.id;
      await existing.save();
      
      const populatedWarehouse = await Warehouse.findById(existing._id).populate('manager', 'name email location');
      return res.json({ 
        message: 'Warehouse updated successfully', 
        warehouse: populatedWarehouse 
      });
    }

    // Ensure we have a manager for new warehouses
    if (!managerId) {
      return res.status(400).json({ 
        message: 'Manager selection is required for new warehouses. Please select a warehouse manager.' 
      });
    }

    const warehouse = new Warehouse({ 
      location: warehouseLocation, 
      capacityLimit,
      coordinates: warehouseCoordinates,
      manager: warehouseManager._id,
      isManuallyAdded: true,
      addedBy: req.user.id
    });
    await warehouse.save();
    
    const populatedWarehouse = await Warehouse.findById(warehouse._id).populate('manager', 'name email location');
    
    res.status(201).json({ 
      message: 'Warehouse created successfully', 
      warehouse: populatedWarehouse 
    });
  } catch (err) {
    console.error('Error creating/updating warehouse:', err);
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

// Get warehouse dashboard metrics for warehouse managers
router.get('/dashboard/metrics', protect, async (req, res) => {
  try {
    if (req.user.role !== 'warehouse_manager' && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Get warehouses (for warehouse managers, get their assigned ones; for admins, get all)
    let warehouses;
    if (req.user.role === 'warehouse_manager') {
      warehouses = await WarehouseService.getWarehousesByManager(req.user.id);
    } else {
      warehouses = await Warehouse.find({ isManuallyAdded: true });
    }

    // Calculate metrics for each warehouse
    const warehouseMetrics = await Promise.all(warehouses.map(async (warehouse) => {
      // Get current inventory total for this warehouse
      const inventoryAgg = await Inventory.aggregate([
        { $match: { location: warehouse.location } },
        { 
          $group: { 
            _id: null, 
            totalQuantity: { $sum: '$quantity' },
            totalItems: { $sum: 1 },
            totalValue: { $sum: { $multiply: ['$quantity', { $ifNull: ['$price', 0] }] } }
          } 
        }
      ]);
      
      const currentUsage = inventoryAgg.length > 0 ? inventoryAgg[0].totalQuantity : 0;
      const totalItems = inventoryAgg.length > 0 ? inventoryAgg[0].totalItems : 0;
      const totalValue = inventoryAgg.length > 0 ? inventoryAgg[0].totalValue : 0;
      
      // Get recent deliveries to this warehouse
      const recentDeliveries = await Delivery.countDocuments({
        dropoffLocation: warehouse.location,
        createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } // Last 7 days
      });
      
      // Get pending deliveries to this warehouse
      const pendingDeliveries = await Delivery.countDocuments({
        dropoffLocation: warehouse.location,
        status: { $in: ['pending', 'assigned', 'in_transit'] }
      });
      
      const capacityLimit = warehouse.capacityLimit || 10000;
      const availableSpace = capacityLimit - currentUsage;
      const utilizationRate = capacityLimit > 0 ? ((currentUsage / capacityLimit) * 100) : 0;
      
      // Determine status based on utilization
      let status = 'optimal';
      if (utilizationRate >= 90) status = 'critical';
      else if (utilizationRate >= 75) status = 'warning';
      else if (utilizationRate < 25) status = 'underutilized';
      
      return {
        id: warehouse._id,
        name: warehouse.name || warehouse.location,
        location: warehouse.location,
        manager: warehouse.manager,
        coordinates: warehouse.coordinates,
        capacity: {
          limit: capacityLimit,
          used: currentUsage,
          available: availableSpace,
          utilizationRate: parseFloat(utilizationRate.toFixed(1)),
          status
        },
        inventory: {
          totalItems,
          totalQuantity: currentUsage,
          totalValue
        },
        deliveries: {
          recent: recentDeliveries,
          pending: pendingDeliveries
        },
        lastUpdated: new Date()
      };
    }));
    
    // Calculate summary statistics
    const summary = {
      totalWarehouses: warehouseMetrics.length,
      totalCapacity: warehouseMetrics.reduce((sum, w) => sum + w.capacity.limit, 0),
      totalUsed: warehouseMetrics.reduce((sum, w) => sum + w.capacity.used, 0),
      totalAvailable: warehouseMetrics.reduce((sum, w) => sum + w.capacity.available, 0),
      averageUtilization: warehouseMetrics.length > 0 
        ? parseFloat((warehouseMetrics.reduce((sum, w) => sum + w.capacity.utilizationRate, 0) / warehouseMetrics.length).toFixed(1))
        : 0,
      criticalWarehouses: warehouseMetrics.filter(w => w.capacity.status === 'critical').length,
      warningWarehouses: warehouseMetrics.filter(w => w.capacity.status === 'warning').length
    };
    
    res.json({
      success: true,
      summary,
      warehouses: warehouseMetrics,
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Error fetching warehouse dashboard metrics:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error fetching warehouse dashboard metrics', 
      error: error.message 
    });
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

// ==== WAREHOUSE MANAGER INVENTORY MANAGEMENT ROUTES ====

// Get inventory for warehouse manager's assigned warehouses
router.get('/inventory', protect, async (req, res) => {
  try {
    if (req.user.role !== 'warehouse_manager') {
      return res.status(403).json({ message: 'Only warehouse managers can access this endpoint' });
    }

    const { location, category, status, search, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;

    // Get warehouses managed by this user
    const warehouses = await WarehouseService.getWarehousesByManager(req.user.id);
    
    if (warehouses.length === 0) {
      return res.status(403).json({ 
        message: 'No warehouses assigned to this manager' 
      });
    }

    const warehouseLocations = warehouses.map(w => w.location);

    // Build query for inventory items
    let query = {
      location: { $in: warehouseLocations }
    };

    // Add filters
    if (location) {
      query.location = location;
    }
    if (category) {
      query.category = category;
    }
    if (status) {
      query.status = status;
    }
    if (search) {
      query.$or = [
        { itemName: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    // Set sort options
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const inventory = await Inventory.find(query)
      .populate('user', 'name email role')
      .sort(sortOptions)
      .lean();

    // Add warehouse information to each item
    const enhancedInventory = inventory.map(item => {
      const warehouse = warehouses.find(w => w.location === item.location);
      return {
        ...item,
        warehouse: warehouse ? {
          id: warehouse._id,
          name: warehouse.name || warehouse.location,
          capacityLimit: warehouse.capacityLimit,
          coordinates: warehouse.coordinates
        } : null
      };
    });

    res.json({
      inventory: enhancedInventory,
      warehouses: warehouseLocations,
      totalItems: inventory.length,
      filters: { location, category, status, search }
    });
  } catch (error) {
    console.error('Error fetching warehouse inventory:', error);
    res.status(500).json({ message: 'Error fetching warehouse inventory', error: error.message });
  }
});

// Manually add inventory item (warehouse manager)
router.post('/inventory/add', protect, async (req, res) => {
  try {
    if (req.user.role !== 'warehouse_manager') {
      return res.status(403).json({ message: 'Only warehouse managers can manually add inventory' });
    }

    const { 
      itemName, 
      quantity, 
      unit, 
      location, 
      category, 
      price, 
      qualityGrade, 
      qualityCertification, 
      description, 
      harvestDate, 
      expiryDate,
      reason = 'Manual addition'
    } = req.body;

    // Validate required fields
    if (!itemName || !quantity || !unit || !location) {
      return res.status(400).json({ 
        message: 'Item name, quantity, unit, and location are required' 
      });
    }

    // Use WarehouseService for manual addition
    const inventoryItem = await WarehouseService.manuallyAddInventory(
      {
        itemName,
        quantity,
        unit,
        location,
        category,
        price,
        qualityGrade,
        qualityCertification,
        description,
        harvestDate,
        expiryDate
      },
      req.user,
      reason
    );

    // Create notification for successful addition
    await NotificationService.general(
      req.user.id,
      '📦 Inventory Added',
      `Successfully added ${quantity} ${unit} of ${itemName} to ${location} warehouse. Reason: ${reason}`,
      'success'
    );

    // Notify admins about manual inventory addition
    const User = require('../models/user');
    const admins = await User.find({ role: 'admin' }).select('_id');
    for (const admin of admins) {
      await NotificationService.general(
        admin._id,
        '📦 Manual Inventory Addition',
        `${req.user.name} manually added ${quantity} ${unit} of ${itemName} to ${location} warehouse. Reason: ${reason}`,
        'info'
      );
    }

    res.status(201).json({
      message: 'Inventory item added successfully',
      inventoryItem
    });
  } catch (error) {
    console.error('Error manually adding inventory:', error);
    res.status(500).json({ 
      message: 'Error adding inventory item', 
      error: error.message 
    });
  }
});

// Remove/dispose inventory item (warehouse manager)
router.delete('/inventory/:id/remove', protect, async (req, res) => {
  try {
    if (req.user.role !== 'warehouse_manager') {
      return res.status(403).json({ message: 'Only warehouse managers can remove inventory' });
    }

    const { reason = 'Manual removal', quantityToRemove } = req.body;

    if (!reason) {
      return res.status(400).json({ message: 'Reason for removal is required' });
    }

    // Use WarehouseService for manual removal
    const removalResult = await WarehouseService.manuallyRemoveInventory(
      req.params.id,
      req.user,
      reason,
      quantityToRemove ? parseInt(quantityToRemove) : null
    );

    // Create notification for removal
    const actionText = removalResult.action === 'item_removed' ? 'removed' : 'reduced quantity of';
    await NotificationService.general(
      req.user.id,
      '🗑️ Inventory Removed',
      `Successfully ${actionText} ${removalResult.itemName} (${removalResult.quantityRemoved} units) from ${removalResult.location} warehouse. Reason: ${reason}`,
      'warning'
    );

    // Notify admins about manual inventory removal
    const User = require('../models/user');
    const admins = await User.find({ role: 'admin' }).select('_id');
    for (const admin of admins) {
      await NotificationService.general(
        admin._id,
        '🗑️ Manual Inventory Removal',
        `${req.user.name} ${actionText} ${removalResult.itemName} (${removalResult.quantityRemoved} units) from ${removalResult.location} warehouse. Reason: ${reason}`,
        'warning'
      );
    }

    res.json({
      message: `Inventory ${removalResult.action === 'item_removed' ? 'removed' : 'quantity reduced'} successfully`,
      result: removalResult
    });
  } catch (error) {
    console.error('Error removing inventory:', error);
    res.status(500).json({ 
      message: 'Error removing inventory item', 
      error: error.message 
    });
  }
});

// Adjust inventory quantity (warehouse manager)
router.put('/inventory/:id/adjust', protect, async (req, res) => {
  try {
    if (req.user.role !== 'warehouse_manager') {
      return res.status(403).json({ message: 'Only warehouse managers can adjust inventory' });
    }

    const { quantityChange, reason = 'Manual adjustment' } = req.body;

    if (!quantityChange || !reason) {
      return res.status(400).json({ 
        message: 'Quantity change and reason are required' 
      });
    }

    const quantityChangeNum = parseInt(quantityChange);
    if (isNaN(quantityChangeNum) || quantityChangeNum === 0) {
      return res.status(400).json({ 
        message: 'Quantity change must be a non-zero number' 
      });
    }

    // Use WarehouseService for quantity adjustment
    const adjustmentResult = await WarehouseService.adjustInventoryQuantity(
      req.params.id,
      req.user,
      quantityChangeNum,
      reason
    );

    // Create notification for adjustment
    const actionText = quantityChangeNum > 0 ? 'increased' : 'decreased';
    await NotificationService.general(
      req.user.id,
      '🔧 Inventory Adjusted',
      `Successfully ${actionText} ${adjustmentResult.itemName} by ${Math.abs(quantityChangeNum)} units (${adjustmentResult.originalQuantity} → ${adjustmentResult.newQuantity}) at ${adjustmentResult.location} warehouse. Reason: ${reason}`,
      'info'
    );

    // Notify admins about manual inventory adjustment
    const User = require('../models/user');
    const admins = await User.find({ role: 'admin' }).select('_id');
    for (const admin of admins) {
      await NotificationService.general(
        admin._id,
        '🔧 Manual Inventory Adjustment',
        `${req.user.name} ${actionText} ${adjustmentResult.itemName} by ${Math.abs(quantityChangeNum)} units at ${adjustmentResult.location} warehouse. Reason: ${reason}`,
        'info'
      );
    }

    res.json({
      message: `Inventory quantity ${actionText} successfully`,
      result: adjustmentResult
    });
  } catch (error) {
    console.error('Error adjusting inventory:', error);
    res.status(500).json({ 
      message: 'Error adjusting inventory quantity', 
      error: error.message 
    });
  }
});

// Get inventory activity logs for warehouse manager
router.get('/inventory/logs', protect, async (req, res) => {
  try {
    if (req.user.role !== 'warehouse_manager') {
      return res.status(403).json({ message: 'Only warehouse managers can access inventory logs' });
    }

    const { location, days = 30, action, page = 1, limit = 50 } = req.query;

    // Get warehouses managed by this user
    const warehouses = await WarehouseService.getWarehousesByManager(req.user.id);
    
    if (warehouses.length === 0) {
      return res.status(403).json({ 
        message: 'No warehouses assigned to this manager' 
      });
    }

    const warehouseLocations = warehouses.map(w => w.location);

    // Calculate date range
    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - parseInt(days));

    // Build query for inventory logs
    let query = {
      location: { $in: warehouseLocations },
      createdAt: { $gte: daysAgo }
    };

    if (location) {
      query.location = location;
    }

    // Get inventory items with activity
    const inventoryItems = await Inventory.find(query)
      .populate('user', 'name email role')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .lean();

    // Also get deleted inventory items from audit trail if available
    // For now, we'll focus on existing items and their notes for activity tracking
    
    const logs = inventoryItems.map(item => {
      // Parse notes to extract activity information
      const activities = [];
      
      // Creation activity
      activities.push({
        type: 'created',
        timestamp: item.createdAt,
        user: item.user?.name || 'System',
        userRole: item.addedByRole || item.user?.role || 'unknown',
        details: `Added ${item.quantity} ${item.unit} of ${item.itemName}`,
        reason: item.manualEntryReason || item.description || 'Initial addition',
        quantity: item.quantity,
        itemName: item.itemName,
        location: item.location
      });

      // Parse notes for quantity changes
      if (item.notes) {
        const noteLines = item.notes.split(' - ').filter(line => line.trim());
        noteLines.forEach(note => {
          if (note.includes('increased') || note.includes('decreased') || note.includes('removed') || note.includes('delivered')) {
            activities.push({
              type: note.includes('increased') ? 'quantity_increased' : 
                    note.includes('decreased') ? 'quantity_decreased' :
                    note.includes('removed') ? 'quantity_removed' :
                    'delivery',
              timestamp: new Date(), // We don't have exact timestamp from notes, use current
              user: 'System',
              userRole: 'system',
              details: note,
              itemName: item.itemName,
              location: item.location
            });
          }
        });
      }

      return {
        inventoryId: item._id,
        itemName: item.itemName,
        currentQuantity: item.quantity,
        unit: item.unit,
        location: item.location,
        category: item.category,
        status: item.status,
        activities
      };
    });

    // Get total count for pagination
    const totalCount = await Inventory.countDocuments(query);

    res.json({
      logs,
      warehouses: warehouseLocations,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        totalCount,
        totalPages: Math.ceil(totalCount / parseInt(limit)),
        hasMore: parseInt(page) * parseInt(limit) < totalCount
      },
      filters: { location, days, action }
    });
  } catch (error) {
    console.error('Error fetching inventory logs:', error);
    res.status(500).json({ 
      message: 'Error fetching inventory logs', 
      error: error.message 
    });
  }
});

module.exports = router;
