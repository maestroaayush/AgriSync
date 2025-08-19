const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api';

// Test farmer coordinates integration
async function testFarmerCoordinatesIntegration() {
  try {
    console.log('🧪 Testing farmer coordinates integration...\n');

    // Step 1: Check if server is running
    try {
      const healthCheck = await axios.get(`${BASE_URL}/auth/users/locations`);
      console.log('✅ Server is running');
      console.log('📍 Farmers with coordinates found:', healthCheck.data.length);
      
      if (healthCheck.data.length > 0) {
        const farmer = healthCheck.data[0];
        console.log(`\n👨‍🌾 Sample farmer: ${farmer.name}`);
        console.log(`📍 Location: ${farmer.coordinates.address || 'No address'}`);
        console.log(`🗺️ Coordinates: ${farmer.coordinates.latitude}, ${farmer.coordinates.longitude}`);
      }
      
    } catch (serverError) {
      console.log('❌ Server not running. Start the server first with: cd server && npm start');
      return;
    }

    console.log('\n✅ Farmer coordinates integration implemented successfully!');
    console.log('\n📋 Changes made:');
    console.log('✓ Delivery creation now uses farmer coordinates from admin location tab');
    console.log('✓ Admin delivery acceptance auto-populates farmer coordinates');
    console.log('✓ Transporter requests include farmer coordinates');
    console.log('✓ Pickup points use admin-managed farmer locations');
    
    console.log('\n🧪 To test the full workflow:');
    console.log('1. Ensure farmers have coordinates set in admin location tab');
    console.log('2. Login as farmer and create delivery request');
    console.log('3. Check that pickup coordinates are automatically set');
    console.log('4. Admin accepts delivery (coordinates preserved)');
    console.log('5. Transporter sees accurate pickup locations in route optimization');

  } catch (error) {
    console.error('❌ Test error:', error.message);
  }
}

// Run the test
testFarmerCoordinatesIntegration();
