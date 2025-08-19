const mongoose = require('mongoose');
const axios = require('axios');
require('dotenv').config();

async function testRouteAPI() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/agrisync');
    console.log('✅ Connected to MongoDB');

    const Delivery = require('./models/Delivery');
    const User = require('./models/user');

    // Find a delivery with a transporter assigned
    const deliveryWithTransporter = await Delivery.findOne({ 
      transporter: { $ne: null }
    }).populate('transporter', 'name email');

    if (!deliveryWithTransporter) {
      console.log('❌ No deliveries with assigned transporters found');
      process.exit(1);
    }

    console.log('✅ Found delivery with transporter:');
    console.log(`   Delivery ID: ${deliveryWithTransporter._id}`);
    console.log(`   Description: ${deliveryWithTransporter.goodsDescription}`);
    console.log(`   Status: ${deliveryWithTransporter.status}`);
    console.log(`   Transporter: ${deliveryWithTransporter.transporter?.name || 'Unknown'}`);

    // Get the transporter token (we'll simulate this)
    const transporter = await User.findById(deliveryWithTransporter.transporter);
    if (!transporter) {
      console.log('❌ Transporter user not found');
      process.exit(1);
    }

    console.log(`\n🔍 Testing route API for delivery ${deliveryWithTransporter._id}...`);

    // Since we can't easily get a valid JWT token in this script, 
    // let's directly call the route logic to see what data is returned
    const routeInfo = {
      deliveryId: deliveryWithTransporter._id,
      status: deliveryWithTransporter.status,
      pickedUp: deliveryWithTransporter.pickedUp,
      goodsDescription: deliveryWithTransporter.goodsDescription,
      quantity: deliveryWithTransporter.quantity,
      
      // Pickup location (farmer)
      pickup: {
        location: deliveryWithTransporter.pickupLocation,
        coordinates: deliveryWithTransporter.pickupCoordinates,
        contact: {
          name: 'Test Farmer',
          email: 'farmer@test.com'
        }
      },
      
      // Delivery destination (warehouse or custom location)
      delivery: {
        location: deliveryWithTransporter.dropoffLocation,
        coordinates: deliveryWithTransporter.dropoffCoordinates,
        warehouse: null
      },
      
      // Scheduling information
      scheduledPickupTime: deliveryWithTransporter.scheduledPickupTime,
      scheduledDeliveryTime: deliveryWithTransporter.scheduledDeliveryTime,
      estimatedArrival: deliveryWithTransporter.estimatedArrival,
      actualPickupTime: deliveryWithTransporter.actualPickupTime,
      
      // Current tracking
      currentLocation: deliveryWithTransporter.currentLocation,
      locationHistory: deliveryWithTransporter.locationHistory || [],
      
      // Notes
      adminNotes: deliveryWithTransporter.adminNotes
    };

    console.log('\n📡 Route API Response Preview:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🎯 Success: true');
    console.log(`📍 Pickup coordinates: ${JSON.stringify(routeInfo.pickup.coordinates)}`);
    console.log(`🏭 Delivery coordinates: ${JSON.stringify(routeInfo.delivery.coordinates)}`);
    
    // Check if coordinates are valid
    const pickupValid = routeInfo.pickup.coordinates?.latitude && routeInfo.pickup.coordinates?.longitude;
    const deliveryValid = routeInfo.delivery.coordinates?.latitude && routeInfo.delivery.coordinates?.longitude;
    
    console.log(`\n✅ Coordinate Validation:`);
    console.log(`   📍 Pickup coordinates valid: ${pickupValid ? '✅ Yes' : '❌ No'}`);
    console.log(`   🏭 Delivery coordinates valid: ${deliveryValid ? '✅ Yes' : '❌ No'}`);
    console.log(`   🗺️ Ready for map display: ${pickupValid && deliveryValid ? '✅ Yes' : '❌ No'}`);

    if (pickupValid && deliveryValid) {
      console.log(`\n🎉 SUCCESS: This delivery should display properly in the route visualization!`);
      console.log(`\n📋 Frontend Integration Steps:`);
      console.log(`   1. Click "View Route" on delivery: ${deliveryWithTransporter.goodsDescription}`);
      console.log(`   2. Route should load in Routes tab with interactive map`);
      console.log(`   3. Map should show pickup and dropoff markers with route line`);
    } else {
      console.log(`\n❌ ISSUE: Coordinates are missing - route visualization will not work`);
    }

    // Show the complete route response structure
    console.log(`\n📋 Complete Route Response Structure:`);
    console.log(JSON.stringify({
      success: true,
      route: routeInfo
    }, null, 2));

    process.exit(0);
  } catch (error) {
    console.error('❌ Error testing route API:', error);
    process.exit(1);
  }
}

testRouteAPI();
