#!/usr/bin/env node

const mongoose = require('mongoose');
const User = require('./models/user');
const bcrypt = require('bcryptjs');
require('dotenv').config();

async function createWarehouseManager() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/agrisync');
    console.log('✅ Connected to MongoDB');

    // Check if warehouse manager already exists
    const existing = await User.findOne({ email: 'warehouse@test.com' });
    if (existing) {
      console.log('⚠️ Warehouse manager already exists');
      console.log('User details:', {
        name: existing.name,
        email: existing.email,
        role: existing.role,
        location: existing.location
      });
      process.exit(0);
    }

    // Create warehouse manager
    const hashedPassword = await bcrypt.hash('password123', 10);
    
    const warehouseManager = new User({
      name: 'Test Warehouse Manager',
      email: 'warehouse@test.com',
      password: hashedPassword,
      role: 'warehouse_manager',
      location: 'Main Warehouse',
      phone: '1234567890',
      isVerified: true,
      capacityLimit: 10000  // Add required field for warehouse manager
    });

    await warehouseManager.save();
    
    console.log('✅ Warehouse Manager created successfully!');
    console.log('📧 Email: warehouse@test.com');
    console.log('🔑 Password: password123');
    console.log('📍 Location: Main Warehouse');
    console.log('👤 Role: warehouse_manager');
    console.log('🆔 ID:', warehouseManager._id);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB');
  }
}

// Run the script
createWarehouseManager();
