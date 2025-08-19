const express = require('express');
const router = express.Router();
const Delivery = require('../models/Delivery');
const User = require('../models/user');
const protect = require('../middleware/authMiddleware');
const Inventory = require('../models/Inventory');
const NotificationService = require('../services/notificationService');
const WarehouseService = require('../services/warehouseService');
const OrderFulfillmentService = require('../services/orderFulfillmentService');
// Farmers request transporter
router.post('/request-transporter', protect, async (req, res) => {
  try {
    if (req.user.role !== 'farmer') return res.status(403).json({ message: 'Only farmers can request transporters' });

    console.log('Transporter request data:', req.body);
    const { pickupLocation, dropoffLocation, goodsDescription, quantity, urgency } = req.body;

    // Get farmer's coordinates set by admin
    const farmer = await User.findById(req.user.id);
    
    // Set pickup coordinates from farmer's admin-managed location
    const pickupCoordinates = farmer.coordinates?.latitude && farmer.coordinates?.longitude ? {
      latitude: farmer.coordinates.latitude,
      longitude: farmer.coordinates.longitude
    } : null;

    const transportRequest = new Delivery({
      farmer: req.user.id,
      pickupLocation: pickupLocation || farmer.coordinates?.address || farmer.location || 'Farm Location',
      dropoffLocation,
      goodsDescription,
      quantity,
      urgency: urgency || 'normal',
      status: 'requested',
      pickupCoordinates: pickupCoordinates
    });

  await transportRequest.save();
  
  // Create notification for farmer using NotificationService
  await NotificationService.general(
    req.user.id,
    '🚛 Transporter Request Submitted',
    `Your transporter request for ${goodsDescription} (${quantity} units) has been submitted. Admin will review and assign a transporter.`,
    'info'
  );
  
    res.status(201).json({ message: 'Transporter request submitted', transportRequest });
  } catch (error) {
    console.error('Error creating transporter request:', error);
    res.status(500).json({ message: 'Error creating transporter request', error: error.message });
  }
});

// Add regular delivery creation route for farmers and vendors
router.post('/', protect, async (req, res) => {
  try {
    console.log('Creating delivery request:', req.body);
    const { destination, itemName, quantity, urgency, notes, pickupLocation, goodsDescription, unit, requesterType } = req.body;
    
    if (req.user.role !== 'farmer' && req.user.role !== 'market_vendor') {
      return res.status(403).json({ message: 'Only farmers and vendors can request deliveries' });
    }

    // Get user's coordinates set by admin (works for both farmers and vendors)
    const requester = await User.findById(req.user.id);
    
    // Set pickup coordinates from user's admin-managed location
    const pickupCoordinates = requester.coordinates?.latitude && requester.coordinates?.longitude ? {
      latitude: requester.coordinates.latitude,
      longitude: requester.coordinates.longitude
    } : null;

    // Create delivery object based on requester type
    const deliveryData = {
      pickupLocation: pickupLocation || requester.coordinates?.address || requester.location || (req.user.role === 'farmer' ? 'Farm Location' : 'Market Location'),
      dropoffLocation: destination,
      goodsDescription: goodsDescription || itemName,
      quantity: parseInt(quantity),
      urgency: urgency || 'normal',
      status: 'pending',
      pickupCoordinates: pickupCoordinates,
      unit: unit || 'units',
      requesterType: requesterType || req.user.role,
      requestedBy: req.user.id
    };

    // Set the appropriate field based on user role
    if (req.user.role === 'farmer') {
      deliveryData.farmer = req.user.id;
    } else if (req.user.role === 'market_vendor') {
      deliveryData.vendor = req.user.id;
    }

    const delivery = new Delivery(deliveryData);

    await delivery.save();
    console.log('Delivery created successfully:', delivery);

    // Create notification for requester using NotificationService
    await NotificationService.deliveryRequested(req.user.id, {
      id: delivery._id,
      itemName: goodsDescription || itemName,
      quantity: quantity,
      unit: unit || 'units',
      urgency: urgency
    });

    // Notify all admins about the new delivery request
    const admins = await User.find({ role: 'admin' }).select('_id');
    
    const requesterLabel = req.user.role === 'farmer' ? 'farmer' : 'vendor';
    for (const admin of admins) {
      await NotificationService.general(
        admin._id,
        '📦 New Delivery Request',
        `New delivery request from ${requesterLabel} ${req.user.name}: ${goodsDescription || itemName} (${quantity} ${unit || 'units'}) - Priority: ${urgency}. Please review and assign a transporter.`,
        'info'
      );
    }

    res.status(201).json({ 
      message: 'Delivery request created successfully',
      delivery 
    });
  } catch (error) {
    console.error('Error creating delivery:', error);
    res.status(500).json({ message: 'Error creating delivery', error: error.message });
  }
});

// Transporters view unassigned deliveries
router.get('/', protect, async (req, res) => {
  if (req.user.role === 'transporter') {
    // Return only active deliveries (excluding delivered ones)
    const deliveries = await Delivery.find({
      $or: [
        { 
          transporter: req.user.id, 
          status: { $nin: ['delivered', 'cancelled'] } // Exclude completed deliveries
        },
        { status: 'pending', transporter: null } // Unassigned pending deliveries
      ]
    }).populate('farmer vendor', 'name location').sort({ createdAt: -1 });
    return res.json(deliveries);
  }

  // Farmers see their own requests
  if (req.user.role === 'farmer') {
    const deliveries = await Delivery.find({ farmer: req.user.id });
    return res.json(deliveries);
  }

  // Vendors see their own requests
  if (req.user.role === 'market_vendor') {
    const deliveries = await Delivery.find({ 
      $or: [
        { vendor: req.user.id },
        { requestedBy: req.user.id, requesterType: 'market_vendor' }
      ]
    });
    return res.json(deliveries);
  }

  // Warehouse managers can see all deliveries
  if (req.user.role === 'warehouse_manager') {
    const deliveries = await Delivery.find({});
    return res.json(deliveries);
  }

  // Admins can see all deliveries
  if (req.user.role === 'admin') {
    const deliveries = await Delivery.find({});
    return res.json(deliveries);
  }

  res.status(403).json({ message: 'Access denied' });
});

