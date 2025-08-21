const axios = require('axios');

async function testDeliveryStatusUpdate() {
  const BASE_URL = 'http://localhost:5000';
  
  // You'll need to replace these with actual values from your database
  const TEST_DELIVERY_ID = 'YOUR_DELIVERY_ID_HERE';
  const TEST_TOKEN = 'YOUR_TRANSPORTER_TOKEN_HERE';
  
  console.log('🧪 Testing delivery status update...');
  
  try {
    // Test updating status to in_transit
    console.log('1. Testing status update to in_transit...');
    const response = await axios.put(
      `${BASE_URL}/api/deliveries/${TEST_DELIVERY_ID}/status`,
      { status: 'in_transit' },
      { 
        headers: { 
          Authorization: `Bearer ${TEST_TOKEN}`,
          'Content-Type': 'application/json'
        } 
      }
    );
    
    console.log('✅ Status update successful!');
    console.log('Response status:', response.status);
    console.log('Response data:', response.data);
    
    // Test route API to verify items are included
    console.log('\\n2. Testing route API for items data...');
    const routeResponse = await axios.get(
      `${BASE_URL}/api/delivery/${TEST_DELIVERY_ID}/route`,
      { 
        headers: { 
          Authorization: `Bearer ${TEST_TOKEN}`
        } 
      }
    );
    
    console.log('✅ Route API successful!');
    console.log('Route status:', routeResponse.status);
    console.log('Items in route:', routeResponse.data.route?.items?.length || 0);
    console.log('Items data:', routeResponse.data.route?.items || []);
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    console.error('Status code:', error.response?.status);
  }
}

console.log('📋 Test Instructions:');
console.log('1. Make sure the server is running');
console.log('2. Update TEST_DELIVERY_ID and TEST_TOKEN in this script');
console.log('3. Run: node test-delivery-status.js');
console.log('\\n⚠️ This is a test script. Update the constants before running.');

// Uncomment the line below after updating the constants
// testDeliveryStatusUpdate();
