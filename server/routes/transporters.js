const express = require('express');
const router = express.Router();
const User = require('../models/user');
const Delivery = require('../models/Delivery');
const protect = require('../middleware/authMiddleware');

// @route   GET /api/transporters/locations
// @desc    Get current locations of all transporters (Admin only)
router.get('/locations', protect, async (req, res) => {
  try {
    // Allow admins and farmers (for delivery tracking)
    if (!['admin', 'farmer'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied. Admin or farmer role required.' });
    }

    // Fetch all transporters
    const transporters = await User.find({ role: 'transporter' }).select('-password');

    res.json(transporters.map(transporter => ({
      name: transporter.name,
      email: transporter.email,
      location: transporter.currentLocation,
      coordinates: transporter.currentLocation ? [
        transporter.currentLocation.latitude,
        transporter.currentLocation.longitude
      ] : transporter.coordinates || [19.0760, 72.8777], // Default to Mumbai if no location
      status: transporter.currentLocation?.isOnline ? 'available' : 'offline',
      lastUpdated: transporter.currentLocation?.lastUpdated
    })));
  } catch (err) {
    console.error('Error fetching transporter locations:', err);
    res.status(500).json({ message: 'Server error fetching transporter locations' });
  }
});

// @route   GET /api/transporters/routes
// @desc    Get all routes with full location data (Admin only)
router.get('/routes', protect, async (req, res) => {
  try {
    // Validate that the user is an admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admin role required.' });
    }

    // Fetch all deliveries with transporter routes
    const deliveries = await Delivery.find({}).populate('farmer transporter', '-password');

    const routes = deliveries.map(delivery => ({
      id: delivery._id,
      transporter: delivery.transporter ? {
        id: delivery.transporter._id,
        name: delivery.transporter.name,
        email: delivery.transporter.email,
        currentLocation: delivery.transporter.currentLocation,
        baseLocation: delivery.transporter.coordinates
      } : null,
      farmer: {
        id: delivery.farmer._id,
        name: delivery.farmer.name,
        email: delivery.farmer.email,
        location: delivery.farmer.coordinates,
      },
      pickupLocation: {
        name: delivery.pickupLocation,
        coordinates: {
          latitude: delivery.pickupLat,
          longitude: delivery.pickupLng
        }
      },
      dropoffLocation: {
        name: delivery.dropoffLocation,
        coordinates: {
          latitude: delivery.dropoffLat,
          longitude: delivery.dropoffLng
        }
      },
      currentLocation: delivery.currentLocation,
      status: delivery.status,
      urgency: delivery.urgency,
      goodsDescription: delivery.goodsDescription,
      quantity: delivery.quantity,
      estimatedDistance: delivery.estimatedDistance,
      estimatedTime: delivery.estimatedTime,
      createdAt: delivery.createdAt,
      updatedAt: delivery.updatedAt
    }));

    res.json(routes);
  } catch (err) {
    console.error('Error fetching transporter routes:', err);
    res.status(500).json({ message: 'Server error fetching transporter routes.' });
  }
});

// @route   GET /api/transporters/dashboard
// @desc    Get comprehensive dashboard data for admin location tracking
router.get('/dashboard', protect, async (req, res) => {
  try {
    // Validate that the user is an admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admin role required.' });
    }

    // Fetch all users with locations
    const farmers = await User.find({ role: 'farmer' }).select('-password');
    const transporters = await User.find({ role: 'transporter' }).select('-password');
    const warehouseManagers = await User.find({ role: 'warehouse_manager' }).select('-password');
    const marketVendors = await User.find({ role: 'market_vendor' }).select('-password');

    // Fetch active deliveries
    const activeDeliveries = await Delivery.find({ 
      status: { $in: ['assigned', 'in_transit'] } 
    }).populate('farmer transporter', '-password');

    // Fetch recent deliveries (last 7 days)
    const recentDeliveries = await Delivery.find({
      createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
    }).populate('farmer transporter', '-password');

    const dashboardData = {
      summary: {
        totalTransporters: transporters.length,
        activeTransporters: transporters.filter(t => t.currentLocation?.isOnline).length,
        totalFarmers: farmers.length,
        totalWarehouseManagers: warehouseManagers.length,
        totalMarketVendors: marketVendors.length,
        activeDeliveries: activeDeliveries.length,
        recentDeliveries: recentDeliveries.length
      },
      locations: {
        farmers: farmers.map(farmer => ({
          id: farmer._id,
          name: farmer.name,
          email: farmer.email,
          location: farmer.location,
          coordinates: farmer.coordinates,
          role: 'farmer'
        })),
        transporters: transporters.map(transporter => ({
          id: transporter._id,
          name: transporter.name,
          email: transporter.email,
          location: transporter.location,
          coordinates: transporter.coordinates,
          currentLocation: transporter.currentLocation,
          role: 'transporter',
          isOnline: transporter.currentLocation?.isOnline || false
        })),
        warehouseManagers: warehouseManagers.map(manager => ({
          id: manager._id,
          name: manager.name,
          email: manager.email,
          location: manager.location,
          coordinates: manager.coordinates,
          role: 'warehouse_manager'
        })),
        marketVendors: marketVendors.map(vendor => ({
          id: vendor._id,
          name: vendor.name,
          email: vendor.email,
          location: vendor.location,
          coordinates: vendor.coordinates,
          role: 'market_vendor'
        }))
      },
      activeDeliveries: activeDeliveries.map(delivery => ({
        id: delivery._id,
        transporter: delivery.transporter ? {
          name: delivery.transporter.name,
          currentLocation: delivery.transporter.currentLocation
        } : null,
        farmer: {
          name: delivery.farmer.name,
          location: delivery.farmer.coordinates
        },
        pickupLocation: {
          name: delivery.pickupLocation,
          coordinates: { latitude: delivery.pickupLat, longitude: delivery.pickupLng }
        },
        dropoffLocation: {
          name: delivery.dropoffLocation,
          coordinates: { latitude: delivery.dropoffLat, longitude: delivery.dropoffLng }
        },
        status: delivery.status,
        urgency: delivery.urgency,
        goodsDescription: delivery.goodsDescription,
        quantity: delivery.quantity,
        estimatedDistance: delivery.estimatedDistance,
        estimatedTime: delivery.estimatedTime
      }))
    };

    res.json(dashboardData);
  } catch (err) {
    console.error('Error fetching dashboard data:', err);
    res.status(500).json({ message: 'Server error fetching dashboard data.' });
  }
});

// @route   PUT /api/transporters/:id/location
// @desc    Update transporter's current location (Admin only)
router.put('/:id/location', protect, async (req, res) => {
  try {
    // Validate that the user is an admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admin role required.' });
    }

    const { latitude, longitude, address, isOnline } = req.body;

    // Validate coordinates
    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      return res.status(400).json({ message: 'Invalid coordinates provided.' });
    }

    const transporter = await User.findById(req.params.id);
    if (!transporter || transporter.role !== 'transporter') {
      return res.status(404).json({ message: 'Transporter not found.' });
    }

    // Update current location
    transporter.currentLocation = {
      latitude,
      longitude,
      address: address || transporter.currentLocation?.address,
      lastUpdated: new Date(),
      isOnline: isOnline !== undefined ? isOnline : true
    };

    await transporter.save();

    res.json({
      message: 'Transporter location updated successfully.',
      transporter: {
        id: transporter._id,
        name: transporter.name,
        currentLocation: transporter.currentLocation
      }
    });
  } catch (err) {
    console.error('Error updating transporter location:', err);
    res.status(500).json({ message: 'Server error updating transporter location.' });
  }
});

module.exports = router;
