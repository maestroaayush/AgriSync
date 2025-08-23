const axios = require('axios');

async function testAdminNotifications() {
  try {
    // Login as admin
    const adminLoginData = {
      email: 'admin@test.com',  // Using the admin we saw in the database
      password: 'password123'
    };
    
    console.log('🔐 Attempting to login as admin...');
    
    let adminToken;
    try {
      const loginResponse = await axios.post('http://localhost:5000/api/auth/login', adminLoginData);
      adminToken = loginResponse.data.token;
      console.log('✅ Admin login successful');
    } catch (loginError) {
      console.log('❌ Admin login failed:', loginError.response?.data?.message || loginError.message);
      
      // Try the other admin
      const adminLoginData2 = {
        email: 'admin@agrisync.com',
        password: 'password123'
      };
      
      try {
        const loginResponse2 = await axios.post('http://localhost:5000/api/auth/login', adminLoginData2);
        adminToken = loginResponse2.data.token;
        console.log('✅ Admin login successful with second admin');
      } catch (e) {
        console.log('❌ Could not login as any admin. Checking admin passwords...');
        
        // Let's check what the actual admin password might be
        const mongoose = require('mongoose');
        require('dotenv').config();
        const User = require('./models/user');
        
        await mongoose.connect(process.env.MONGO_URI);
        const admins = await User.find({ role: 'admin' }).select('name email');
        console.log('Admin users found:', admins);
        await mongoose.disconnect();
        return;
      }
    }
    
    // Fetch notifications for admin
    console.log('📬 Fetching admin notifications...');
    const notificationsResponse = await axios.get('http://localhost:5000/api/notifications', {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    
    const notifications = notificationsResponse.data;
    console.log(`📬 Found ${notifications.length} notifications for admin`);
    
    // Filter for delivery request notifications
    const deliveryNotifications = notifications.filter(n => 
      n.title.includes('Delivery Request') || n.category === 'delivery'
    );
    
    console.log(`📦 Found ${deliveryNotifications.length} delivery-related notifications:`);
    
    deliveryNotifications.slice(0, 5).forEach((notification, index) => {
      console.log(`${index + 1}. ${notification.title}`);
      console.log(`   Message: ${notification.message}`);
      console.log(`   Created: ${new Date(notification.createdAt).toLocaleString()}`);
      console.log(`   Read: ${notification.read ? 'Yes' : 'No'}`);
      console.log('');
    });
    
    if (deliveryNotifications.length === 0) {
      console.log('❌ No delivery request notifications found for admin!');
      console.log('📋 Recent notifications:');
      notifications.slice(0, 3).forEach((notification, index) => {
        console.log(`${index + 1}. ${notification.title} - ${notification.message}`);
      });
    } else {
      console.log('✅ Admin notifications are working correctly!');
    }
    
  } catch (error) {
    console.error('❌ Error during admin notification test:', error.response?.data || error.message);
  }
}

testAdminNotifications();
