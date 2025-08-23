const axios = require('axios');

async function testRegistration() {
  try {
    console.log('🧪 Testing user registration...');
    
    const registrationData = {
      name: 'Test User',
      email: 'testuser@example.com',
      password: 'password123',
      role: 'farmer',
      phone: '1234567890',
      location: 'Test Location'
    };
    
    console.log('📤 Sending registration request...');
    console.log('Data:', registrationData);
    
    const response = await axios.post('http://localhost:5000/api/auth/register', registrationData, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Registration successful!');
    console.log('Response status:', response.status);
    console.log('Response data:', response.data);
    
  } catch (error) {
    console.error('❌ Registration failed');
    console.error('Status:', error.response?.status);
    console.error('Status text:', error.response?.statusText);
    console.error('Error message:', error.response?.data?.message || error.message);
    console.error('Error details:', error.response?.data?.error);
    
    if (error.response?.data) {
      console.error('Full error response:', JSON.stringify(error.response.data, null, 2));
    }
    
    if (error.code) {
      console.error('Error code:', error.code);
    }
  }
}

testRegistration();
