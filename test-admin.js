const axios = require('axios');

async function testWithAdminToken() {
  try {
    console.log('🧪 Testing with admin access...\n');
    
    // Login as admin
    const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'admin@agrisync.com',
      password: 'admin123'
    });
    
    const adminToken = loginResponse.data.token;
    console.log('✅ Logged in as admin');
    
    // Get all deliveries as admin
    console.log('\n📦 Checking existing deliveries...');
    const deliveriesResponse = await axios.get('http://localhost:5000/api/deliveries', {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    
    console.log(`Found ${deliveriesResponse.data.length} deliveries`);
    
    if (deliveriesResponse.data.length > 0) {
      deliveriesResponse.data.forEach((delivery, index) => {
        console.log(`${index + 1}. ID: ${delivery._id}`);
        console.log(`   Status: ${delivery.status}`);
        console.log(`   Goods: ${delivery.goodsDescription}`);
        console.log(`   Farmer: ${delivery.farmer}`);
        console.log(`   Transporter: ${delivery.transporter || 'None'}`);
        console.log('---');
      });
      
      // Try to update status of the first delivery as admin (admins should be able to update any delivery)
      const testDelivery = deliveriesResponse.data[0];
      console.log(`\n🔄 Testing status update as admin for delivery: ${testDelivery._id}`);
      console.log(`   Current status: ${testDelivery.status}`);
      
      // Try updating to in_transit
      try {
        const updateResponse = await axios.put(
          `http://localhost:5000/api/deliveries/${testDelivery._id}/status`,
          { status: 'in_transit' },
          { headers: { Authorization: `Bearer ${adminToken}` } }
        );
        
        console.log('✅ Status update successful as admin!');
        console.log(`   New status: ${updateResponse.data.status}`);
        
      } catch (updateError) {
        console.error('❌ Status update failed:', updateError.response?.data || updateError.message);
        console.log('Response status:', updateError.response?.status);
        console.log('Response headers:', updateError.response?.headers);
      }
      
    } else {
      console.log('No existing deliveries found');
    }
    
    // Also try to get users to see who exists
    console.log('\n👥 Checking existing users...');
    try {
      // This endpoint might not exist, but let's try
      const usersResponse = await axios.get('http://localhost:5000/api/auth/users', {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      console.log(`Found ${usersResponse.data.length} users`);
      usersResponse.data.forEach(user => {
        console.log(`- ${user.name} (${user.email}) - Role: ${user.role}`);
      });
    } catch (error) {
      console.log('Users endpoint not available or accessible');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

testWithAdminToken();
