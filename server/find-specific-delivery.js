const mongoose = require('mongoose');
require('dotenv').config();

async function findSpecificDelivery() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/agrisync');
    console.log('✅ Connected to MongoDB');

    const Delivery = require('./models/Delivery');

    // Look for the specific delivery ID from the logs
    const specificDeliveryId = '68a1ca35d2d5c0d67fa6ac4f';
    console.log(`🔍 Looking for delivery with ID: ${specificDeliveryId}`);

    const specificDelivery = await Delivery.findById(specificDeliveryId);
    
    if (specificDelivery) {
      console.log('✅ Found the specific delivery!');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`Description: ${specificDelivery.goodsDescription}`);
      console.log(`Status: ${specificDelivery.status}`);
      console.log(`Pickup Location: ${specificDelivery.pickupLocation}`);
      console.log(`Dropoff Location: ${specificDelivery.dropoffLocation}`);
      console.log(`Transporter: ${specificDelivery.transporter}`);
      console.log('');
      
      // Check coordinates in detail
      console.log('📍 PICKUP COORDINATES:');
      if (specificDelivery.pickupCoordinates) {
        console.log(`   Latitude: ${specificDelivery.pickupCoordinates.latitude}`);
        console.log(`   Longitude: ${specificDelivery.pickupCoordinates.longitude}`);
        console.log(`   Address: ${specificDelivery.pickupCoordinates.address || 'N/A'}`);
      } else {
        console.log('   ❌ No pickup coordinates found');
      }
      
      console.log('');
      console.log('🏭 DROPOFF COORDINATES:');
      if (specificDelivery.dropoffCoordinates) {
        console.log(`   Latitude: ${specificDelivery.dropoffCoordinates.latitude}`);
        console.log(`   Longitude: ${specificDelivery.dropoffCoordinates.longitude}`);
        console.log(`   Address: ${specificDelivery.dropoffCoordinates.address || 'N/A'}`);
      } else {
        console.log('   ❌ No dropoff coordinates found');
      }
      
      console.log('');
      console.log('📋 RAW DATA:');
      console.log('pickupCoordinates:', JSON.stringify(specificDelivery.pickupCoordinates, null, 2));
      console.log('dropoffCoordinates:', JSON.stringify(specificDelivery.dropoffCoordinates, null, 2));
      
    } else {
      console.log('❌ Delivery not found in current database');
      console.log('');
      
      // Let's find deliveries that have asparagus (from the logs)
      console.log('🔍 Looking for deliveries with "asparagus"...');
      const asparagusDeliveries = await Delivery.find({ 
        goodsDescription: { $regex: /asparagus/i } 
      });
      
      if (asparagusDeliveries.length > 0) {
        console.log(`✅ Found ${asparagusDeliveries.length} asparagus deliveries:`);
        asparagusDeliveries.forEach((delivery, i) => {
          console.log(`${i + 1}. ID: ${delivery._id}, Status: ${delivery.status}, Pickup: ${delivery.pickupLocation}`);
        });
      } else {
        console.log('❌ No asparagus deliveries found');
      }
      
      // Let's find deliveries assigned to the transporter from the logs
      console.log('');
      console.log('🔍 Looking for deliveries with status "in_transit"...');
      const inTransitDeliveries = await Delivery.find({ status: 'in_transit' });
      
      if (inTransitDeliveries.length > 0) {
        console.log(`✅ Found ${inTransitDeliveries.length} in-transit deliveries:`);
        inTransitDeliveries.forEach((delivery, i) => {
          console.log(`${i + 1}. ID: ${delivery._id}, Description: ${delivery.goodsDescription}, Transporter: ${delivery.transporter}`);
          console.log(`   Pickup Coords: ${delivery.pickupCoordinates?.latitude}, ${delivery.pickupCoordinates?.longitude}`);
          console.log(`   Dropoff Coords: ${delivery.dropoffCoordinates?.latitude}, ${delivery.dropoffCoordinates?.longitude}`);
        });
      } else {
        console.log('❌ No in-transit deliveries found');
      }
    }

    // Check for any deliveries with missing dropoff coordinates
    console.log('');
    console.log('🔍 Checking for deliveries with missing or empty dropoff coordinates...');
    const deliveriesWithEmptyDropoff = await Delivery.find({
      $or: [
        { dropoffCoordinates: null },
        { dropoffCoordinates: {} },
        { 'dropoffCoordinates.latitude': { $exists: false } },
        { 'dropoffCoordinates.longitude': { $exists: false } },
        { 'dropoffCoordinates.latitude': null },
        { 'dropoffCoordinates.longitude': null }
      ]
    });
    
    if (deliveriesWithEmptyDropoff.length > 0) {
      console.log(`⚠️ Found ${deliveriesWithEmptyDropoff.length} deliveries with problematic dropoff coordinates:`);
      deliveriesWithEmptyDropoff.forEach((delivery, i) => {
        console.log(`${i + 1}. ID: ${delivery._id}, Description: ${delivery.goodsDescription}`);
        console.log(`   Dropoff Coords:`, JSON.stringify(delivery.dropoffCoordinates, null, 2));
      });
    } else {
      console.log('✅ All deliveries have proper dropoff coordinates in the database');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error finding delivery:', error);
    process.exit(1);
  }
}

findSpecificDelivery();
