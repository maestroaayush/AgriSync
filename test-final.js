const axios = require('axios');

async function testDeliveryUpdate() {
  try {
    console.log('🔧 Testing delivery status update fix...\n');
    
    // Login as admin
    const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'admin@agrisync.com',
      password: 'admin123'
    });
    
    console.log('✅ Admin login successful');
    const token = loginResponse.data.token;
    
    // Try to update a delivery with an assigned status to in_transit
    const testDeliveryId = '689c6a9b7a7edc2e2eec61f9'; // This was one of the assigned deliveries
    
    console.log(`🔄 Updating delivery ${testDeliveryId} status to 'in_transit'...`);
    
    const updateResponse = await axios.put(
      `http://localhost:5000/api/deliveries/${testDeliveryId}/status`,
      { status: 'in_transit' },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    
    console.log('✅ SUCCESS! Delivery status update worked!');
    console.log(`   Updated status: ${updateResponse.data.status}`);
    console.log(`   Delivery ID: ${updateResponse.data._id}`);
    
    // Test updating it back to delivered
    console.log(`\n🔄 Updating delivery back to 'delivered'...`);
    
    const updateResponse2 = await axios.put(
      `http://localhost:5000/api/deliveries/${testDeliveryId}/status`,
      { status: 'delivered' },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    
    console.log('✅ SUCCESS! Second status update worked!');
    console.log(`   Final status: ${updateResponse2.data.status}`);
    
    console.log('\n🎉 All delivery status update tests passed!');
    console.log('🔧 The 400 Bad Request error has been fixed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Details:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

testDeliveryUpdate();