// Transporter accepts a delivery
router.put('/:id/assign', protect, async (req, res) => {
  try {
    if (req.user.role !== 'transporter') {
      return res.status(403).json({ message: 'Only transporters can accept deliveries' });
    }

    const { estimatedArrival, notes } = req.body;

    const delivery = await Delivery.findById(req.params.id).populate('farmer', 'name email');
    if (!delivery || delivery.status !== 'pending') {
      return res.status(404).json({ message: 'Delivery not available' });
    }

    // Update delivery
    delivery.transporter = req.user.id;
    delivery.status = 'assigned';
    delivery.assignedAt = new Date();
    
    if (estimatedArrival) {
      delivery.estimatedArrival = new Date(estimatedArrival);
    }
    
    if (notes) {
      delivery.adminNotes = notes;
    }

    await delivery.save();

    // Notify farmer that transporter has accepted
    let farmerMessage = `Good news! Transporter ${req.user.name} has accepted your delivery request for ${delivery.goodsDescription}.`;
    
    if (delivery.estimatedArrival) {
      const arrivalTime = new Date(delivery.estimatedArrival).toLocaleString();
      farmerMessage += ` Estimated arrival time: ${arrivalTime}.`;
    } else if (delivery.scheduledPickupTime) {
      const pickupTime = new Date(delivery.scheduledPickupTime).toLocaleString();
      farmerMessage += ` Scheduled pickup: ${pickupTime}.`;
    }
    
    farmerMessage += ` You will receive updates as your delivery progresses.`;

    await NotificationService.general(
      delivery.farmer._id,
      '🚛 Transporter Assigned',
      farmerMessage,
      'info'
    );

    res.json({ 
      message: 'Delivery accepted successfully',
      delivery: {
        ...delivery.toObject(),
        farmer: delivery.farmer
      }
    });
  } catch (error) {
    console.error('Error accepting delivery:', error);
    res.status(500).json({ message: 'Error accepting delivery', error: error.message });
  }
});

