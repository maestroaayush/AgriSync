const Order = require('../models/Order');
const Inventory = require('../models/Inventory');
const Delivery = require('../models/Delivery');
const User = require('../models/user');
const Warehouse = require('../models/Warehouse');
const NotificationService = require('./notificationService');
const WarehouseService = require('./warehouseService');

class OrderFulfillmentService {
  /**
   * Create a new vendor order
   * @param {Object} orderData - Order information
   * @param {string} vendorId - ID of the vendor placing the order
   * @returns {Object} Created order
   */
  static async createVendorOrder(orderData, vendorId) {
    try {
      console.log('📝 Creating vendor order:', { orderData, vendorId });

      const {
        itemName,
        quantity,
        unit,
        warehouseLocation,
        vendorLocation,
        requestedPrice,
        priority,
        vendorNotes,
        qualityRequirements,
        requestedDeliveryDate
      } = orderData;

      // Validate vendor
      const vendor = await User.findById(vendorId);
      if (!vendor || vendor.role !== 'market_vendor') {
        throw new Error('Invalid vendor');
      }

      // Find warehouse
      const warehouse = await Warehouse.findOne({ location: warehouseLocation });
      if (!warehouse) {
        throw new Error(`Warehouse not found at location: ${warehouseLocation}`);
      }

      // Check available inventory
      const availableInventory = await Inventory.find({
        location: warehouseLocation,
        itemName: { $regex: new RegExp(itemName, 'i') },
        status: 'available',
        quantity: { $gt: 0 }
      }).sort({ createdAt: -1 });

      const totalAvailable = availableInventory.reduce((sum, item) => sum + item.quantity, 0);
      
      if (totalAvailable < quantity) {
        throw new Error(`Insufficient inventory. Available: ${totalAvailable} ${unit}, Requested: ${quantity} ${unit}`);
      }

      // Create order
      const order = new Order({
        vendor: vendorId,
        itemName,
        quantity,
        unit,
        requestedPrice,
        warehouseLocation,
        warehouse: warehouse._id,
        vendorLocation: vendorLocation || vendor.location,
        priority: priority || 'normal',
        vendorNotes,
        qualityRequirements,
        requestedDeliveryDate: requestedDeliveryDate ? new Date(requestedDeliveryDate) : null
      });

      await order.save();

      console.log('✅ Order created successfully:', order._id);

      // Reserve inventory items
      await this.reserveInventoryForOrder(order, availableInventory);

      // Notify warehouse manager
      const warehouseManager = await WarehouseService.getWarehouseManager(warehouseLocation);
      if (warehouseManager) {
        await NotificationService.general(
          warehouseManager._id,
          '🛒 New Vendor Order',
          `New order from ${vendor.name}: ${quantity} ${unit} of ${itemName}. Priority: ${priority}. Please review for approval.`,
          'info'
        );
      }

      // Notify admins
      const admins = await User.find({ role: 'admin' }).select('_id');
      for (const admin of admins) {
        await NotificationService.general(
          admin._id,
          '📋 New Vendor Order',
          `Vendor ${vendor.name} placed order for ${quantity} ${unit} of ${itemName} from ${warehouseLocation}. Requires approval.`,
          'info'
        );
      }

      return order;
    } catch (error) {
      console.error('❌ Error creating vendor order:', error);
      throw error;
    }
  }

  /**
   * Reserve inventory items for an order
   * @param {Object} order - The order object
   * @param {Array} availableInventory - Available inventory items
   */
  static async reserveInventoryForOrder(order, availableInventory) {
    try {
      console.log('🔒 Reserving inventory for order:', order._id);

      let remainingQuantity = order.quantity;
      const reservations = [];

      for (const inventoryItem of availableInventory) {
        if (remainingQuantity <= 0) break;

        const reserveQuantity = Math.min(remainingQuantity, inventoryItem.quantity);
        
        // Mark inventory as reserved
        inventoryItem.status = 'reserved';
        await inventoryItem.save();

        reservations.push({
          inventoryId: inventoryItem._id,
          reservedQuantity: reserveQuantity,
          reservedAt: new Date()
        });

        remainingQuantity -= reserveQuantity;
      }

      order.reservedInventoryItems = reservations;
      await order.save();

      console.log('✅ Inventory reserved successfully');
    } catch (error) {
      console.error('❌ Error reserving inventory:', error);
      throw error;
    }
  }

