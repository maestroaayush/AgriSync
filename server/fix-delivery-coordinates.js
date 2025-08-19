const mongoose = require('mongoose');
require('dotenv').config();

// Default warehouse coordinates for missing dropoff coordinates
const defaultWarehouses = [
  {
    name: "Mumbai Central Warehouse",
    coordinates: { latitude: 19.0760, longitude: 72.8777 },
    address: "Mumbai, Maharashtra"
  },
  {
    name: "Pune Distribution Center", 
    coordinates: { latitude: 18.5204, longitude: 73.8567 },
    address: "Pune, Maharashtra"
  },
  {
    name: "Kathmandu Warehouse",
    coordinates: { latitude: 27.7172, longitude: 85.3240 },
    address: "Kathmandu, Nepal"
  },
  {
    name: "Soyambhu Warehouse", 
    coordinates: { latitude: 27.7230, longitude: 85.2980 },
    address: "Soyambhu, Kathmandu"
  }
];

async function fixDeliveryCoordinates() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/agrisync');
    console.log('✅ Connected to MongoDB');

    const Delivery = require('./models/Delivery');
    const User = require('./models/user');

    // Find deliveries without dropoff coordinates
    const deliveriesWithoutDropoff = await Delivery.find({
      $or: [
        { dropoffCoordinates: { $exists: false } },
        { dropoffCoordinates: null },
        { 'dropoffCoordinates.latitude': { $exists: false } },
        { 'dropoffCoordinates.longitude': { $exists: false } }
      ]
    });

    console.log(`🔍 Found ${deliveriesWithoutDropoff.length} deliveries without proper dropoff coordinates`);

    if (deliveriesWithoutDropoff.length === 0) {
      console.log('✅ All deliveries already have dropoff coordinates!');
      process.exit(0);
    }

    let updated = 0;

    for (let i = 0; i < deliveriesWithoutDropoff.length; i++) {
      const delivery = deliveriesWithoutDropoff[i];
      
      // Select warehouse based on delivery location or cycle through defaults
      let warehouseCoords;
      
      if (delivery.dropoffLocation) {
        // Try to match dropoff location to a warehouse
        const locationLower = delivery.dropoffLocation.toLowerCase();
        
        if (locationLower.includes('mumbai')) {
          warehouseCoords = defaultWarehouses[0];
        } else if (locationLower.includes('pune')) {
          warehouseCoords = defaultWarehouses[1];  
        } else if (locationLower.includes('kathmandu')) {
          warehouseCoords = defaultWarehouses[2];
        } else if (locationLower.includes('soyambhu')) {
          warehouseCoords = defaultWarehouses[3];
        } else {
          // Default to cycling through warehouses
          warehouseCoords = defaultWarehouses[i % defaultWarehouses.length];
        }
      } else {
        // Cycle through default warehouses
        warehouseCoords = defaultWarehouses[i % defaultWarehouses.length];
      }

      // Update delivery with dropoff coordinates
      delivery.dropoffCoordinates = {
        latitude: warehouseCoords.coordinates.latitude,
        longitude: warehouseCoords.coordinates.longitude,
        address: warehouseCoords.address
      };

      // Also set dropoff location if missing
      if (!delivery.dropoffLocation) {
        delivery.dropoffLocation = warehouseCoords.name;
      }

      await delivery.save();
      updated++;

      console.log(`📦 Updated delivery ${i + 1}/${deliveriesWithoutDropoff.length}: ${delivery.goodsDescription}`);
      console.log(`   📍 Dropoff: ${warehouseCoords.name} (${warehouseCoords.coordinates.latitude}, ${warehouseCoords.coordinates.longitude})`);
    }

    // Verify the fix
    const verifyDeliveries = await Delivery.find({
      'pickupCoordinates.latitude': { $exists: true },
      'dropoffCoordinates.latitude': { $exists: true }
    });

    console.log(`\n✅ Update Complete!`);
    console.log(`📊 Statistics:`);
    console.log(`   • Updated deliveries: ${updated}`);
    console.log(`   • Total deliveries with both coordinates: ${verifyDeliveries.length}`);
    console.log(`   • Ready for route visualization: ${verifyDeliveries.length > 0 ? '✅ Yes' : '❌ No'}`);

    // Show sample coordinates
    if (verifyDeliveries.length > 0) {
      console.log('\n🗺️ Sample coordinates:');
      verifyDeliveries.slice(0, 3).forEach((delivery, i) => {
        console.log(`${i + 1}. ${delivery.goodsDescription}:`);
        console.log(`   📍 Pickup:  ${delivery.pickupCoordinates.latitude}, ${delivery.pickupCoordinates.longitude}`);
        console.log(`   🏭 Dropoff: ${delivery.dropoffCoordinates.latitude}, ${delivery.dropoffCoordinates.longitude}`);
      });
    }

    console.log('\n🎉 Delivery coordinates have been fixed! The route visualization should now work properly.');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error fixing delivery coordinates:', error);
    process.exit(1);
  }
}

fixDeliveryCoordinates();