// Update delivery status (enhanced with notifications)
router.put('/:id/status', protect, async (req, res) => {
  try {
    const delivery = await Delivery.findById(req.params.id);
    if (!delivery) return res.status(404).json({ message: 'Delivery not found' });

    // Allow transporters, farmers, and admins to update status
    const canUpdate = (req.user.role === 'transporter' && delivery.transporter?.toString() === req.user.id) ||
                     (req.user.role === 'farmer' && delivery.farmer.toString() === req.user.id) ||
                     (req.user.role === 'admin');
    
    if (!canUpdate) {
      return res.status(403).json({ message: 'Not authorized to update this delivery' });
    }

    const { status } = req.body;
    const validStatuses = ['pending', 'in_transit', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const oldStatus = delivery.status;
    delivery.status = status;
    
    // Add timestamp for status change
    delivery.statusHistory = delivery.statusHistory || [];
    delivery.statusHistory.push({
      status,
      updatedBy: req.user.id,
      updatedAt: new Date(),
      previousStatus: oldStatus
    });
    
    // If status is changed to 'delivered', automatically add to warehouse inventory
    if (status === 'delivered' && oldStatus !== 'delivered') {
      console.log('🏭 Auto-adding delivery to warehouse inventory using smart warehouse service...');
      
      try {
        // Set delivery as completed
        delivery.actualDeliveryTime = new Date();
        delivery.receivedByWarehouse = true;
        delivery.warehouseReceivedAt = new Date();
        
        // Use the new smart warehouse service to add inventory
        const inventoryItem = await WarehouseService.addDeliveryToWarehouseInventory(
          delivery, 
          delivery.dropoffLocation,
          req.user // transporter who delivered
        );
        
        console.log('✅ Inventory item created using warehouse service:', inventoryItem._id);
        
        // Notify warehouse manager about the incoming delivery
        const warehouseManager = await WarehouseService.getWarehouseManager(delivery.dropoffLocation);
        if (warehouseManager) {
          await NotificationService.general(
            warehouseManager._id,
            '📦 New Delivery Received',
            `Delivery of ${delivery.goodsDescription} (${delivery.quantity} ${delivery.unit || 'units'}) has been delivered to ${delivery.dropoffLocation}. Added to inventory automatically.`,
            'success'
          );
        }
        
        // Notify admins about successful delivery completion
        const admins = await User.find({ role: 'admin' }).select('_id');
        for (const admin of admins) {
          await NotificationService.general(
            admin._id,
            '✅ Delivery Completed',
            `Delivery ${delivery._id} (${delivery.goodsDescription}) has been successfully delivered and added to inventory at ${delivery.dropoffLocation}.`,
            'success'
          );
        }
        
      } catch (inventoryError) {
        console.error('❌ Failed to auto-add to inventory using warehouse service:', inventoryError);
        
        // Still mark as delivered but flag for manual inventory addition
        delivery.actualDeliveryTime = new Date();
        delivery.receivedByWarehouse = false; // Flag for manual processing
        
        // Create notification for admin about the failure
        try {
          const admins = await User.find({ role: 'admin' }).select('_id');
          for (const admin of admins) {
            await NotificationService.general(
              admin._id,
              '⚠️ Auto-Inventory Failed',
              `Delivery ${delivery._id} (${delivery.goodsDescription}) delivered but failed to auto-add to inventory at ${delivery.dropoffLocation}. Manual intervention required.`,
              'warning'
            );
          }
        } catch (notifError) {
          console.error('Failed to notify admins about inventory failure:', notifError);
        }
      }
    }
    
    await delivery.save();

    // Update order status if this delivery is linked to an order
    try {
      const Order = require('../models/Order');
      const relatedOrder = await Order.findOne({ delivery: delivery._id });
      if (relatedOrder) {
        console.log('📦 Updating related order status:', relatedOrder._id);
        await OrderFulfillmentService.updateOrderFromDeliveryStatus(relatedOrder._id, status);
      }
    } catch (orderUpdateError) {
      console.error('❌ Failed to update order status:', orderUpdateError);
      // Don't fail the delivery update if order update fails
    }

    // Create notification and send email for status change using NotificationService
    const { sendDeliveryStatusUpdateEmail } = require('../utils/emailService');
    
    const recipientId = req.user.role === 'transporter' ? delivery.farmer : delivery.transporter;
    
    if (recipientId) {
      // Create status update notification
      if (status === 'in_transit') {
        await NotificationService.deliveryInTransit(delivery.farmer, {
          deliveryId: delivery._id,
          itemName: delivery.goodsDescription,
          quantity: delivery.quantity,
          expectedDelivery: 'within 24-48 hours'
        });
      } else if (status === 'delivered') {
        await NotificationService.deliveryCompleted(delivery.farmer, {
          deliveryId: delivery._id,
          itemName: delivery.goodsDescription,
          quantity: delivery.quantity,
          unit: 'units',
          destination: delivery.dropoffLocation
        });
      } else {
        // For other status updates, create a generic notification
        await NotificationService.general(
          recipientId,
          '📦 Delivery Status Update',
          `Your delivery of ${delivery.goodsDescription} is now ${status}.`,
          'info'
        );
      }
      
      // Send status update email
      try {
        const [recipient, updater] = await Promise.all([
          User.findById(recipientId),
          User.findById(req.user.id)
        ]);
        
        if (recipient && recipient.email) {
          const statusUpdateResult = await sendDeliveryStatusUpdateEmail(
            recipient.email,
            recipient.name,
            {
              goodsDescription: delivery.goodsDescription,
              quantity: delivery.quantity,
              pickupLocation: delivery.pickupLocation,
              dropoffLocation: delivery.dropoffLocation
            },
            oldStatus,
            status,
            updater.name
          );
          
          if (statusUpdateResult.success) {
            console.log('✅ Status update email sent to:', recipient.email);
          } else {
            console.error('❌ Failed to send status update email:', statusUpdateResult.error);
          }
        }
      } catch (emailError) {
        console.error('❌ Error sending status update email:', emailError);
      }
    }
    
    res.json(delivery);
  } catch (error) {
    res.status(500).json({ message: 'Error updating delivery status', error: error.message });
  }
});

// Warehouse manager confirms receipt
router.put('/:id/confirm-receipt', protect, async (req, res) => {
  if (req.user.role !== 'warehouse_manager') {
    return res.status(403).json({ message: 'Only warehouse managers can confirm delivery receipt' });
  }

  const { unit, location } = req.body;
  if (!unit || !location) {
    return res.status(400).json({ message: 'Unit and location are required' });
  }

  const delivery = await Delivery.findById(req.params.id);
  if (!delivery) return res.status(404).json({ message: 'Delivery not found' });

  if (delivery.receivedByWarehouse) {
    return res.status(400).json({ message: 'Already confirmed' });
  }

  delivery.receivedByWarehouse = true;
  await delivery.save();

  const inventoryItem = new Inventory({
    user: req.user.id, // warehouse manager
    itemName: delivery.goodsDescription,
    quantity: delivery.quantity,
    unit,
    location,
    addedByRole: req.user.role
  });

  await inventoryItem.save();

  res.json({
    message: 'Delivery confirmed and added to inventory',
    delivery,
    inventoryItem
  });
});


// Update transporter's real-time location
router.put('/:id/location', protect, async (req, res) => {
  try {
    console.log('Location update request received:', {
      deliveryId: req.params.id,
      userId: req.user.id,
      userRole: req.user.role,
      body: req.body
    });

    if (req.user.role !== 'transporter') {
      console.log('❌ Access denied: User is not a transporter');
      return res.status(403).json({ message: 'Only transporters can update location' });
    }

    const { latitude, longitude, speed, heading, accuracy } = req.body;
    
    if (!latitude || !longitude) {
      console.log('❌ Missing coordinates:', { latitude, longitude });
      return res.status(400).json({ message: 'Latitude and longitude are required' });
    }

    // Validate coordinate values
    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);
    
    if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      console.log('❌ Invalid coordinates:', { lat, lng });
      return res.status(400).json({ message: 'Invalid latitude or longitude values' });
    }

    // Check MongoDB connection before proceeding
    const mongoose = require('mongoose');
    if (mongoose.connection.readyState !== 1) {
      console.log('❌ MongoDB not connected, readyState:', mongoose.connection.readyState);
      // Try to reconnect
      try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ MongoDB reconnected successfully');
      } catch (reconnectError) {
        console.error('❌ Failed to reconnect to MongoDB:', reconnectError);
        return res.status(503).json({ 
          message: 'Database temporarily unavailable. Location update failed.',
          error: 'Database connection error'
        });
      }
    }

    const delivery = await Delivery.findById(req.params.id);
    if (!delivery) {
      console.log('❌ Delivery not found:', req.params.id);
      return res.status(404).json({ message: 'Delivery not found' });
    }

    console.log('📦 Delivery found:', {
      id: delivery._id,
      status: delivery.status,
      transporter: delivery.transporter
    });

    if (delivery.transporter?.toString() !== req.user.id) {
      console.log('❌ Not authorized - delivery transporter:', delivery.transporter, 'user id:', req.user.id);
      return res.status(403).json({ message: 'Not authorized to update this delivery location' });
    }

    // Update current location
    delivery.currentLocation = {
      latitude: lat,
      longitude: lng,
      lastUpdated: new Date()
    };

    // Create location entry for history
    const locationEntry = {
      latitude: lat,
      longitude: lng,
      timestamp: new Date()
    };

    // Only add optional fields if they are valid numbers
    if (speed !== undefined && !isNaN(parseFloat(speed))) {
      locationEntry.speed = parseFloat(speed);
    }
    if (heading !== undefined && !isNaN(parseFloat(heading))) {
      locationEntry.heading = parseFloat(heading);
    }
    if (accuracy !== undefined && !isNaN(parseFloat(accuracy))) {
      locationEntry.accuracy = parseFloat(accuracy);
    }

    console.log('📍 Adding location entry:', locationEntry);

    // Initialize locationHistory if it doesn't exist
    if (!delivery.locationHistory) {
      delivery.locationHistory = [];
    }

    delivery.locationHistory.push(locationEntry);

    // Keep only last 100 location entries to prevent excessive data
    if (delivery.locationHistory.length > 100) {
      delivery.locationHistory = delivery.locationHistory.slice(-100);
    }

    console.log('💾 Saving delivery with location update...');
    
    try {
      await delivery.save();
      console.log('✅ Location updated successfully');
    } catch (saveError) {
      // Handle storage quota exceeded error
      if (saveError.code === 8000 || saveError.message?.includes('space quota')) {
        console.warn('⚠️ Location update failed - database storage quota exceeded');
        console.warn('💡 Database cleanup needed - using temporary in-memory tracking');
        
        // Return success but indicate quota issue
        return res.status(202).json({
          message: 'Location received but not stored due to storage limit',
          warning: 'Database storage quota exceeded. Contact admin for cleanup.',
          currentLocation: {
            latitude: lat,
            longitude: lng,
            lastUpdated: new Date()
          },
          quotaExceeded: true
        });
      } else {
        throw saveError; // Re-throw other errors
      }
    }

    // Emit location update via WebSocket if available
    if (req.app.get('io')) {
      req.app.get('io').emit(`delivery-location-${delivery._id}`, {
        deliveryId: delivery._id,
        location: delivery.currentLocation,
        transporter: req.user.id,
        timestamp: new Date()
      });
      console.log('📡 WebSocket location update emitted');
    }

    res.json({
      message: 'Location updated successfully',
      currentLocation: delivery.currentLocation
    });
  } catch (error) {
    console.error('❌ Error updating location:', error);
    
    // Handle storage quota exceeded error
    if (error.code === 8000 || error.message?.includes('space quota')) {
      console.warn('⚠️ Location update failed - database storage quota exceeded');
      return res.status(507).json({
        message: 'Location update failed due to storage quota exceeded',
        error: 'Database storage limit reached. Please contact administrator for cleanup.',
        quotaExceeded: true
      });
    }
    
    // Provide specific error messages for common issues
    let errorMessage = 'Error updating location';
    let statusCode = 500;
    
    if (error.name === 'MongoNotConnectedError' || error.message.includes('Client must be connected')) {
      errorMessage = 'Database connection temporarily unavailable. Please try again in a moment.';
      statusCode = 503;
    } else if (error.name === 'ValidationError') {
      errorMessage = 'Invalid location data provided';
      statusCode = 400;
    } else if (error.name === 'CastError') {
      errorMessage = 'Invalid delivery ID or location data format';
      statusCode = 400;
    }
    
    res.status(statusCode).json({ 
      message: errorMessage, 
      error: error.message 
    });
  }
});

