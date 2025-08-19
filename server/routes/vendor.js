const express = require('express');
const router = express.Router();
const Inventory = require('../models/Inventory');
const Delivery = require('../models/Delivery');
const Order = require('../models/Order');
const Notification = require('../models/Notification');
const protect = require('../middleware/authMiddleware');

// Middleware to restrict access to market vendors
const allowVendor = (req, res, next) => {
  if (req.user.role !== 'market_vendor') {
    return res.status(403).json({ message: 'Access denied. Market vendor role required.' });
  }
  next();
};

// @route   GET /api/vendor/expected-deliveries
// @desc    Get expected deliveries for vendor's location
router.get('/expected-deliveries', protect, allowVendor, async (req, res) => {
  try {
    const vendorLocation = req.user.location;
    
    const expectedDeliveries = await Delivery.find({
      $or: [
        { destination: vendorLocation },
        { dropoffLocation: vendorLocation }
      ],
      status: { $in: ['pending', 'in_transit', 'processing'] }
    }).populate('farmer', 'name email').sort({ createdAt: -1 });

    res.json(expectedDeliveries);
  } catch (error) {
    console.error('Error fetching expected deliveries:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   GET /api/vendor/market-inventory  
// @desc    Get market inventory for vendor's location
router.get('/market-inventory', protect, allowVendor, async (req, res) => {
  try {
    const vendorLocation = req.user.location;
    
    const marketInventory = await Inventory.find({
      location: vendorLocation,
      quantity: { $gt: 0 }
    }).sort({ createdAt: -1 });

    // Calculate market stats
    const totalItems = marketInventory.length;
    const totalValue = marketInventory.reduce((sum, item) => sum + (item.quantity * item.price || 0), 0);
    const lowStockItems = marketInventory.filter(item => item.quantity < 10).length;
    
    res.json({
      inventory: marketInventory,
      stats: {
        totalItems,
        totalValue,
        lowStockItems,
        averagePrice: totalItems > 0 ? (totalValue / totalItems).toFixed(2) : 0
      }
    });
  } catch (error) {
    console.error('Error fetching market inventory:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   GET /api/vendor/best-selling
// @desc    Get best selling items analytics
router.get('/best-selling', protect, allowVendor, async (req, res) => {
  try {
    const vendorLocation = req.user.location;
    
    // Aggregate best selling items based on delivery frequency
    const bestSelling = await Inventory.aggregate([
      { $match: { location: vendorLocation } },
      { 
        $group: {
          _id: '$itemName',
          totalSold: { $sum: '$quantity' },
          averagePrice: { $avg: '$price' },
          count: { $sum: 1 }
        }
      },
      { $sort: { totalSold: -1 } },
      { $limit: 10 },
      {
        $project: {
          itemName: '$_id',
          totalSold: 1,
          averagePrice: { $round: ['$averagePrice', 2] },
          count: 1,
          _id: 0
        }
      }
    ]);

    res.json(bestSelling);
  } catch (error) {
    console.error('Error fetching best selling items:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   GET /api/vendor/stock-alerts
// @desc    Get stock alerts for low inventory
router.get('/stock-alerts', protect, allowVendor, async (req, res) => {
  try {
    const vendorLocation = req.user.location;
    
    const lowStockItems = await Inventory.find({
      location: vendorLocation,
      quantity: { $lt: 10 } // Items with less than 10 units
    }).sort({ quantity: 1 });

    const criticalStockItems = await Inventory.find({
      location: vendorLocation,
      quantity: { $lt: 5 } // Items with less than 5 units
    }).sort({ quantity: 1 });

    res.json({
      lowStock: lowStockItems,
      criticalStock: criticalStockItems,
      alerts: {
        lowStockCount: lowStockItems.length,
        criticalStockCount: criticalStockItems.length,
        message: criticalStockItems.length > 0 ? 'Critical stock levels detected!' : 
                 lowStockItems.length > 0 ? 'Low stock levels detected' : 'All items well stocked'
      }
    });
  } catch (error) {
    console.error('Error fetching stock alerts:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   PUT /api/vendor/confirm-delivery/:deliveryId
// @desc    Confirm delivery receipt at vendor location
router.put('/confirm-delivery/:deliveryId', protect, allowVendor, async (req, res) => {
  try {
    const { deliveryId } = req.params;
    const { notes, receivedQuantity } = req.body;
    
    const delivery = await Delivery.findById(deliveryId);
    if (!delivery) {
      return res.status(404).json({ message: 'Delivery not found' });
    }

    // Verify vendor location matches delivery destination
    if (delivery.destination !== req.user.location && delivery.dropoffLocation !== req.user.location) {
      return res.status(403).json({ message: 'Unauthorized to confirm this delivery' });
    }

    // Update delivery status
    delivery.status = 'delivered';
    delivery.deliveredAt = new Date();
    delivery.receivedBy = req.user.id;
    delivery.deliveryNotes = notes || '';
    delivery.receivedQuantity = receivedQuantity || delivery.quantity;
    
    await delivery.save();

    // Create notification for farmer
    if (delivery.farmer) {
      await Notification.create({
        user: delivery.farmer,
        type: 'delivery_confirmed',
        title: 'Delivery Confirmed',
        message: `Your delivery to ${req.user.location} has been confirmed by the vendor.`,
        relatedId: delivery._id,
        relatedModel: 'Delivery'
      });
    }

    res.json({ message: 'Delivery confirmed successfully', delivery });
  } catch (error) {
    console.error('Error confirming delivery:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   PUT /api/vendor/market-inventory/:itemId
// @desc    Update market inventory item
router.put('/market-inventory/:itemId', protect, allowVendor, async (req, res) => {
  try {
    const { itemId } = req.params;
    const updates = req.body;
    
    const item = await Inventory.findById(itemId);
    if (!item) {
      return res.status(404).json({ message: 'Inventory item not found' });
    }

    // Verify vendor location matches item location
    if (item.location !== req.user.location) {
      return res.status(403).json({ message: 'Unauthorized to update this item' });
    }

    // Update allowed fields
    const allowedUpdates = ['quantity', 'price', 'description', 'qualityGrade'];
    allowedUpdates.forEach(field => {
      if (updates[field] !== undefined) {
        item[field] = updates[field];
      }
    });

    await item.save();

    res.json({ message: 'Inventory item updated successfully', item });
  } catch (error) {
    console.error('Error updating market inventory:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   POST /api/vendor/stock-alert
// @desc    Configure stock alert thresholds
router.post('/stock-alert', protect, allowVendor, async (req, res) => {
  try {
    const { itemName, minThreshold, criticalThreshold } = req.body;
    
    // For now, create a notification as a simple alert system
    await Notification.create({
      user: req.user.id,
      type: 'stock_alert_config',
      title: 'Stock Alert Configured',
      message: `Stock alert set for ${itemName}: Low at ${minThreshold}, Critical at ${criticalThreshold}`,
      data: {
        itemName,
        minThreshold,
        criticalThreshold,
        location: req.user.location
      }
    });

    res.json({ 
      message: 'Stock alert configured successfully',
      alert: {
        itemName,
        minThreshold,
        criticalThreshold,
        location: req.user.location
      }
    });
  } catch (error) {
    console.error('Error configuring stock alert:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