  /**
   * Approve an order (warehouse manager or admin)
   * @param {string} orderId - Order ID
   * @param {string} approverId - ID of the user approving
   * @param {Object} approvalData - Approval details
   * @returns {Object} Updated order
   */
  static async approveOrder(orderId, approverId, approvalData = {}) {
    try {
      console.log('✅ Approving order:', { orderId, approverId });

      const order = await Order.findById(orderId)
        .populate('vendor', 'name email location')
        .populate('warehouse');

      if (!order || order.status !== 'pending') {
        throw new Error('Order not found or not pending');
      }

      // Update order status
      order.status = 'approved';
      order.approvedBy = approverId;
      order.approvedAt = new Date();
      order.agreedPrice = approvalData.agreedPrice || order.requestedPrice;
      order.totalCost = (approvalData.agreedPrice || order.requestedPrice) * order.quantity;
      order.warehouseNotes = approvalData.warehouseNotes || '';

      await order.save();

      // Notify vendor
      await NotificationService.general(
        order.vendor._id,
        '✅ Order Approved',
        `Your order for ${order.quantity} ${order.unit} of ${order.itemName} has been approved. Total cost: $${order.totalCost}. Delivery will be arranged shortly.`,
        'success'
      );

      console.log('✅ Order approved successfully');
      return order;
    } catch (error) {
      console.error('❌ Error approving order:', error);
      throw error;
    }
  }

  /**
   * Reject an order
   * @param {string} orderId - Order ID
   * @param {string} rejecterId - ID of the user rejecting
   * @param {string} rejectionReason - Reason for rejection
   * @returns {Object} Updated order
   */
  static async rejectOrder(orderId, rejecterId, rejectionReason) {
    try {
      console.log('❌ Rejecting order:', { orderId, rejecterId, rejectionReason });

      const order = await Order.findById(orderId).populate('vendor', 'name email');
      if (!order || order.status !== 'pending') {
        throw new Error('Order not found or not pending');
      }

      // Release reserved inventory
      await this.releaseReservedInventory(order);

      // Update order status
      order.status = 'rejected';
      order.rejectionReason = rejectionReason;
      order.approvedBy = rejecterId; // Track who rejected it
      order.approvedAt = new Date();

      await order.save();

      // Notify vendor
      await NotificationService.general(
        order.vendor._id,
        '❌ Order Rejected',
        `Your order for ${order.quantity} ${order.unit} of ${order.itemName} has been rejected. Reason: ${rejectionReason}`,
        'error'
      );

      console.log('❌ Order rejected successfully');
      return order;
    } catch (error) {
      console.error('❌ Error rejecting order:', error);
      throw error;
    }
  }