// Get delivery location tracking data
router.get('/:id/location', protect, async (req, res) => {
  try {
    const delivery = await Delivery.findById(req.params.id)
      .populate('farmer', 'name email')
      .populate('transporter', 'name email');
    
    if (!delivery) {
      return res.status(404).json({ message: 'Delivery not found' });
    }

    // Check if user has permission to view this delivery's location
    const canView = (
      delivery.farmer?.toString() === req.user.id ||
      delivery.transporter?.toString() === req.user.id ||
      req.user.role === 'warehouse_manager' ||
      req.user.role === 'admin'
    );

    if (!canView) {
      return res.status(403).json({ message: 'Not authorized to view this delivery location' });
    }

    res.json({
      deliveryId: delivery._id,
      status: delivery.status,
      currentLocation: delivery.currentLocation,
      locationHistory: delivery.locationHistory,
      estimatedArrival: delivery.estimatedArrival,
      pickupLocation: delivery.pickupLocation,
      dropoffLocation: delivery.dropoffLocation,
      transporter: delivery.transporter
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching location data', error: error.message });
  }
});

// Get all active deliveries with locations (for dashboard map view)
router.get('/active-locations', protect, async (req, res) => {
  try {
    let query = { status: { $in: ['assigned', 'in_transit'] } };
    
    // Filter based on user role
    if (req.user.role === 'farmer') {
      query.farmer = req.user.id;
    } else if (req.user.role === 'transporter') {
      query.transporter = req.user.id;
    }
    // warehouse_manager and admin can see all active deliveries

    const deliveries = await Delivery.find(query)
      .populate('farmer', 'name email')
      .populate('transporter', 'name email')
      .select('_id status currentLocation goodsDescription pickupLocation dropoffLocation farmer transporter estimatedArrival');

    const activeDeliveries = deliveries
      .filter(delivery => delivery.currentLocation && delivery.currentLocation.latitude)
      .map(delivery => ({
        id: delivery._id,
        status: delivery.status,
        goodsDescription: delivery.goodsDescription,
        pickupLocation: delivery.pickupLocation,
        dropoffLocation: delivery.dropoffLocation,
        currentLocation: delivery.currentLocation,
        farmer: delivery.farmer,
        transporter: delivery.transporter,
        estimatedArrival: delivery.estimatedArrival
      }));

    res.json(activeDeliveries);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching active delivery locations', error: error.message });
  }
});

// Transporter: Mark items as picked up
router.put('/:id/pickup', protect, async (req, res) => {
  try {
    if (req.user.role !== 'transporter') {
      return res.status(403).json({ message: 'Only transporters can mark pickups' });
    }

    const delivery = await Delivery.findById(req.params.id).populate('farmer', 'name email');
    
    if (!delivery) {
      return res.status(404).json({ message: 'Delivery not found' });
    }

    if (delivery.transporter?.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to update this delivery' });
    }

    if (delivery.pickedUp) {
      return res.status(400).json({ message: 'Items already marked as picked up' });
    }

    // Update pickup status
    delivery.pickedUp = true;
    delivery.pickedUpAt = new Date();
    delivery.actualPickupTime = new Date();
    delivery.status = 'in_transit';

    await delivery.save();

    // Notify farmer that items have been picked up
    await NotificationService.general(
      delivery.farmer._id,
      '📦 Items Picked Up',
      `Your items (${delivery.goodsDescription}) have been picked up by ${req.user.name} and are now in transit. You'll receive notification when they reach the destination.`,
      'info'
    );

    // Emit real-time update via WebSocket if available
    if (global.io) {
      global.io.to(`delivery_${delivery._id}`).emit('pickup_confirmed', {
        deliveryId: delivery._id,
        pickedUpAt: delivery.pickedUpAt,
        transporter: req.user.name
      });
    }

    res.json({
      message: 'Items marked as picked up successfully',
      delivery: {
        id: delivery._id,
        pickedUp: delivery.pickedUp,
        pickedUpAt: delivery.pickedUpAt,
        status: delivery.status
      }
    });
  } catch (error) {
    console.error('Error marking pickup:', error);
    res.status(500).json({ message: 'Error marking pickup', error: error.message });
  }
});

// Get delivery route information for transporter
router.get('/:id/route', protect, async (req, res) => {
  try {
    if (req.user.role !== 'transporter') {
      return res.status(403).json({ message: 'Only transporters can view delivery routes' });
    }

    const delivery = await Delivery.findById(req.params.id)
      .populate('farmer', 'name email coordinates location')
      .populate('vendor', 'name email coordinates location')
      .populate('warehouseLocation', 'name coordinates location address')
      .populate('transporter', 'name email coordinates location');
    
    if (!delivery) {
      return res.status(404).json({ message: 'Delivery not found' });
    }

    if (delivery.transporter?._id.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to view this delivery route' });
    }

    // Get default warehouse coordinates if no specific warehouse is assigned
    const Warehouse = require('../models/Warehouse');
    let defaultWarehouse = null;
    
    // Try to get a warehouse with valid coordinates if delivery coordinates are missing
    if (!delivery.dropoffCoordinates || !delivery.dropoffCoordinates.latitude || !delivery.dropoffCoordinates.longitude) {
      console.log('🔍 Looking for default warehouse coordinates...');
      
      // First try to find the warehouse by location name matching
      if (delivery.dropoffLocation) {
        defaultWarehouse = await Warehouse.findOne({
          $or: [
            { name: { $regex: delivery.dropoffLocation, $options: 'i' } },
            { location: { $regex: delivery.dropoffLocation, $options: 'i' } }
          ],
          'coordinates.latitude': { $exists: true, $ne: null },
          'coordinates.longitude': { $exists: true, $ne: null }
        });
      }
      
      // If no matching warehouse found, get any warehouse with coordinates
      if (!defaultWarehouse) {
        defaultWarehouse = await Warehouse.findOne({
          'coordinates.latitude': { $exists: true, $ne: null },
          'coordinates.longitude': { $exists: true, $ne: null }
        });
      }
      
      console.log('🏭 Default warehouse found:', defaultWarehouse ? {
        name: defaultWarehouse.name || defaultWarehouse.location,
        coordinates: defaultWarehouse.coordinates
      } : 'none');
    }

    // Determine requester (farmer or vendor)
    const requester = delivery.farmer || delivery.vendor;
    const requesterType = delivery.requesterType || (delivery.farmer ? 'farmer' : delivery.vendor ? 'market_vendor' : 'unknown');
    
    // Prepare route information with enhanced coordinate fallbacks
    const routeInfo = {
      deliveryId: delivery._id,
      status: delivery.status,
      pickedUp: delivery.pickedUp,
      goodsDescription: delivery.goodsDescription,
      quantity: delivery.quantity,
      requesterType: requesterType,
      
      // Pickup location (farmer or vendor) with enhanced coordinate handling
      pickup: {
        location: delivery.pickupLocation,
        coordinates: delivery.pickupCoordinates || requester?.coordinates || {
          // Fallback coordinates for Kathmandu area if nothing else available
          latitude: 27.7172,
          longitude: 85.3240
        },
        contact: {
          name: requester?.name,
          email: requester?.email
        },
        requesterType: requesterType
      },
      
      // Delivery destination (warehouse or custom location) with enhanced fallbacks
      delivery: {
        location: delivery.dropoffLocation || defaultWarehouse?.name || defaultWarehouse?.location || 'Main Warehouse',
        coordinates: delivery.dropoffCoordinates || 
                    delivery.warehouseLocation?.coordinates || 
                    defaultWarehouse?.coordinates || {
                      // Ultimate fallback coordinates (Kathmandu warehouse area)
                      latitude: 27.6915,
                      longitude: 85.3408
                    },
        warehouse: delivery.warehouseLocation ? {
          id: delivery.warehouseLocation._id,
          name: delivery.warehouseLocation.name,
          coordinates: delivery.warehouseLocation.coordinates,
          address: delivery.warehouseLocation.address
        } : defaultWarehouse ? {
          id: defaultWarehouse._id,
          name: defaultWarehouse.name || defaultWarehouse.location,
          coordinates: defaultWarehouse.coordinates,
          address: defaultWarehouse.address
        } : {
          id: 'default',
          name: 'Main Warehouse',
          coordinates: { latitude: 27.6915, longitude: 85.3408 },
          address: 'New Baneshwor, Kathmandu, Nepal'
        }
      },
      
      // Scheduling information
      scheduledPickupTime: delivery.scheduledPickupTime,
      scheduledDeliveryTime: delivery.scheduledDeliveryTime,
      estimatedArrival: delivery.estimatedArrival,
      actualPickupTime: delivery.actualPickupTime,
      
      // Current tracking
      currentLocation: delivery.currentLocation,
      locationHistory: delivery.locationHistory || [],
      
      // Notes
      adminNotes: delivery.adminNotes
    };

    // Enhanced logging for debugging coordinate issues
    console.log('🗺️ Route API Debug Information:');
    console.log('  📍 Pickup coordinates:', JSON.stringify(routeInfo.pickup.coordinates));
    console.log('  🏭 Delivery coordinates:', JSON.stringify(routeInfo.delivery.coordinates));
    console.log('  📦 Delivery location:', routeInfo.delivery.location);
    console.log('  🏢 Warehouse info:', routeInfo.delivery.warehouse ? 
      `${routeInfo.delivery.warehouse.name} (${routeInfo.delivery.warehouse.coordinates?.latitude}, ${routeInfo.delivery.warehouse.coordinates?.longitude})` : 
      'none');
    console.log('  ✅ Route ready:', !!(
      routeInfo.pickup.coordinates?.latitude && 
      routeInfo.pickup.coordinates?.longitude && 
      routeInfo.delivery.coordinates?.latitude && 
      routeInfo.delivery.coordinates?.longitude
    ));

    res.json({
      success: true,
      route: routeInfo
    });
  } catch (error) {
    console.error('Error fetching delivery route:', error);
    res.status(500).json({ message: 'Error fetching delivery route', error: error.message });
  }
});

// Admin: Get pending transporter requests
router.get('/admin/requests', protect, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only admins can view transporter requests' });
    }

    const requests = await Delivery.find({ status: 'requested' })
      .populate('farmer', 'name email location')
      .sort({ createdAt: -1 });

    res.json(requests);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching transporter requests', error: error.message });
  }
});

