#!/usr/bin/env node

const mongoose = require('mongoose');
const User = require('./models/user');
const Warehouse = require('./models/Warehouse');
const Inventory = require('./models/Inventory');
const axios = require('axios');
require('dotenv').config();

async function testWarehousePermissions() {
  let connection;
  
  try {
    // Connect to MongoDB
    connection = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/agrisync');
    console.log('✅ Connected to MongoDB\n');

    console.log('=== TESTING WAREHOUSE MANAGER PERMISSIONS ===\n');

    // Step 1: Check current user status
    console.log('1️⃣ CHECKING USER STATUS IN DATABASE...');
    const user = await User.findOne({ email: 'farmer@test.com' });
    if (!user) {
      console.log('   ❌ User not found!');
      return;
    }
    
    console.log(`   👤 User: ${user.name} (${user.email})`);
    console.log(`   🔑 Role: ${user.role}`);
    console.log(`   📍 Location: ${user.location}`);
    console.log(`   📊 Capacity Limit: ${user.capacityLimit}`);

    // Step 2: Check warehouse
    console.log('\n2️⃣ CHECKING WAREHOUSE...');
    const warehouse = await Warehouse.findOne({ location: user.location });
    if (!warehouse) {
      console.log('   ❌ No warehouse found at user location');
      console.log('   Creating warehouse...');
      
      const newWarehouse = new Warehouse({
        location: user.location,
        manager: user._id,
        capacityLimit: 10000,
        isManuallyAdded: true,
        addedBy: user._id
      });
      await newWarehouse.save();
      console.log('   ✅ Warehouse created');
    } else {
      console.log(`   ✅ Warehouse found at: ${warehouse.location}`);
      console.log(`   👤 Manager ID: ${warehouse.manager}`);
      console.log(`   🔗 Linked to user: ${warehouse.manager.toString() === user._id.toString() ? 'YES' : 'NO'}`);
    }

    // Step 3: Check/Create inventory
    console.log('\n3️⃣ CHECKING INVENTORY...');
    let inventoryItem = await Inventory.findOne({ location: user.location });
    if (!inventoryItem) {
      console.log('   No inventory found, creating test item...');
      
      inventoryItem = new Inventory({
        user: user._id,
        itemName: 'Test Wheat',
        quantity: 100,
        unit: 'kg',
        location: user.location,
        category: 'grains',
        status: 'available',
        description: 'Test inventory for deletion',
        addedByRole: user.role
      });
      await inventoryItem.save();
      console.log('   ✅ Created test inventory item');
    } else {
      console.log(`   ✅ Found inventory: ${inventoryItem.itemName} (${inventoryItem.quantity} ${inventoryItem.unit})`);
    }

    // Step 4: Test API login
    console.log('\n4️⃣ TESTING API LOGIN...');
    try {
      const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
        email: 'farmer@test.com',
        password: 'password123'
      });

      const { token, user: loginUser } = loginResponse.data;
      console.log(`   ✅ Login successful!`);
      console.log(`   👤 Returned user role: ${loginUser.role}`);
      console.log(`   📍 Returned location: ${loginUser.location}`);
      
      // Step 5: Test warehouse deletion endpoint
      console.log('\n5️⃣ TESTING WAREHOUSE DELETE ENDPOINT...');
      
      try {
        const deleteResponse = await axios.delete(
          `http://localhost:5000/api/warehouse/inventory/${inventoryItem._id}/remove`,
          {
            data: {
              quantityToRemove: 20,
              reason: 'Test partial removal'
            },
            headers: { Authorization: `Bearer ${token}` }
          }
        );

        console.log('   ✅ DELETE REQUEST SUCCESSFUL!');
        console.log(`   Response: ${deleteResponse.data.message}`);
        
        // Check updated inventory
        const updatedItem = await Inventory.findById(inventoryItem._id);
        console.log(`   New quantity: ${updatedItem.quantity} ${updatedItem.unit}`);
        
      } catch (deleteError) {
        console.log('   ❌ DELETE REQUEST FAILED!');
        console.log(`   Status: ${deleteError.response?.status}`);
        console.log(`   Error: ${deleteError.response?.data?.message || deleteError.message}`);
        
        // Debug permission check
        console.log('\n   🔍 DEBUGGING PERMISSION CHECK:');
        const warehouseCheck = await Warehouse.findOne({ location: inventoryItem.location });
        console.log(`   - Warehouse exists: ${warehouseCheck ? 'YES' : 'NO'}`);
        if (warehouseCheck) {
          console.log(`   - Warehouse manager: ${warehouseCheck.manager}`);
          console.log(`   - User ID: ${user._id}`);
          console.log(`   - Manager match: ${warehouseCheck.manager.toString() === user._id.toString() ? 'YES' : 'NO'}`);
        }
        console.log(`   - User role: ${user.role}`);
        console.log(`   - User location: ${user.location}`);
        console.log(`   - Item location: ${inventoryItem.location}`);
        console.log(`   - Location match: ${user.location === inventoryItem.location ? 'YES' : 'NO'}`);
      }
      
    } catch (loginError) {
      console.log('   ❌ Login failed!');
      console.log(`   Error: ${loginError.response?.data?.message || loginError.message}`);
    }

    console.log('\n=== TEST COMPLETE ===');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    if (connection) {
      await mongoose.disconnect();
      console.log('\n👋 Disconnected from MongoDB');
    }
  }
}

// Run the test
testWarehousePermissions();