  /**
   * Fulfill an order and create delivery
   * @param {string} orderId - Order ID
   * @param {string} fulfillerId - ID of the user fulfilling
   * @param {Object} fulfillmentData - Fulfillment details
   * @returns {Object} Created delivery
   */
  static async fulfillOrder(orderId, fulfillerId, fulfillmentData = {}) {
    try {
      console.log('📦 Fulfilling order and creating delivery:', { orderId, fulfillerId });

      const order = await Order.findById(orderId)
        .populate('vendor', 'name email location coordinates')
        .populate('warehouse');

      if (!order || order.status !== 'approved') {
        throw new Error('Order not found or not approved');
      }

      // Deduct from inventory
      await this.deductInventoryForFulfillment(order);

      // Create delivery from warehouse to vendor
      const deliveryData = {
        vendor: order.vendor._id,
        requestedBy: order.vendor._id,
        requesterType: 'market_vendor',
        pickupLocation: order.warehouseLocation,
        dropoffLocation: order.vendorLocation,
        goodsDescription: order.itemName,
        quantity: order.quantity,
        unit: order.unit,
        status: 'pending',
        urgency: this.mapPriorityToUrgency(order.priority),
        pickupCoordinates: order.warehouse?.coordinates,
        dropoffCoordinates: order.vendor?.coordinates,
        notes: `Order fulfillment for order ${order._id}. ${fulfillmentData.notes || ''}`
      };

      const delivery = new Delivery(deliveryData);
      await delivery.save();

      // Update order status
      order.status = 'fulfilled';
      order.fulfilledBy = fulfillerId;
      order.fulfilledAt = new Date();
      order.delivery = delivery._id;

      await order.save();

      // Notify vendor
      await NotificationService.general(
        order.vendor._id,
        '📦 Order Fulfilled',
        `Your order has been fulfilled! ${order.quantity} ${order.unit} of ${order.itemName} is ready for delivery. Delivery ID: ${delivery._id}`,
        'success'
      );

      // Notify admins about new delivery request
      const admins = await User.find({ role: 'admin' }).select('_id');
      for (const admin of admins) {
        await NotificationService.general(
          admin._id,
          '🚛 New Delivery Request (Order Fulfillment)',
          `Order ${order._id} fulfilled - delivery needed from ${order.warehouseLocation} to ${order.vendorLocation}. Item: ${order.itemName}`,
          'info'
        );
      }

      console.log('✅ Order fulfilled and delivery created:', delivery._id);
      return delivery;
    } catch (error) {
      console.error('❌ Error fulfilling order:', error);
      throw error;
    }
  }

  /**
   * Deduct inventory for order fulfillment
   * @param {Object} order - The order object
   */
  static async deductInventoryForFulfillment(order) {
    try {
      console.log('📉 Deducting inventory for order fulfillment:', order._id);

      for (const reservation of order.reservedInventoryItems) {
        const inventoryItem = await Inventory.findById(reservation.inventoryId);
        if (inventoryItem) {
          inventoryItem.quantity -= reservation.reservedQuantity;
          
          if (inventoryItem.quantity <= 0) {
            inventoryItem.quantity = 0;
            inventoryItem.status = 'sold';
          } else {
            inventoryItem.status = 'available'; // Return to available if quantity remains
          }
          
          await inventoryItem.save();
        }
      }

      console.log('✅ Inventory deducted successfully');
    } catch (error) {
      console.error('❌ Error deducting inventory:', error);
      throw error;
    }
  }

  /**
   * Release reserved inventory (when order is rejected or cancelled)
   * @param {Object} order - The order object
   */
  static async releaseReservedInventory(order) {
    try {
      console.log('🔓 Releasing reserved inventory for order:', order._id);

      for (const reservation of order.reservedInventoryItems) {
        const inventoryItem = await Inventory.findById(reservation.inventoryId);
        if (inventoryItem && inventoryItem.status === 'reserved') {
          inventoryItem.status = 'available';
          await inventoryItem.save();
        }
      }

      console.log('✅ Reserved inventory released successfully');
    } catch (error) {
      console.error('❌ Error releasing reserved inventory:', error);
      throw error;
    }
  }

  /**
   * Get available inventory for vendor ordering
   * @param {string} warehouseLocation - Warehouse location
   * @param {Object} filters - Search filters
   * @returns {Array} Available inventory items
   */
  static async getAvailableInventory(warehouseLocation, filters = {}) {
    try {
      const query = {
        location: warehouseLocation,
        status: 'available',
        quantity: { $gt: 0 }
      };

      if (filters.itemName) {
        query.itemName = { $regex: new RegExp(filters.itemName, 'i') };
      }

      if (filters.category) {
        query.category = filters.category;
      }

      if (filters.minQuantity) {
        query.quantity = { ...query.quantity, $gte: filters.minQuantity };
      }

      const inventory = await Inventory.find(query)
        .populate('user', 'name')
        .sort({ createdAt: -1 });

      return inventory;
    } catch (error) {
      console.error('❌ Error fetching available inventory:', error);
      throw error;
    }
  }

