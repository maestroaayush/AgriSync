const axios = require('axios');

async function testDeliveryRequest() {
  try {
    // First, let's try to get a vendor token by logging in
    // Replace with actual vendor credentials
    const loginData = {
      email: 'vendor@test.com', // We need to find or create a vendor
      password: 'password123'
    };
    
    console.log('🔐 Attempting to login as vendor...');
    let token;
    
    try {
      const loginResponse = await axios.post('http://localhost:5000/api/auth/login', loginData);
      token = loginResponse.data.token;
      console.log('✅ Login successful');
    } catch (loginError) {
      console.log('❌ Login failed. Let\'s check what vendor users exist...');
      
      // Let's check what users exist in the database first
      const mongoose = require('mongoose');
      require('dotenv').config();
      const User = require('./models/user');
      
      await mongoose.connect(process.env.MONGO_URI);
      
      const vendors = await User.find({ role: 'market_vendor' }).select('name email role');
      console.log('📋 Available vendor users:', vendors);
      
      if (vendors.length === 0) {
        console.log('❌ No vendor users found! Creating a test vendor...');
        const bcrypt = require('bcryptjs');
        const hashedPassword = await bcrypt.hash('password123', 12);
        
        const testVendor = new User({
          name: 'Test Vendor',
          email: 'vendor@test.com',
          password: hashedPassword,
          role: 'market_vendor',
          location: 'Test Market',
          coordinates: {
            latitude: 40.7128,
            longitude: -74.0060,
            address: 'Test Market Location'
          }
        });
        
        await testVendor.save();
        console.log('✅ Test vendor created');
        
        // Now try to login again
        const retryLoginResponse = await axios.post('http://localhost:5000/api/auth/login', loginData);
        token = retryLoginResponse.data.token;
        console.log('✅ Login successful after creating vendor');
      } else {
        console.log('Using first available vendor:', vendors[0].email);
        // Try with first vendor
        const firstVendorLogin = {
          email: vendors[0].email,
          password: 'password123' // assuming default password
        };
        
        try {
          const retryLoginResponse = await axios.post('http://localhost:5000/api/auth/login', firstVendorLogin);
          token = retryLoginResponse.data.token;
          console.log('✅ Login successful with existing vendor');
        } catch (e) {
          console.log('❌ Could not login with existing vendor. Credentials might be different.');
          return;
        }
      }
      
      await mongoose.disconnect();
    }
    
    // Now submit a delivery request
    console.log('📦 Submitting delivery request...');
    const deliveryData = {
      itemName: 'Test Item',
      quantity: 10,
      unit: 'kg',
      urgency: 'normal',
      destination: 'Test Destination',
      notes: 'Test delivery request from API',
      pickupLocation: 'Any Available Warehouse',
      goodsDescription: 'Test Item',
      requesterType: 'market_vendor'
    };
    
    const deliveryResponse = await axios.post('http://localhost:5000/api/deliveries', deliveryData, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log('✅ Delivery request submitted successfully:');
    console.log('📦 Delivery ID:', deliveryResponse.data.delivery._id);
    
    // Wait a moment for notifications to be processed
    console.log('⏳ Waiting for notifications to be processed...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Check admin notifications
    console.log('🔍 Checking admin notifications...');
    
  } catch (error) {
    console.error('❌ Error during test:', error.response?.data || error.message);
  }
}

testDeliveryRequest();
