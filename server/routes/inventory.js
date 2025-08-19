const express = require('express');
const router = express.Router();
const Inventory = require('../models/Inventory');
const protect = require('../middleware/authMiddleware');
const Warehouse = require('../models/Warehouse');
const Notification = require('../models/Notification');
const NotificationService = require('../services/notificationService');

// Middleware to restrict access by role
const allowRoles = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ message: 'Access denied' });
  }
  next();
};

// GET all inventory for logged-in user
router.get('/', protect, async (req, res) => {
  const inventory = await Inventory.find({ user: req.user.id });
  res.json(inventory);
});

// POST create inventory item with capacity limit
router.post('/', protect, allowRoles('farmer', 'warehouse_manager'), async (req, res) => {
  try {
    console.log('Adding inventory item:', req.body);
    const { itemName, quantity, unit, location, category, price, qualityGrade, qualityCertification, description, harvestDate, expiryDate } = req.body;

    // Check if warehouse has capacity set (more flexible for testing)
    let warehouse = await Warehouse.findOne({ location });
    
    // If warehouse doesn't exist, create a default one for testing
    if (!warehouse) {
      console.log(`Creating default warehouse for location: ${location}`);
      warehouse = new Warehouse({
        location: location,
        capacityLimit: 50000 // Default capacity
      });
      try {
        await warehouse.save();
        console.log(`✅ Created warehouse: ${location}`);
      } catch (err) {
        console.error('Error creating warehouse:', err);
        return res.status(500).json({ message: 'Error setting up warehouse location' });
      }
    }

    // Get current total quantity stored at this location
    const currentStock = await Inventory.aggregate([
      { $match: { location } },
      { $group: { _id: null, total: { $sum: "$quantity" } } }
    ]);
    const totalStored = currentStock[0]?.total || 0;
    const newQuantity = parseInt(quantity);
    const capacityLimit = warehouse.capacityLimit;
    
    console.log(`Capacity check: Current=${totalStored}, Adding=${newQuantity}, Limit=${capacityLimit}, Total would be=${totalStored + newQuantity}`);

    // Check if new quantity exceeds capacity
    if (totalStored + newQuantity > capacityLimit) {
      return res.status(400).json({
        message: `Cannot add ${newQuantity} ${unit}. Current stock: ${totalStored}, would become ${totalStored + newQuantity}, limit is ${capacityLimit} for ${location}.`
      });
    }

    const percentageUsed = ((totalStored + newQuantity) / capacityLimit) * 100;

if (percentageUsed >= 90) {
  await Notification.create({
    user: req.user.id,
    message: `⚠️ ${location} warehouse is at ${Math.round(percentageUsed)}% capacity.`
  });
}

const newItem = new Inventory({
    user: req.user.id,
    itemName,
    quantity: parseInt(quantity),
    unit,
    location,
    category: category || 'other',
    price: parseFloat(price) || 0,
    qualityGrade: qualityGrade || 'Standard',
    qualityCertification: qualityCertification || '',
    description: description || '',
    harvestDate: harvestDate ? new Date(harvestDate) : null,
    expiryDate: expiryDate ? new Date(expiryDate) : null,
    addedByRole: req.user.role
  });

    await newItem.save();
    console.log('Inventory item saved successfully:', newItem);
    
    // Create success notification
    try {
      await NotificationService.inventoryAdded(req.user.id, {
        id: newItem._id,
        itemName: newItem.itemName,
        quantity: newItem.quantity,
        unit: newItem.unit
      });
      console.log('📬 Inventory added notification created');
    } catch (notificationError) {
      console.error('Failed to create inventory notification:', notificationError);
      // Don't fail the request if notification fails
    }
    
    res.status(201).json(newItem);
  } catch (error) {
    console.error('Error adding inventory item:', error);
    res.status(500).json({ message: 'Error adding inventory item', error: error.message });
  }
});


// PUT update inventory item
router.put('/:id', protect, async (req, res) => {
  const item = await Inventory.findById(req.params.id);
  if (!item) return res.status(404).json({ message: 'Item not found' });
  if (item.user.toString() !== req.user.id) return res.status(403).json({ message: 'Not authorized' });

  Object.assign(item, req.body);
  await item.save();
  if (item.quantity <= 50) {
  await Notification.create({
    user: req.user.id,
    message: `Low stock alert: "${item.itemName}" has only ${item.quantity} units left.`
  });
}
  res.json(item);
});

// DELETE inventory item
router.delete('/:id', protect, async (req, res) => {
  const item = await Inventory.findById(req.params.id);
  if (!item) return res.status(404).json({ message: 'Item not found' });
  if (item.user.toString() !== req.user.id) return res.status(403).json({ message: 'Not authorized' });

  await item.deleteOne();
  res.json({ message: 'Item deleted' });
});

// Filter inventory by location (warehouse)
router.get('/location/:location', protect, async (req, res) => {
  const location = req.params.location;
  const items = await Inventory.find({ location });
  res.json(items);
});

// Total stock per warehouse
router.get('/analytics/total-per-location', protect, async (req, res) => {
  const totals = await Inventory.aggregate([
    {
      $group: {
        _id: "$location",
        totalQuantity: { $sum: "$quantity" },
        itemCount: { $sum: 1 }
      }
    },
    { $sort: { totalQuantity: -1 } }
  ]);

  res.json(totals);
});

