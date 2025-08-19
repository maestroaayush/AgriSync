const axios = require('axios');
const mongoose = require('mongoose');
require('dotenv').config();

const BASE_URL = 'http://localhost:5000/api';

// Test farmer coordinates integration
async function testFarmerCoordinatesIntegration() {
  try {
    console.log('🧪 Testing farmer coordinates integration...\n');

    // Step 1: Get farmers with coordinates
    const farmersResponse = await axios.get(`${BASE_URL}/auth/users/locations`);
    console.log('📍 Farmers with coordinates:', farmersResponse.data.length);
    
    if (farmersResponse.data.length > 0) {
      const farmer = farmersResponse.data[0];
      console.log(`\n👨‍🌾 Sample farmer: ${farmer.name}`);
      console.log(`📍 Location: ${farmer.coordinates.address || 'No address'}`);
      console.log(`🗺️ Coordinates: ${farmer.coordinates.latitude}, ${farmer.coordinates.longitude}`);
      
      // Step 2: Test delivery creation with farmer coordinates
      console.log('\n🚛 Testing delivery creation with farmer coordinates...');
      
      // You would need to authenticate as a farmer first
      console.log('📝 Note: To fully test, you would need to:');
      console.log('1. Login as a farmer with coordinates');
      console.log('2. Create a delivery request');
      console.log('3. Verify pickup coordinates are automatically set');
      console.log('4. Have admin accept the delivery');
      console.log('5. Verify coordinates are preserved/used');
    } else {
      console.log('❌ No farmers with coordinates found');
      console.log('🔧 Make sure farmers have coordinates set in admin location tab');
    }

    // Step 3: Check existing deliveries for coordinate data
    console.log('\n📦 Checking existing deliveries for coordinate data...');
    
    try {
      // This would require authentication, so just check database directly
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/agrisync');
      
      const Delivery = require('./server/models/Delivery');
      const deliveries = await Delivery.find({ pickupCoordinates: { $exists: true } });
      
      console.log(`📊 Deliveries with pickup coordinates: ${deliveries.length}`);
      
      if (deliveries.length > 0) {
        const delivery = deliveries[0];
        console.log(`\n📦 Sample delivery: ${delivery.goodsDescription}`);
        console.log(`📍 Pickup location: ${delivery.pickupLocation}`);
        if (delivery.pickupCoordinates) {
          console.log(`🗺️ Pickup coordinates: ${delivery.pickupCoordinates.latitude}, ${delivery.pickupCoordinates.longitude}`);
        }
      }
      
      await mongoose.connection.close();
      
    } catch (dbError) {
      console.log('⚠️ Database check failed:', dbError.message);
    }

    console.log('\n✅ Farmer coordinates integration test completed');
    console.log('\n📋 Summary:');
    console.log('- Modified delivery creation to use farmer coordinates from admin location tab');
    console.log('- Updated admin delivery acceptance to auto-populate farmer coordinates');
    console.log('- Enhanced transporter request to include farmer coordinates');
    console.log('- Pickup points now use admin-managed farmer locations');

  } catch (error) {
    console.error('❌ Test error:', error.message);
  }
}

// Run the test
testFarmerCoordinatesIntegration();