  /**
   * Get orders by status for different user roles
   * @param {string} userId - User ID
   * @param {string} userRole - User role
   * @param {string} status - Order status filter
   * @returns {Array} Orders
   */
  static async getOrdersByRole(userId, userRole, status = null) {
    try {
      let query = {};

      switch (userRole) {
        case 'market_vendor':
          query.vendor = userId;
          break;
        case 'warehouse_manager':
          // Get user's location and find orders for their warehouse
          const warehouseManager = await User.findById(userId);
          query.warehouseLocation = warehouseManager.location;
          break;
        case 'admin':
          // Admins can see all orders
          break;
        default:
          throw new Error('Unauthorized role for order access');
      }

      if (status && status !== 'all') {
        query.status = status;
      }

      const orders = await Order.find(query)
        .populate('vendor', 'name email location')
        .populate('warehouse', 'name location')
        .populate('delivery', 'status transporter currentLocation')
        .sort({ createdAt: -1 });

      return orders;
    } catch (error) {
      console.error('❌ Error fetching orders by role:', error);
      throw error;
    }
  }

  /**
   * Get order analytics for dashboard
   * @param {string} warehouseLocation - Warehouse location (optional)
   * @returns {Object} Order analytics
   */
  static async getOrderAnalytics(warehouseLocation = null) {
    try {
      const query = warehouseLocation ? { warehouseLocation } : {};
      
      const orders = await Order.find(query);
      
      const analytics = {
        total: orders.length,
        pending: orders.filter(o => o.status === 'pending').length,
        approved: orders.filter(o => o.status === 'approved').length,
        fulfilled: orders.filter(o => o.status === 'fulfilled').length,
        delivered: orders.filter(o => o.status === 'delivered').length,
        rejected: orders.filter(o => o.status === 'rejected').length,
        revenue: orders.filter(o => o.status === 'delivered').reduce((sum, o) => sum + (o.totalCost || 0), 0),
        averageOrderValue: 0,
        fulfillmentRate: 0
      };

      if (analytics.total > 0) {
        analytics.averageOrderValue = analytics.revenue / Math.max(1, analytics.delivered);
        analytics.fulfillmentRate = ((analytics.fulfilled + analytics.delivered) / analytics.total * 100).toFixed(1);
      }

      return analytics;
    } catch (error) {
      console.error('❌ Error generating order analytics:', error);
      throw error;
    }
  }

  /**
   * Map order priority to delivery urgency
   * @param {string} priority - Order priority
   * @returns {string} Delivery urgency
   */
  static mapPriorityToUrgency(priority) {
    const mapping = {
      'low': 'low',
      'normal': 'normal',
      'high': 'high',
      'urgent': 'urgent'
    };
    return mapping[priority] || 'normal';
  }

  /**
   * Update order status when delivery status changes
   * @param {string} orderId - Order ID
   * @param {string} deliveryStatus - New delivery status
   */
  static async updateOrderFromDeliveryStatus(orderId, deliveryStatus) {
    try {
      const order = await Order.findById(orderId);
      if (!order) return;

      let newOrderStatus = null;

      switch (deliveryStatus) {
        case 'assigned':
        case 'in_transit':
          newOrderStatus = 'in_delivery';
          break;
        case 'delivered':
          newOrderStatus = 'delivered';
          order.actualDeliveryDate = new Date();
          break;
        case 'cancelled':
          newOrderStatus = 'cancelled';
          // Release inventory back to available
          await this.releaseReservedInventory(order);
          break;
      }

      if (newOrderStatus && order.status !== newOrderStatus) {
        order.status = newOrderStatus;
        await order.save();

        // Notify vendor of status change
        await NotificationService.general(
          order.vendor,
          '📦 Order Status Update',
          `Your order for ${order.itemName} is now ${newOrderStatus}`,
          'info'
        );
      }
    } catch (error) {
      console.error('❌ Error updating order from delivery status:', error);
    }
  }
}

module.exports = OrderFulfillmentService;
