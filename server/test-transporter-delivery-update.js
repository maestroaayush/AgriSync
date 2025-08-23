const axios = require('axios');

async function testDeliveryStatusUpdate() {
  try {
    console.log('🧪 Testing delivery status update...');
    
    // First, let's login as the transporter to get a valid token
    const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'transporter@test.com',
      password: 'password123'
    });
    
    const token = loginResponse.data.token;
    console.log('✅ Logged in as transporter');
    
    // Now try to update the delivery status to 'delivered'
    const deliveryId = '68a7d8925eca7e90bd690bc1';
    console.log('📦 Updating delivery status for:', deliveryId);
    
    const updateResponse = await axios.put(
      `http://localhost:5000/api/deliveries/${deliveryId}/status`,
      { status: 'delivered' },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('✅ Status update successful!');
    console.log('Response status:', updateResponse.status);
    console.log('Response data:', updateResponse.data);
    
  } catch (error) {
    console.error('❌ Status update failed');
    console.error('Status:', error.response?.status);
    console.error('Status text:', error.response?.statusText);
    console.error('Error message:', error.response?.data?.message || error.message);
    console.error('Error details:', error.response?.data?.error);
    
    if (error.response?.data) {
      console.error('Full error response:', error.response.data);
    }
  }
}

testDeliveryStatusUpdate();
