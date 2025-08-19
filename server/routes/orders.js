const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const protect = require('../middleware/authMiddleware');
const OrderFulfillmentService = require('../services/orderFulfillmentService');
const allowRoles = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) return res.status(403).json({ message: 'Access denied' });
  next();
};

/**
 * @route   POST /api/orders
 * @desc    Create a new vendor order
 * @access  Private (Market Vendors only)
 */
router.post('/', protect, allowRoles('market_vendor'), async (req, res) => {
  try {
    const order = await OrderFulfillmentService.createVendorOrder(req.body, req.user.id);
    
    res.status(201).json({
      success: true,
      message: 'Order created successfully',
      data: order
    });
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to create order'
    });
  }
});

/**
 * @route   PUT /api/orders/:id/approve
 * @desc    Approve an order
 * @access  Private (Warehouse Managers, Admins)
 */
router.put('/:id/approve', protect, allowRoles('warehouse_manager', 'admin'), async (req, res) => {
  try {
    const { agreedPrice, warehouseNotes } = req.body;
    
    const order = await OrderFulfillmentService.approveOrder(
      req.params.id,
      req.user.id,
      { agreedPrice, warehouseNotes }
    );
    
    res.json({
      success: true,
      message: 'Order approved successfully',
      data: order
    });
  } catch (error) {
    console.error('Error approving order:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to approve order'
    });
  }
});

/**
 * @route   PUT /api/orders/:id/reject
 * @desc    Reject an order
 * @access  Private (Warehouse Managers, Admins)
 */
router.put('/:id/reject', protect, allowRoles('warehouse_manager', 'admin'), async (req, res) => {
  try {
    const { rejectionReason } = req.body;
    
    if (!rejectionReason) {
      return res.status(400).json({
        success: false,
        message: 'Rejection reason is required'
      });
    }
    
    const order = await OrderFulfillmentService.rejectOrder(
      req.params.id,
      req.user.id,
      rejectionReason
    );
    
    res.json({
      success: true,
      message: 'Order rejected successfully',
      data: order
    });
  } catch (error) {
    console.error('Error rejecting order:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to reject order'
    });
  }
});

/**
 * @route   PUT /api/orders/:id/fulfill
 * @desc    Fulfill an order and create delivery
 * @access  Private (Warehouse Managers, Admins)
 */
router.put('/:id/fulfill', protect, allowRoles('warehouse_manager', 'admin'), async (req, res) => {
  try {
    const { notes } = req.body;
    
    const delivery = await OrderFulfillmentService.fulfillOrder(
      req.params.id,
      req.user.id,
      { notes }
    );
    
    res.json({
      success: true,
      message: 'Order fulfilled successfully, delivery created',
      data: delivery
    });
  } catch (error) {
    console.error('Error fulfilling order:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to fulfill order'
    });
  }
});

/**
 * @route   GET /api/orders/inventory/:location
 * @desc    Get available inventory for ordering
 * @access  Private (Market Vendors)
 */
router.get('/inventory/:location', protect, allowRoles('market_vendor'), async (req, res) => {
  try {
    const { itemName, category, minQuantity } = req.query;
    const filters = { itemName, category, minQuantity };
    
    const inventory = await OrderFulfillmentService.getAvailableInventory(
      req.params.location,
      filters
    );
    
    res.json({
      success: true,
      data: inventory,
      count: inventory.length
    });
  } catch (error) {
    console.error('Error fetching inventory:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch inventory'
    });
  }
});

/**
 * @route   GET /api/orders/analytics
 * @desc    Get order analytics for dashboard
 * @access  Private (Warehouse Managers, Admins)
 */
router.get('/analytics', protect, allowRoles('warehouse_manager', 'admin'), async (req, res) => {
  try {
    let warehouseLocation = null;
    
    // Warehouse managers can only see their own warehouse analytics
    if (req.user.role === 'warehouse_manager') {
      warehouseLocation = req.user.location;
    }
    
    const analytics = await OrderFulfillmentService.getOrderAnalytics(warehouseLocation);
    
    res.json({
      success: true,
      data: analytics
    });
  } catch (error) {
    console.error('Error fetching order analytics:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch analytics'
    });
  }
});

/**
 * @route   GET /api/orders/warehouses/locations
 * @desc    Get list of warehouse locations for vendor ordering
 * @access  Private (Market Vendors)
 */