// Admin: Get pending delivery requests (regular deliveries)
router.get('/admin/pending-deliveries', protect, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only admins can view pending deliveries' });
    }

    const pendingDeliveries = await Delivery.find({ 
      status: 'pending', 
      transporter: null 
    })
      .populate('farmer', 'name email location')
      .sort({ createdAt: -1 });

    res.json(pendingDeliveries);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching pending deliveries', error: error.message });
  }
});

// Admin: Accept and assign transporter to regular delivery request (with smart warehouse assignment)
router.put('/admin/accept-delivery/:deliveryId', protect, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only admins can accept deliveries' });
    }

    const { 
      transporterId, 
      notes, 
      scheduledPickupTime, 
      scheduledDeliveryTime,
      warehouseId,
      pickupCoordinates,
      dropoffCoordinates,
      useSmartWarehouseAssignment = true
    } = req.body;
    
    if (!transporterId) {
      return res.status(400).json({ message: 'Transporter ID is required' });
    }

    const delivery = await Delivery.findById(req.params.deliveryId);
    if (!delivery || delivery.status !== 'pending') {
      return res.status(404).json({ message: 'Delivery not found or already processed' });
    }

    // Verify transporter exists and is active
    const transporter = await User.findOne({ _id: transporterId, role: 'transporter' });
    if (!transporter) {
      return res.status(404).json({ message: 'Transporter not found' });
    }

    // Get requester (farmer or vendor) for smart warehouse assignment
    let requester = null;
    if (delivery.farmer) {
      requester = await User.findById(delivery.farmer);
    } else if (delivery.vendor || delivery.requestedBy) {
      requester = await User.findById(delivery.vendor || delivery.requestedBy);
    }

    // Smart warehouse assignment or manual selection
    let finalWarehouse = null;
    let finalDropoffCoordinates = dropoffCoordinates;
    let finalDropoffLocation = delivery.dropoffLocation;
    
    if (warehouseId) {
      // Manual warehouse selection
      const Warehouse = require('../models/Warehouse');
      finalWarehouse = await Warehouse.findById(warehouseId);
      if (!finalWarehouse) {
        return res.status(404).json({ message: 'Warehouse not found' });
      }
      finalDropoffLocation = finalWarehouse.location;
      finalDropoffCoordinates = finalWarehouse.coordinates;
    } else if (useSmartWarehouseAssignment && requester?.coordinates) {
      // Use smart warehouse assignment
      console.log('🧠 Using smart warehouse assignment...');
      
      try {
        const optimalWarehouse = await WarehouseService.findOptimalWarehouse(
          requester.coordinates,
          delivery.quantity,
          delivery.goodsDescription,
          delivery.dropoffLocation // preferred location if specified
        );
        
        if (optimalWarehouse) {
          finalWarehouse = optimalWarehouse.warehouse;
          finalDropoffLocation = finalWarehouse.location;
          finalDropoffCoordinates = finalWarehouse.coordinates;
          
          console.log(`✅ Smart warehouse assignment: ${finalWarehouse.location} (score: ${optimalWarehouse.scores.total.toFixed(1)})`);
          
          // Add assignment reasoning to admin notes
          const assignmentNotes = `Smart warehouse assigned: ${finalWarehouse.location} (Distance: ${optimalWarehouse.distance === Infinity ? 'unknown' : optimalWarehouse.distance.toFixed(1) + 'km'}, Utilization: ${optimalWarehouse.utilization.utilizationRate.toFixed(1)}%, Score: ${optimalWarehouse.scores.total.toFixed(1)})`;
          notes = notes ? `${notes}\n${assignmentNotes}` : assignmentNotes;
        } else {
          console.warn('⚠️ Smart warehouse assignment failed, using manual fallback');
        }
      } catch (warehouseError) {
        console.error('❌ Error in smart warehouse assignment:', warehouseError);
        // Continue with manual assignment or existing dropoff location
      }
    }

    // Get farmer's coordinates if not manually provided
    let finalPickupCoordinates = pickupCoordinates;
    if (!pickupCoordinates && requester?.coordinates?.latitude && requester?.coordinates?.longitude) {
      finalPickupCoordinates = {
        latitude: requester.coordinates.latitude,
        longitude: requester.coordinates.longitude
      };
      console.log(`Using ${delivery.farmer ? 'farmer' : 'requester'}'s admin-managed coordinates for pickup: ${finalPickupCoordinates.latitude}, ${finalPickupCoordinates.longitude}`);
    }

    // Update delivery and assign transporter
    delivery.transporter = transporterId;
    delivery.status = 'assigned';
    delivery.assignedBy = req.user._id || req.user.id;
    delivery.assignedAt = new Date();
    
    if (notes) {
      delivery.adminNotes = notes;
    }
    
    if (scheduledPickupTime) {
      delivery.scheduledPickupTime = new Date(scheduledPickupTime);
    }
    
    if (scheduledDeliveryTime) {
      delivery.scheduledDeliveryTime = new Date(scheduledDeliveryTime);
    }
    
    if (finalWarehouse) {
      delivery.warehouseLocation = finalWarehouse._id;
      delivery.dropoffLocation = finalDropoffLocation;
    }
    
    if (finalPickupCoordinates) {
      delivery.pickupCoordinates = finalPickupCoordinates;
    }
    
    if (finalDropoffCoordinates) {
      delivery.dropoffCoordinates = finalDropoffCoordinates;
    }

    await delivery.save();

    // Create notifications
    const { sendDeliveryDispatchEmail } = require('../utils/emailService');
    
    // Enhanced notification to farmer with scheduling details
    let farmerMessage = `Your delivery request for ${delivery.goodsDescription} has been approved and assigned to ${transporter.name}.`;
    
    if (delivery.scheduledPickupTime) {
      const pickupTime = new Date(delivery.scheduledPickupTime).toLocaleString();
      farmerMessage += ` Scheduled pickup time: ${pickupTime}.`;
    } else {
      farmerMessage += ` Expected pickup within 24-48 hours.`;
    }
    
    if (delivery.scheduledDeliveryTime) {
      const deliveryTime = new Date(delivery.scheduledDeliveryTime).toLocaleString();
      farmerMessage += ` Expected delivery: ${deliveryTime}.`;
    }
    
    // Notify farmer that their delivery has been accepted and assigned
    await NotificationService.general(
      delivery.farmer,
      '✅ Delivery Request Approved',
      farmerMessage,
      'success'
    );
    
    // Enhanced notification to transporter with delivery details
    let transporterMessage = `New delivery assigned: ${delivery.goodsDescription} from ${delivery.pickupLocation}`;
    
    if (delivery.dropoffLocation) {
      transporterMessage += ` to ${delivery.dropoffLocation}`;
    } else if (warehouse) {
      transporterMessage += ` to ${warehouse.name} warehouse`;
    }
    
    if (delivery.scheduledPickupTime) {
      const pickupTime = new Date(delivery.scheduledPickupTime).toLocaleString();
      transporterMessage += `. Scheduled pickup: ${pickupTime}`;
    }
    
    // Notify transporter about new assignment
    await NotificationService.transporterAssigned(transporter._id, {
      deliveryId: delivery._id,
      transporterId: transporterId,
      itemName: delivery.goodsDescription,
      quantity: delivery.quantity,
      transporterName: transporter.name,
      estimatedPickupDate: new Date(Date.now() + 24 * 60 * 60 * 1000) // Tomorrow
    });
    
    // Send dispatch email to transporter
    try {
      const dispatchResult = await sendDeliveryDispatchEmail(
        transporter.email, 
        transporter.name, 
        {
          goodsDescription: delivery.goodsDescription,
          quantity: delivery.quantity,
          urgency: delivery.urgency,
          pickupLocation: delivery.pickupLocation,
          dropoffLocation: delivery.dropoffLocation
        }
      );
      
      if (dispatchResult.success) {
        console.log('✅ Dispatch email sent to transporter:', transporter.email);
      } else {
        console.error('❌ Failed to send dispatch email:', dispatchResult.error);
      }
    } catch (emailError) {
      console.error('❌ Error sending dispatch email:', emailError);
    }

    res.json({ 
      message: 'Delivery accepted and transporter assigned successfully', 
      delivery,
      transporter: transporter.name
    });
  } catch (error) {
    res.status(500).json({ message: 'Error accepting delivery', error: error.message });
  }
});