// Item breakdown per warehouse
router.get('/analytics/items-per-location', protect, async (req, res) => {
  const breakdown = await Inventory.aggregate([
    {
      $group: {
        _id: { location: "$location", itemName: "$itemName" },
        quantity: { $sum: "$quantity" }
      }
    },
    {
      $group: {
        _id: "$_id.location",
        items: {
          $push: {
            itemName: "$_id.itemName",
            quantity: "$quantity"
          }
        }
      }
    }
  ]);

  res.json(breakdown);
});

// Logs of recent inventory additions (enhanced to include all activities)
router.get('/logs/recent', protect, async (req, res) => {
  try {
    const logs = await Inventory.find({ user: req.user.id })
      .sort({ createdAt: -1 })
      .limit(20)
      .select('itemName quantity location createdAt addedByRole')
      .lean();
    
    // Add action type for better logging
    const enhancedLogs = logs.map(log => ({
      ...log,
      action: `Added ${log.quantity} ${log.itemName} to ${log.location}`,
      type: 'inventory_add'
    }));
    
    res.json(enhancedLogs);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching logs', error: error.message });
  }
});

// Public view of inventory for vendors (only active items with quantity > 0)
router.get('/available', protect, async (req, res) => {
  if (req.user.role !== 'market_vendor') {
    return res.status(403).json({ message: 'Access denied' });
  }

  const items = await Inventory.find({ quantity: { $gt: 0 } }).select('itemName quantity unit location');
  res.json(items);
});

router.get('/logs/date-range', protect, async (req, res) => {
  const { from, to } = req.query;

  const logs = await Inventory.find({
    createdAt: {
      $gte: new Date(from),
      $lte: new Date(to)
    }
  })
    .sort({ createdAt: -1 })
    .select('itemName quantity unit location createdAt');

  res.json(logs);
});

// Comprehensive analytics endpoint
router.get('/analytics', protect, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get all inventory for this user
    const inventory = await Inventory.find({ user: userId });
    
    // Calculate basic metrics
    const totalItems = inventory.length;
    const totalQuantity = inventory.reduce((sum, item) => sum + (parseInt(item.quantity) || 0), 0);
    const averageQuantityPerItem = totalItems > 0 ? (totalQuantity / totalItems).toFixed(1) : 0;
    
    // Low stock items (less than 10)
    const lowStockItems = inventory.filter(item => parseInt(item.quantity) < 10);
    
    // Inventory by location
    const locationBreakdown = await Inventory.aggregate([
      { $match: { user: req.user._id } },
      { $group: {
        _id: '$location',
        totalQuantity: { $sum: '$quantity' },
        itemCount: { $sum: 1 },
        items: { $push: { itemName: '$itemName', quantity: '$quantity' } }
      }}
    ]);
    
    // Inventory trends (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const trendsData = await Inventory.aggregate([
      { $match: { user: req.user._id, createdAt: { $gte: thirtyDaysAgo } } },
      { $group: {
        _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
        dailyAdditions: { $sum: '$quantity' },
        itemsAdded: { $sum: 1 }
      }},
      { $sort: { '_id': 1 } }
    ]);
    
    // Format trends data for charts
    const inventoryTrends = trendsData.map(item => ({
      date: item._id,
      quantity: item.dailyAdditions,
      items: item.itemsAdded
    }));
    
    res.json({
      summary: {
        totalItems,
        totalQuantity,
        averageQuantityPerItem,
        lowStockCount: lowStockItems.length
      },
      lowStockItems,
      locationBreakdown,
      inventoryTrends,
      lastUpdated: new Date()
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching analytics', error: error.message });
  }
});

// Inventory trends over time
router.get('/analytics/trends', protect, async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - parseInt(days));
    
    const trends = await Inventory.aggregate([
      { $match: { user: req.user._id, createdAt: { $gte: daysAgo } } },
      { $group: {
        _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
        totalQuantity: { $sum: '$quantity' },
        itemsAdded: { $sum: 1 }
      }},
      { $sort: { '_id': 1 } }
    ]);
    
    // Fill in missing dates with zero values
    const result = [];
    const currentDate = new Date(daysAgo);
    const endDate = new Date();
    
    while (currentDate <= endDate) {
      const dateStr = currentDate.toISOString().split('T')[0];
      const existingData = trends.find(t => t._id === dateStr);
      
      result.push({
        name: dateStr,
        value: existingData ? existingData.totalQuantity : 0,
        items: existingData ? existingData.itemsAdded : 0
      });
      
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching trends', error: error.message });
  }
});

// Performance metrics
router.get('/analytics/performance', protect, async (req, res) => {
  try {
    const inventory = await Inventory.find({ user: req.user.id });
    const totalQuantity = inventory.reduce((sum, item) => sum + (parseInt(item.quantity) || 0), 0);
    
    // Get warehouse info for capacity calculation
    const Warehouse = require('../models/Warehouse');
    const warehouses = await Warehouse.find();
    const totalCapacity = warehouses.reduce((sum, wh) => sum + (wh.capacityLimit || 0), 0);
    const storageEfficiency = totalCapacity > 0 ? ((totalQuantity / totalCapacity) * 100).toFixed(1) : 0;
    
    // Calculate other metrics
    const lowStockCount = inventory.filter(item => parseInt(item.quantity) < 10).length;
    const lowStockPercentage = inventory.length > 0 ? ((lowStockCount / inventory.length) * 100).toFixed(1) : 0;
    
    res.json({
      storageEfficiency: parseFloat(storageEfficiency),
      totalItems: inventory.length,
      totalQuantity,
      lowStockPercentage: parseFloat(lowStockPercentage),
      averageQuantityPerItem: inventory.length > 0 ? (totalQuantity / inventory.length).toFixed(1) : 0
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching performance metrics', error: error.message });
  }
});

module.exports = router;
