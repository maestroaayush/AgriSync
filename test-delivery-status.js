const axios = require('axios');

async function testDeliveryStatusUpdate() {
  try {
    console.log('🧪 Testing delivery status update...\n');
    
    // First, let's login as a transporter to get a token
    const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'transporter@test.com',
      password: 'password123'
    });
    
    const token = loginResponse.data.token;
    console.log('✅ Logged in as transporter');
    
    // Get all deliveries for this transporter
    const deliveriesResponse = await axios.get('http://localhost:5000/api/deliveries', {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    const deliveries = deliveriesResponse.data;
    console.log(`📦 Found ${deliveries.length} deliveries`);
    
    if (deliveries.length === 0) {
      console.log('❌ No deliveries found to test with');
      return;
    }
    
    // Find a delivery that can be updated (assigned status)
    const assignedDelivery = deliveries.find(d => d.status === 'assigned');
    
    if (!assignedDelivery) {
      console.log('📋 No assigned deliveries found. Testing with first delivery...');
      console.log('Available deliveries:');
      deliveries.forEach((d, i) => {
        console.log(`  ${i+1}. ID: ${d._id}, Status: ${d.status}, Goods: ${d.goodsDescription}`);
      });
      
      // Use the first delivery for testing
      const testDelivery = deliveries[0];
      
      // Test updating status from current status to in_transit
      console.log(`\n🔄 Testing status update for delivery: ${testDelivery._id}`);
      console.log(`   Current status: ${testDelivery.status}`);
      console.log(`   Updating to: in_transit`);
      
      const updateResponse = await axios.put(
        `http://localhost:5000/api/deliveries/${testDelivery._id}/status`,
        { status: 'in_transit' },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      console.log('✅ Status update successful!');
      console.log(`   New status: ${updateResponse.data.status}`);
      console.log('📝 Response data:', JSON.stringify(updateResponse.data, null, 2));
      
    } else {
      console.log(`\n🔄 Testing status update for assigned delivery: ${assignedDelivery._id}`);
      console.log(`   Current status: ${assignedDelivery.status}`);
      console.log(`   Updating to: in_transit`);
      
      const updateResponse = await axios.put(
        `http://localhost:5000/api/deliveries/${assignedDelivery._id}/status`,
        { status: 'in_transit' },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      console.log('✅ Status update successful!');
      console.log(`   New status: ${updateResponse.data.status}`);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

testDeliveryStatusUpdate();