// Admin: Reject regular delivery request
router.put('/admin/reject-delivery/:deliveryId', protect, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only admins can reject deliveries' });
    }

    const { reason } = req.body;
    
    const delivery = await Delivery.findById(req.params.deliveryId);
    if (!delivery || delivery.status !== 'pending') {
      return res.status(404).json({ message: 'Delivery not found or already processed' });
    }

    delivery.status = 'rejected';
    delivery.rejectionReason = reason || 'No reason provided';
    delivery.rejectedBy = req.user._id || req.user.id;
    delivery.rejectedAt = new Date();

    await delivery.save();

    // Notify farmer using NotificationService
    await NotificationService.general(
      delivery.farmer,
      '❌ Delivery Request Rejected',
      `Your delivery request for ${delivery.goodsDescription} has been rejected. Reason: ${delivery.rejectionReason}`,
      'error'
    );

    res.json({ 
      message: 'Delivery rejected successfully', 
      delivery
    });
  } catch (error) {
    res.status(500).json({ message: 'Error rejecting delivery', error: error.message });
  }
});

// Admin: Get available transporters
router.get('/admin/transporters', protect, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only admins can view transporters' });
    }

    const transporters = await User.find({ role: 'transporter' })
      .select('name email location isActive')
      .sort({ name: 1 });

    // Get current workload for each transporter
    const transportersWithWorkload = await Promise.all(
      transporters.map(async (transporter) => {
        const activeDeliveries = await Delivery.countDocuments({
          transporter: transporter._id,
          status: { $in: ['assigned', 'in_transit'] }
        });
        
        return {
          ...transporter.toObject(),
          activeDeliveries
        };
      })
    );

    res.json(transportersWithWorkload);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching transporters', error: error.message });
  }
});

