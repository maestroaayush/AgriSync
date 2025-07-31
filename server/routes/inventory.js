const express = require('express');
const router = express.Router();
const Inventory = require('../models/Inventory');
const protect = require('../middleware/authMiddleware');
const Warehouse = require('../models/Warehouse');
const Notification = require('../models/Notification');

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
  const { itemName, quantity, unit, location } = req.body;

  // Check if warehouse has capacity set
  const warehouse = await Warehouse.findOne({ location });
  if (!warehouse) return res.status(400).json({ message: 'Warehouse not registered' });

  // Get current total quantity stored at this location
  const currentStock = await Inventory.aggregate([
    { $match: { location } },
    { $group: { _id: null, total: { $sum: "$quantity" } } }
  ]);
  const totalStored = currentStock[0]?.total || 0;

  // Check if new quantity exceeds capacity
  if (totalStored + quantity > warehouse.capacityLimit) {
    return res.status(400).json({
      message: `Cannot add ${quantity} ${unit}. This would exceed the capacity limit of ${warehouse.capacityLimit} for ${location}.`
    });
  }

const percentageUsed = ((totalStored + quantity) / warehouse.capacityLimit) * 100;

if (percentageUsed >= 90) {
  await Notification.create({
    user: req.user.id,
    message: `⚠️ ${location} warehouse is at ${Math.round(percentageUsed)}% capacity.`
  });
}

const newItem = new Inventory({
    user: req.user.id,
    itemName,
    quantity,
    unit,
    location,
    addedByRole: req.user.role
  });

  await newItem.save();
  res.status(201).json(newItem);
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

  await Inventory.deleteOne({ _id: req.params.id });
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

// Logs of recent inventory additions with pagination
router.get('/logs/recent', protect, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const logs = await Inventory.find({ addedByRole: 'warehouse_manager' })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select('itemName quantity location createdAt');

    const total = await Inventory.countDocuments({ addedByRole: 'warehouse_manager' });
    const totalPages = Math.ceil(total / limit);

    res.json({
      logs,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems: total,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch logs', error: error.message });
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

module.exports = router;
