const mongoose = require('mongoose');
require('dotenv').config();

async function inspectDeliveryCoordinates() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/agrisync');
    console.log('✅ Connected to MongoDB');

    const Delivery = require('./models/Delivery');

    // Get all deliveries
    const deliveries = await Delivery.find({});
    console.log(`📦 Found ${deliveries.length} total deliveries`);

    console.log('\n🔍 Inspecting delivery coordinates:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    deliveries.forEach((delivery, i) => {
      console.log(`\n${i + 1}. Delivery: ${delivery.goodsDescription} (ID: ${delivery._id})`);
      console.log(`   Status: ${delivery.status}`);
      
      // Check pickup coordinates
      if (delivery.pickupCoordinates && delivery.pickupCoordinates.latitude && delivery.pickupCoordinates.longitude) {
        console.log(`   ✅ Pickup:  ${delivery.pickupCoordinates.latitude}, ${delivery.pickupCoordinates.longitude}`);
      } else {
        console.log(`   ❌ Pickup:  MISSING or INVALID`);
        console.log(`   📍 Raw pickup data:`, JSON.stringify(delivery.pickupCoordinates, null, 2));
      }

      // Check dropoff coordinates
      if (delivery.dropoffCoordinates && delivery.dropoffCoordinates.latitude && delivery.dropoffCoordinates.longitude) {
        console.log(`   ✅ Dropoff: ${delivery.dropoffCoordinates.latitude}, ${delivery.dropoffCoordinates.longitude}`);
      } else {
        console.log(`   ❌ Dropoff: MISSING or INVALID`);
        console.log(`   🏭 Raw dropoff data:`, JSON.stringify(delivery.dropoffCoordinates, null, 2));
      }

      console.log(`   📍 Pickup Location: ${delivery.pickupLocation || 'N/A'}`);
      console.log(`   🏭 Dropoff Location: ${delivery.dropoffLocation || 'N/A'}`);
      
      if (delivery.transporter) {
        console.log(`   🚛 Transporter: ${delivery.transporter}`);
      }
    });

    // Count valid vs invalid coordinates
    const withValidPickup = deliveries.filter(d => d.pickupCoordinates?.latitude && d.pickupCoordinates?.longitude).length;
    const withValidDropoff = deliveries.filter(d => d.dropoffCoordinates?.latitude && d.dropoffCoordinates?.longitude).length;
    const withBothValid = deliveries.filter(d => 
      d.pickupCoordinates?.latitude && d.pickupCoordinates?.longitude &&
      d.dropoffCoordinates?.latitude && d.dropoffCoordinates?.longitude
    ).length;

    console.log('\n📊 Coordinate Statistics:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`📦 Total deliveries: ${deliveries.length}`);
    console.log(`📍 With valid pickup coordinates: ${withValidPickup} (${((withValidPickup/deliveries.length)*100).toFixed(1)}%)`);
    console.log(`🏭 With valid dropoff coordinates: ${withValidDropoff} (${((withValidDropoff/deliveries.length)*100).toFixed(1)}%)`);
    console.log(`✅ With both pickup AND dropoff coordinates: ${withBothValid} (${((withBothValid/deliveries.length)*100).toFixed(1)}%)`);
    console.log(`🗺️ Ready for route visualization: ${withBothValid > 0 ? '✅ Yes' : '❌ No'}`);

    // Find deliveries with specific transporter for debugging
    const specificDelivery = deliveries.find(d => d._id.toString() === '68a1ca35d2d5c0d67fa6ac4f');
    if (specificDelivery) {
      console.log('\n🔍 SPECIFIC DELIVERY FROM LOGS (68a1ca35d2d5c0d67fa6ac4f):');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`Description: ${specificDelivery.goodsDescription}`);
      console.log(`Status: ${specificDelivery.status}`);
      console.log(`Pickup Location: ${specificDelivery.pickupLocation}`);
      console.log(`Dropoff Location: ${specificDelivery.dropoffLocation}`);
      console.log(`Pickup Coordinates:`, JSON.stringify(specificDelivery.pickupCoordinates, null, 2));
      console.log(`Dropoff Coordinates:`, JSON.stringify(specificDelivery.dropoffCoordinates, null, 2));
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error inspecting delivery coordinates:', error);
    process.exit(1);
  }
}

inspectDeliveryCoordinates();