router.get('/warehouses/locations', protect, allowRoles('market_vendor'), async (req, res) => {
  try {
    const Warehouse = require('../models/Warehouse');
    const warehouses = await Warehouse.find({})
      .select('location capacityLimit coordinates')
      .sort({ location: 1 });
    
    res.json({
      success: true,
      data: warehouses
    });
  } catch (error) {
    console.error('Error fetching warehouse locations:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch warehouse locations'
    });
  }
});

/**
 * @route   GET /api/orders/status/counts
 * @desc    Get order status counts for dashboard
 * @access  Private (Warehouse Managers, Admins)
 */
router.get('/status/counts', protect, allowRoles('warehouse_manager', 'admin'), async (req, res) => {
  try {
    let query = {};
    
    // Warehouse managers can only see their own warehouse orders
    if (req.user.role === 'warehouse_manager') {
      query.warehouseLocation = req.user.location;
    }
    
    const counts = await Order.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);
    
    // Convert to object format
    const statusCounts = {
      pending: 0,
      approved: 0,
      fulfilled: 0,
      in_delivery: 0,
      delivered: 0,
      rejected: 0,
      cancelled: 0
    };
    
    counts.forEach(item => {
      statusCounts[item._id] = item.count;
    });
    
    res.json({
      success: true,
      data: statusCounts
    });
  } catch (error) {
    console.error('Error fetching order status counts:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch status counts'
    });
  }
});

/**
 * @route   GET /api/orders
 * @desc    Get orders based on user role and status
 * @access  Private (Vendors, Warehouse Managers, Admins)
 */
router.get('/', protect, allowRoles('market_vendor', 'warehouse_manager', 'admin', 'farmer'), async (req, res) => {
  try {
    const { status } = req.query;
    const orders = await OrderFulfillmentService.getOrdersByRole(
      req.user.id,
      req.user.role,
      status
    );
    
    res.json({
      success: true,
      data: orders,
      count: orders.length
    });
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch orders'
    });
  }
});

/**
 * @route   GET /api/orders/:id
 * @desc    Get a specific order by ID
 * @access  Private (Vendors, Warehouse Managers, Admins)
 */
router.get('/:id', protect, allowRoles('market_vendor', 'warehouse_manager', 'admin'), async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('vendor', 'name email location')
      .populate('warehouse', 'name location')
      .populate('delivery', 'status transporter currentLocation estimatedDeliveryTime')
      .populate('approvedBy', 'name email')
      .populate('fulfilledBy', 'name email');
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Check access permissions
    const hasAccess = 
      req.user.role === 'admin' ||
      (req.user.role === 'market_vendor' && order.vendor._id.toString() === req.user.id) ||
      (req.user.role === 'warehouse_manager' && order.warehouseLocation === req.user.location);

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }
    
    res.json({
      success: true,
      data: order
    });
  } catch (error) {
    console.error('Error fetching order:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch order'
    });
  }
});


/**
 * @route   PUT /api/orders/:id/cancel
 * @desc    Cancel an order (vendor only, pending orders only)
 * @access  Private (Market Vendors)
 */
router.put('/:id/cancel', protect, allowRoles('market_vendor'), async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Check if vendor owns this order
    if (order.vendor.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Can only cancel pending orders
    if (order.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Cannot cancel order with status: ${order.status}`
      });
    }

    // Release reserved inventory
    await OrderFulfillmentService.releaseReservedInventory(order);

    // Update order status
    order.status = 'cancelled';
    order.cancelledAt = new Date();
    order.cancellationReason = req.body.reason || 'Cancelled by vendor';
    await order.save();

    // Notify warehouse manager
    const User = require('../models/user');
    const warehouseManager = await User.findOne({
      role: 'warehouse_manager',
      location: order.warehouseLocation
    });

    if (warehouseManager) {
      const NotificationService = require('../services/notificationService');
      await NotificationService.general(
        warehouseManager._id,
        '❌ Order Cancelled',
        `Order ${order._id} for ${order.itemName} has been cancelled by the vendor.`,
        'warning'
      );
    }
    
    res.json({
      success: true,
      message: 'Order cancelled successfully',
      data: order
    });
  } catch (error) {
    console.error('Error cancelling order:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to cancel order'
    });
  }
});


module.exports = router;
