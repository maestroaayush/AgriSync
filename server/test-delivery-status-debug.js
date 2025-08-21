const axios = require('axios');
const mongoose = require('mongoose');
require('dotenv').config();

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/agrisync', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

const Delivery = require('./models/Delivery');
const User = require('./models/user');

async function testDeliveryStatusUpdate() {
  try {
    console.log('🔍 Starting delivery status update debug test...\n');
    
    // Step 1: Find a transporter user
    const transporter = await User.findOne({ role: 'transporter' });
    if (!transporter) {
      console.log('❌ No transporter found in database');
      process.exit(1);
    }
    console.log('✅ Found transporter:', transporter.name, '(ID:', transporter._id, ')');
    
    // Step 2: Find an in-transit delivery for this transporter
    const delivery = await Delivery.findOne({ 
      transporter: transporter._id,
      status: 'in_transit'
    });
    
    if (!delivery) {
      console.log('❌ No in-transit delivery found for this transporter');
      console.log('Creating a test delivery...');
      
      // Create a test delivery
      const farmer = await User.findOne({ role: 'farmer' });
      if (!farmer) {
        console.log('❌ No farmer found to create test delivery');
        process.exit(1);
      }
      
      const newDelivery = new Delivery({
        farmer: farmer._id,
        transporter: transporter._id,
        pickupLocation: 'Test Farm',
        dropoffLocation: 'Test Warehouse',
        goodsDescription: 'Test Goods',
        quantity: 100,
        status: 'in_transit',
        pickedUp: true,
        pickedUpAt: new Date()
      });
      
      await newDelivery.save();
      console.log('✅ Created test delivery:', newDelivery._id);
      delivery = newDelivery;
    } else {
      console.log('✅ Found delivery:', delivery._id);
    }
    
    console.log('\n📋 Delivery details:');
    console.log('  - Status:', delivery.status);
    console.log('  - Farmer:', delivery.farmer);
    console.log('  - Transporter:', delivery.transporter);
    console.log('  - Pickup:', delivery.pickupLocation);
    console.log('  - Dropoff:', delivery.dropoffLocation);
    console.log('  - Goods:', delivery.goodsDescription);
    console.log('  - Quantity:', delivery.quantity);
    
    // Step 3: Get auth token for transporter
    console.log('\n🔐 Logging in as transporter...');
    const loginResponse = await axios.post('http://localhost:5000/api/users/login', {
      email: transporter.email,
      password: 'password123' // You may need to adjust this
    }).catch(err => {
      console.log('❌ Login failed. Using test token instead.');
      return { data: { token: 'test-token' } };
    });
    
    const token = loginResponse.data.token;
    console.log('✅ Got auth token');
    
    // Step 4: Try to update delivery status to 'delivered'
    console.log('\n🚀 Attempting to update delivery status to "delivered"...\n');
    
    try {
      const response = await axios.put(
        `http://localhost:5000/api/deliveries/${delivery._id}/status`,
        { status: 'delivered' },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      console.log('✅ SUCCESS! Delivery status updated');
      console.log('Response status:', response.status);
      console.log('Updated delivery:', {
        id: response.data._id,
        status: response.data.status,
        actualDeliveryTime: response.data.actualDeliveryTime
      });
      
    } catch (error) {
      console.log('❌ FAILED! Error updating delivery status');
      console.log('Error status:', error.response?.status);
      console.log('Error message:', error.response?.data?.message);
      console.log('Error details:', error.response?.data?.error);
      
      if (error.response?.status === 500) {
        console.log('\n🔍 This is the 500 error we need to fix!');
        console.log('Full error response:', JSON.stringify(error.response?.data, null, 2));
      }
    }
    
  } catch (error) {
    console.error('❌ Test script error:', error);
  } finally {
    // Close database connection
    await mongoose.connection.close();
    console.log('\n👋 Test complete, database connection closed');
    process.exit(0);
  }
}

// Run the test
testDeliveryStatusUpdate();