// Admin: Assign transporter to request
router.put('/admin/assign-transporter/:requestId', protect, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only admins can assign transporters' });
    }

    const { transporterId } = req.body;
    
    if (!transporterId) {
      return res.status(400).json({ message: 'Transporter ID is required' });
    }

    const request = await Delivery.findById(req.params.requestId);
    if (!request || request.status !== 'requested') {
      return res.status(404).json({ message: 'Request not found or already processed' });
    }

    // Verify transporter exists and is active
    const transporter = await User.findOne({ _id: transporterId, role: 'transporter' });
    if (!transporter) {
      return res.status(404).json({ message: 'Transporter not found' });
    }

    // Update request status and assign transporter
    request.transporter = transporterId;
    request.status = 'pending';
    request.assignedBy = req.user._id || req.user.id;
    request.assignedAt = new Date();

    await request.save();

    // Create notifications using NotificationService
    const { sendDeliveryDispatchEmail } = require('../utils/emailService');
    
    // Create transporter assignment notification
    await NotificationService.transporterAssigned(request.farmer, {
      deliveryId: request._id,
      transporterId: transporterId,
      itemName: request.goodsDescription,
      quantity: request.quantity,
      transporterName: transporter.name,
      estimatedPickupDate: new Date(Date.now() + 24 * 60 * 60 * 1000) // Tomorrow
    });
    
    // Send dispatch email to transporter
    try {
      const dispatchResult = await sendDeliveryDispatchEmail(
        transporter.email, 
        transporter.name, 
        {
          goodsDescription: request.goodsDescription,
          quantity: request.quantity,
          urgency: request.urgency,
          pickupLocation: request.pickupLocation,
          dropoffLocation: request.dropoffLocation
        }
      );
      
      if (dispatchResult.success) {
        console.log('✅ Dispatch email sent to transporter:', transporter.email);
      } else {
        console.error('❌ Failed to send dispatch email:', dispatchResult.error);
      }
    } catch (emailError) {
      console.error('❌ Error sending dispatch email:', emailError);
    }

    res.json({ 
      message: 'Transporter assigned successfully', 
      delivery: request,
      transporter: transporter.name
    });
  } catch (error) {
    res.status(500).json({ message: 'Error assigning transporter', error: error.message });
  }
});

// Admin: Reject transporter request
router.put('/admin/reject-request/:requestId', protect, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only admins can reject requests' });
    }

    const { reason } = req.body;
    
    const request = await Delivery.findById(req.params.requestId);
    if (!request || request.status !== 'requested') {
      return res.status(404).json({ message: 'Request not found or already processed' });
    }

    request.status = 'rejected';
    request.rejectionReason = reason || 'No reason provided';
    request.rejectedBy = req.user._id || req.user.id;
    request.rejectedAt = new Date();

    await request.save();

    // Notify farmer using NotificationService
    await NotificationService.general(
      request.farmer,
      '❌ Transporter Request Rejected',
      `Your transporter request has been rejected. Reason: ${request.rejectionReason}`,
      'error'
    );

    res.json({ 
      message: 'Request rejected successfully', 
      delivery: request
    });
  } catch (error) {
    res.status(500).json({ message: 'Error rejecting request', error: error.message });
  }
});

