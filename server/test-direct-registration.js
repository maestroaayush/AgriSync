const mongoose = require('mongoose');
require('dotenv').config();

async function testRegistrationDirect() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');
    
    const User = require('./models/User');
    const bcrypt = require('bcryptjs');
    
    // Test user data
    const userData = {
      name: 'Test Direct User',
      email: 'testdirect@example.com',
      password: await bcrypt.hash('password123', 12),
      role: 'farmer',
      phone: '1234567890',
      location: 'Test Location',
      emailVerified: false,
      emailVerificationToken: '123456',
      emailVerificationExpires: new Date(Date.now() + 10 * 60 * 1000),
      approved: false
    };
    
    console.log('💾 Creating user directly in database...');
    
    // Check if user already exists
    const existingUser = await User.findOne({ email: userData.email });
    if (existingUser) {
      console.log('🗑️ Removing existing user...');
      await User.findByIdAndDelete(existingUser._id);
    }
    
    const user = new User(userData);
    await user.save();
    
    console.log('✅ User created successfully!');
    console.log('User ID:', user._id);
    console.log('User email:', user.email);
    console.log('User role:', user.role);
    
    // Clean up
    await User.findByIdAndDelete(user._id);
    console.log('🗑️ Test user cleaned up');
    
    await mongoose.connection.close();
    console.log('🔗 MongoDB connection closed');
    
  } catch (error) {
    console.error('❌ Direct registration test failed:', error.message);
    console.error('Error details:', error);
  }
}

testRegistrationDirect();
