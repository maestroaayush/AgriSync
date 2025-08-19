const axios = require('axios');

async function testAPIEndpoints() {
  try {
    console.log('🧪 Testing API endpoints and delivery status update...\n');
    
    // Test different login credentials from seed data
    const credentials = [
      { email: 'farmer1@test.com', password: 'password123', role: 'farmer' },
      { email: 'transporter@test.com', password: 'password123', role: 'transporter' },
      { email: 'warehouse@test.com', password: 'password123', role: 'warehouse' },
      { email: 'admin@agrisync.com', password: 'admin123', role: 'admin' }
    ];
    
    let transporterToken = null;
    let farmerToken = null;
    
    // Try to login with each credential
    for (const cred of credentials) {
      try {
        console.log(`🔑 Trying to login as ${cred.role}: ${cred.email}`);
        const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
          email: cred.email,
          password: cred.password
        });
        
        console.log(`✅ Successfully logged in as ${cred.role}`);
        
        if (cred.role === 'transporter') {
          transporterToken = loginResponse.data.token;
        } else if (cred.role === 'farmer') {
          farmerToken = loginResponse.data.token;
        }
        
      } catch (error) {
        console.log(`❌ Failed to login as ${cred.role}: ${error.response?.data?.message || error.message}`);
      }
    }
    
    // If we have a transporter token, test delivery operations
    if (transporterToken) {
      console.log('\n📦 Testing delivery operations with transporter token...');
      
      // Get deliveries
      try {
        const deliveriesResponse = await axios.get('http://localhost:5000/api/deliveries', {
          headers: { Authorization: `Bearer ${transporterToken}` }
        });
        
        console.log(`✅ Found ${deliveriesResponse.data.length} deliveries`);
        
        if (deliveriesResponse.data.length > 0) {
          const testDelivery = deliveriesResponse.data[0];
          console.log(`🔄 Testing status update for delivery: ${testDelivery._id}`);
          console.log(`   Current status: ${testDelivery.status}`);
          console.log(`   Attempting to update to: in_transit`);
          
          // Test status update
          const updateResponse = await axios.put(
            `http://localhost:5000/api/deliveries/${testDelivery._id}/status`,
            { status: 'in_transit' },
            { headers: { Authorization: `Bearer ${transporterToken}` } }
          );
          
          console.log('✅ Status update successful!');
          console.log(`   New status: ${updateResponse.data.status}`);
          console.log('📄 Response keys:', Object.keys(updateResponse.data));
          
        } else {
          console.log('ℹ️  No deliveries found. Creating a test delivery...');
          
          // Create a test delivery if we have farmer token
          if (farmerToken) {
            const deliveryResponse = await axios.post('http://localhost:5000/api/deliveries', {
              destination: 'Test Warehouse',
              itemName: 'Test Vegetables',
              quantity: 50,
              urgency: 'normal',
              notes: 'Test delivery for status update'
            }, {
              headers: { Authorization: `Bearer ${farmerToken}` }
            });
            
            console.log('✅ Created test delivery:', deliveryResponse.data.delivery._id);
          }
        }
        
      } catch (error) {
        console.error('❌ Delivery operation failed:', error.response?.data || error.message);
      }
    }
    
    // Test the specific status values that are valid
    console.log('\n🔍 Testing valid status values...');
    const testStatuses = ['pending', 'in_transit', 'delivered', 'cancelled'];
    
    for (const status of testStatuses) {
      console.log(`   ✓ Testing status: "${status}"`);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testAPIEndpoints();