// Get transporter delivery logs with detailed tracking
router.get('/transporter/logs', protect, async (req, res) => {
  try {
    if (req.user.role !== 'transporter') {
      return res.status(403).json({ message: 'Only transporters can access delivery logs' });
    }
    
    const { page = 1, limit = 10, status, from, to } = req.query;
    
    let query = { transporter: req.user.id };
    
    // Filter by status if provided
    if (status && status !== 'all') {
      query.status = status;
    }
    
    // Filter by date range if provided
    if (from || to) {
      query.createdAt = {};
      if (from) query.createdAt.$gte = new Date(from);
      if (to) query.createdAt.$lte = new Date(to);
    }
    
    const deliveries = await Delivery.find(query)
      .populate('farmer', 'name email location')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .lean();
    
    const totalCount = await Delivery.countDocuments(query);
    
    // Enhance with route performance metrics
    const enhancedLogs = deliveries.map(delivery => {
      const startTime = delivery.statusHistory?.find(h => h.status === 'in_transit')?.updatedAt;
      const endTime = delivery.statusHistory?.find(h => h.status === 'delivered')?.updatedAt;
      
      let deliveryTime = null;
      if (startTime && endTime) {
        deliveryTime = Math.round((new Date(endTime) - new Date(startTime)) / (1000 * 60 * 60)); // hours
      }
      
      return {
        ...delivery,
        routeMetrics: {
          deliveryTime,
          locationUpdates: delivery.locationHistory?.length || 0,
          totalDistance: delivery.locationHistory?.length > 1 ? calculateDistance(delivery.locationHistory) : 0,
          avgSpeed: delivery.locationHistory?.reduce((sum, loc) => sum + (loc.speed || 0), 0) / (delivery.locationHistory?.length || 1)
        }
      };
    });
    
    res.json({
      logs: enhancedLogs,
      totalCount,
      page: parseInt(page),
      totalPages: Math.ceil(totalCount / limit),
      hasMore: page * limit < totalCount
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching delivery logs', error: error.message });
  }
});

// Get transporter route performance analytics
router.get('/transporter/performance', protect, async (req, res) => {
  try {
    if (req.user.role !== 'transporter') {
      return res.status(403).json({ message: 'Only transporters can access performance analytics' });
    }
    
    const { period = '30d' } = req.query;
    
    // Calculate date range based on period
    const now = new Date();
    let startDate = new Date();
    
    switch (period) {
      case '7d':
        startDate.setDate(now.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(now.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(now.getDate() - 90);
        break;
      case '1y':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      default:
        startDate.setDate(now.getDate() - 30);
    }
    
    const deliveries = await Delivery.find({
      transporter: req.user.id,
      createdAt: { $gte: startDate }
    });
    
    // Performance metrics calculations
    const totalDeliveries = deliveries.length;
    const completedDeliveries = deliveries.filter(d => d.status === 'delivered').length;
    const inProgressDeliveries = deliveries.filter(d => ['assigned', 'in_transit'].includes(d.status)).length;
    const cancelledDeliveries = deliveries.filter(d => d.status === 'cancelled').length;
    
    // Calculate average delivery times
    const completedWithTimes = deliveries.filter(d => {
      const startTime = d.statusHistory?.find(h => h.status === 'in_transit')?.updatedAt;
      const endTime = d.statusHistory?.find(h => h.status === 'delivered')?.updatedAt;
      return startTime && endTime;
    });
    
    const avgDeliveryTime = completedWithTimes.length > 0 
      ? completedWithTimes.reduce((sum, d) => {
          const startTime = d.statusHistory.find(h => h.status === 'in_transit').updatedAt;
          const endTime = d.statusHistory.find(h => h.status === 'delivered').updatedAt;
          return sum + (new Date(endTime) - new Date(startTime));
        }, 0) / (completedWithTimes.length * 1000 * 60 * 60) // Convert to hours
      : 0;
    
    // Distance and fuel calculations
    const totalDistance = deliveries.reduce((sum, d) => {
      return sum + (d.locationHistory?.length > 1 ? calculateDistance(d.locationHistory) : 0);
    }, 0);
    
    // Route efficiency metrics
    const routeEfficiencyData = deliveries
      .filter(d => d.status === 'delivered' && d.locationHistory?.length > 0)
      .map(d => {
        const distance = calculateDistance(d.locationHistory);
        const startTime = d.statusHistory?.find(h => h.status === 'in_transit')?.updatedAt;
        const endTime = d.statusHistory?.find(h => h.status === 'delivered')?.updatedAt;
        const deliveryTime = startTime && endTime 
          ? (new Date(endTime) - new Date(startTime)) / (1000 * 60 * 60)
          : 0;
        
        return {
          deliveryId: d._id,
          distance,
          time: deliveryTime,
          avgSpeed: deliveryTime > 0 ? distance / deliveryTime : 0,
          efficiency: distance > 0 && deliveryTime > 0 ? (distance / deliveryTime) * 100 : 0
        };
      });
    
    // Daily performance trends
    const dailyTrends = await Delivery.aggregate([
      {
        $match: {
          transporter: req.user._id,
          createdAt: { $gte: startDate }
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
      {
        $group: {
          _id: '$_id.date',
          statuses: {
            $push: {
              status: '$_id.status',
              count: '$count'
            }
          },
          total: { $sum: '$count' }
        }
      },
      { $sort: { '_id': 1 } }
    ]);
    
    const performance = {
      summary: {
        totalDeliveries,
        completedDeliveries,
        inProgressDeliveries,
        cancelledDeliveries,
        completionRate: totalDeliveries > 0 ? ((completedDeliveries / totalDeliveries) * 100).toFixed(1) : 0,
        avgDeliveryTime: avgDeliveryTime.toFixed(1),
        totalDistance: totalDistance.toFixed(1),
        avgDistancePerDelivery: totalDeliveries > 0 ? (totalDistance / totalDeliveries).toFixed(1) : 0
      },
      routeEfficiency: {
        avgSpeed: routeEfficiencyData.length > 0 
          ? (routeEfficiencyData.reduce((sum, r) => sum + r.avgSpeed, 0) / routeEfficiencyData.length).toFixed(1)
          : 0,
        bestPerformance: routeEfficiencyData.length > 0 
          ? Math.max(...routeEfficiencyData.map(r => r.efficiency)).toFixed(1)
          : 0,
        routeOptimization: routeEfficiencyData.length > 0 
          ? (routeEfficiencyData.filter(r => r.efficiency > 50).length / routeEfficiencyData.length * 100).toFixed(1)
          : 0
      },
      dailyTrends,
      period,
      lastUpdated: new Date()
    };
    
    res.json(performance);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching performance analytics', error: error.message });
  }
});

// Helper function to calculate distance from location history
function calculateDistance(locationHistory) {
  if (!locationHistory || locationHistory.length < 2) return 0;
  
  let totalDistance = 0;
  for (let i = 1; i < locationHistory.length; i++) {
    const prev = locationHistory[i - 1];
    const curr = locationHistory[i];
    
    // Haversine formula for distance calculation
    const R = 6371; // Earth's radius in kilometers
    const dLat = (curr.latitude - prev.latitude) * Math.PI / 180;
    const dLon = (curr.longitude - prev.longitude) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(prev.latitude * Math.PI / 180) * Math.cos(curr.latitude * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c;
    
    totalDistance += distance;
  }
  
  return totalDistance;
}

// Add route to get completed deliveries (history) for transporters
router.get('/history', protect, async (req, res) => {
  try {
    if (req.user.role === 'transporter') {
      // Return only completed deliveries for transporters
      const deliveries = await Delivery.find({
        transporter: req.user.id, 
        status: { $in: ['delivered', 'cancelled'] }
      })
      .populate('farmer vendor', 'name location')
      .sort({ completedAt: -1, actualDeliveryTime: -1, createdAt: -1 })
      .limit(50); // Limit to last 50 completed deliveries
      
      return res.json(deliveries);
    }
    
    // For other roles, return their delivery history
    let query = {};
    if (req.user.role === 'farmer') {
      query = { farmer: req.user.id, status: { $in: ['delivered', 'cancelled'] } };
    } else if (req.user.role === 'market_vendor') {
      query = { 
        $or: [
          { vendor: req.user.id, status: { $in: ['delivered', 'cancelled'] } },
          { requestedBy: req.user.id, requesterType: 'market_vendor', status: { $in: ['delivered', 'cancelled'] } }
        ]
      };
    } else if (['warehouse_manager', 'admin'].includes(req.user.role)) {
      query = { status: { $in: ['delivered', 'cancelled'] } };
    }
    
    const deliveries = await Delivery.find(query)
      .populate('farmer vendor transporter', 'name location')
      .sort({ actualDeliveryTime: -1, createdAt: -1 })
      .limit(100); // More history for managers/admins
    
    res.json(deliveries);
  } catch (error) {
    console.error('Error fetching delivery history:', error);
    res.status(500).json({ message: 'Error fetching delivery history', error: error.message });
  }
});

// Get delivery analytics
router.get('/analytics', protect, async (req, res) => {
  try {
    const deliveries = await Delivery.find({ farmer: req.user.id });
    
    const totalDeliveries = deliveries.length;
    const pendingDeliveries = deliveries.filter(d => d.status === 'pending').length;
    const inTransitDeliveries = deliveries.filter(d => d.status === 'in_transit' || d.status === 'assigned').length;
    const completedDeliveries = deliveries.filter(d => d.status === 'delivered').length;
    const cancelledDeliveries = deliveries.filter(d => d.status === 'cancelled').length;
    
    const successRate = totalDeliveries > 0 ? ((completedDeliveries / totalDeliveries) * 100).toFixed(1) : 0;
    
    // Delivery trends over time
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const deliveryTrends = await Delivery.aggregate([
      { $match: { farmer: req.user._id, createdAt: { $gte: thirtyDaysAgo } } },
      { $group: {
        _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
        deliveriesCreated: { $sum: 1 },
        totalQuantity: { $sum: '$quantity' }
      }},
      { $sort: { '_id': 1 } }
    ]);
    
    // Urgency breakdown
    const urgencyBreakdown = [
      { name: 'Low', value: deliveries.filter(d => d.urgency === 'low').length, fill: '#10B981' },
      { name: 'Normal', value: deliveries.filter(d => d.urgency === 'normal').length, fill: '#60A5FA' },
      { name: 'High', value: deliveries.filter(d => d.urgency === 'high').length, fill: '#F59E0B' },
      { name: 'Urgent', value: deliveries.filter(d => d.urgency === 'urgent').length, fill: '#EF4444' }
    ];
    
    res.json({
      summary: {
        totalDeliveries,
        pendingDeliveries,
        inTransitDeliveries,
        completedDeliveries,
        cancelledDeliveries,
        successRate: parseFloat(successRate)
      },
      deliveryTrends,
      urgencyBreakdown,
      lastUpdated: new Date()
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching delivery analytics', error: error.message });
  }
});

module.exports = router;
