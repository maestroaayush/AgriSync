const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const protect = require('../middleware/authMiddleware');
const Inventory = require('../models/Inventory');
const Delivery = require('../models/Delivery');
const Warehouse = require('../models/Warehouse');

// Get inventory trends over time
router.get('/inventory-trends', protect, async (req, res) => {
  try {
    const { from, to } = req.query;
    let dateFilter = {};
    
    if (from || to) {
      dateFilter.createdAt = {};
      if (from) dateFilter.createdAt.$gte = new Date(from);
      if (to) dateFilter.createdAt.$lte = new Date(to);
    }

    // Get inventory data grouped by date and item
    const inventoryData = await Inventory.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            itemName: '$itemName'
          },
          totalQuantity: { $sum: '$quantity' }
        }
      },
      { $sort: { '_id.date': 1 } }
    ]);

    // Transform data for frontend charts
    const trends = {};
    inventoryData.forEach(item => {
      const date = item._id.date;
      const itemName = item._id.itemName;
      
      if (!trends[date]) {
        trends[date] = { date };
      }
      trends[date][itemName] = item.totalQuantity;
    });

    res.json(Object.values(trends));
  } catch (error) {
    console.error('Inventory trends error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get warehouse metrics
router.get('/warehouse-metrics', protect, async (req, res) => {
  try {
    // Get total inventory count by location
    const inventoryByLocation = await Inventory.aggregate([
      {
        $group: {
          _id: '$location',
          totalItems: { $sum: 1 },
          totalQuantity: { $sum: '$quantity' }
        }
      }
    ]);

    // Get delivery metrics
    const deliveryMetrics = await Delivery.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    // Get warehouse capacity info with proper calculations
    const warehouses = await Warehouse.find({ isManuallyAdded: true });
    
    // Calculate actual current usage for each warehouse
    const warehouseMetrics = await Promise.all(warehouses.map(async (w) => {
      // Get total quantity stored in this warehouse location
      const inventoryTotal = await Inventory.aggregate([
        { $match: { location: w.location } },
        { $group: { _id: null, totalQuantity: { $sum: '$quantity' } } }
      ]);
      
      const currentUsage = inventoryTotal.length > 0 ? inventoryTotal[0].totalQuantity : 0;
      const utilizationRate = w.capacityLimit > 0 ? ((currentUsage / w.capacityLimit) * 100).toFixed(1) : 0;
      
      return {
        name: w.name || w.location,
        location: w.location,
        capacityLimit: w.capacityLimit,
        currentUsage: currentUsage,
        availableSpace: w.capacityLimit - currentUsage,
        utilizationRate: parseFloat(utilizationRate)
      };
    }));
    
    const metrics = {
      inventoryByLocation,
      deliveryMetrics,
      warehouses: warehouseMetrics
    };

    res.json(metrics);
  } catch (error) {
    console.error('Warehouse metrics error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get capacity trends over time
router.get('/capacity-trends', protect, async (req, res) => {
  try {
    const { from, to } = req.query;
    let dateFilter = {};
    
    if (from || to) {
      dateFilter.createdAt = {};
      if (from) dateFilter.createdAt.$gte = new Date(from);
      if (to) dateFilter.createdAt.$lte = new Date(to);
    }

    // Get daily capacity usage
    const capacityData = await Inventory.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            location: '$location'
          },
          totalQuantity: { $sum: '$quantity' }
        }
      },
      { $sort: { '_id.date': 1 } }
    ]);

    // Get warehouse capacities
    const warehouses = await Warehouse.find();
    const warehouseCapacities = {};
    warehouses.forEach(w => {
      warehouseCapacities[w.location] = w.capacityLimit;
    });

    // Transform data to include capacity percentages
    const trends = {};
    capacityData.forEach(item => {
      const date = item._id.date;
      const location = item._id.location;
      const capacity = warehouseCapacities[location] || 10000; // default capacity
      const percentage = ((item.totalQuantity / capacity) * 100).toFixed(1);
      
      if (!trends[date]) {
        trends[date] = { date };
      }
      trends[date][location] = {
        quantity: item.totalQuantity,
        capacity: capacity,
        percentage: parseFloat(percentage)
      };
    });

    res.json(Object.values(trends));
  } catch (error) {
    console.error('Capacity trends error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get transporter delivery trends over time
router.get('/transporter-trends', protect, async (req, res) => {
  try {
    const { from, to } = req.query;
    const transporterId = req.user.id;
    console.log('Transporter trends request for user:', transporterId);
    
    let dateFilter = {};
    if (from || to) {
      dateFilter.createdAt = {};
      if (from) dateFilter.createdAt.$gte = new Date(from);
      if (to) dateFilter.createdAt.$lte = new Date(to);
    }

    // First check all deliveries for this transporter
    const allDeliveries = await Delivery.find({ transporter: new mongoose.Types.ObjectId(transporterId) });
    console.log('Found deliveries for transporter:', allDeliveries.length);

    // Get delivery data grouped by date for the specific transporter
    const deliveryData = await Delivery.aggregate([
      { 
        $match: {
          ...dateFilter,
          transporter: new mongoose.Types.ObjectId(transporterId)
        }
      },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            status: '$status'
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.date': 1 } }
    ]);

    // Transform data for frontend charts
    const trends = {};
    deliveryData.forEach(item => {
      const date = item._id.date;
      const status = item._id.status;
      
      if (!trends[date]) {
        trends[date] = { date, total: 0, delivered: 0, in_transit: 0, assigned: 0 };
      }
      trends[date][status] = item.count;
      trends[date].total += item.count;
    });

    res.json(Object.values(trends));
  } catch (error) {
    console.error('Transporter trends error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get transporter performance metrics
router.get('/transporter-metrics', protect, async (req, res) => {
  try {
    const transporterId = req.user.id;
    
    // Get delivery statistics
    const deliveryStats = await Delivery.aggregate([
      { $match: { transporter: new mongoose.Types.ObjectId(transporterId) } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          avgQuantity: { $avg: '$quantity' }
        }
      }
    ]);

    // Calculate completion rate and on-time delivery
    const totalDeliveries = await Delivery.countDocuments({ transporter: new mongoose.Types.ObjectId(transporterId) });
    const completedDeliveries = await Delivery.countDocuments({ 
      transporter: new mongoose.Types.ObjectId(transporterId), 
      status: 'delivered' 
    });
    
    // Get recent deliveries for average delivery time calculation
    const recentDeliveries = await Delivery.find({ 
      transporter: new mongoose.Types.ObjectId(transporterId),
      status: 'delivered',
      updatedAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } // Last 30 days
    }).sort({ updatedAt: -1 }).limit(100);

    // Calculate average delivery time (simplified - using creation to completion time)
    let avgDeliveryTime = 0;
    if (recentDeliveries.length > 0) {
      const totalTime = recentDeliveries.reduce((sum, delivery) => {
        const createdAt = new Date(delivery.createdAt);
        const updatedAt = new Date(delivery.updatedAt);
        return sum + (updatedAt - createdAt);
      }, 0);
      avgDeliveryTime = Math.round(totalTime / recentDeliveries.length / (1000 * 60 * 60)); // Convert to hours
    }

    // Mock fuel efficiency data (in a real app, this would come from vehicle telemetry)
    const fuelEfficiency = {
      avgFuelEconomy: (Math.random() * 5 + 10).toFixed(1), // 10-15 km/l
      monthlyFuelCost: Math.round(Math.random() * 10000 + 15000), // 15k-25k INR
      co2Emissions: Math.round(Math.random() * 200 + 300), // 300-500 kg
      totalDistance: Math.round(Math.random() * 5000 + 10000) // 10k-15k km
    };

    const metrics = {
      deliveryStats,
      totalDeliveries,
      completedDeliveries,
      completionRate: totalDeliveries > 0 ? ((completedDeliveries / totalDeliveries) * 100).toFixed(1) : 0,
      avgDeliveryTime: avgDeliveryTime || 24, // Default 24 hours if no data
      onTimeDeliveryRate: (Math.random() * 20 + 75).toFixed(1), // Mock 75-95%
      fuelEfficiency
    };

    res.json(metrics);
  } catch (error) {
    console.error('Transporter metrics error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
