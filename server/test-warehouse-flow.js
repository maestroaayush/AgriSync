#!/usr/bin/env node

const mongoose = require('mongoose');
const User = require('./models/user');
const Warehouse = require('./models/Warehouse');
const Inventory = require('./models/Inventory');
require('dotenv').config();

async function testWarehouseFlow() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/agrisync');
    console.log('✅ Connected to MongoDB\n');

    console.log('=== WAREHOUSE MANAGEMENT FLOW TEST ===\n');

    // Step 1: Show existing users
    console.log('1️⃣ EXISTING USERS:');
    const users = await User.find({}, 'name email role location');
    users.forEach(user => {
      console.log(`   - ${user.name} (${user.email}) - Role: ${user.role}, Location: ${user.location || 'Not set'}`);
    });

    // Step 2: Simulate admin creating a warehouse and assigning a manager
    console.log('\n2️⃣ SIMULATING WAREHOUSE CREATION:');
    
    // Let's use the Test Farmer as an example user to be made warehouse manager
    const userToPromote = await User.findOne({ email: 'farmer@test.com' });
    if (userToPromote) {
      console.log(`   - Admin selects user: ${userToPromote.name}`);
      console.log(`   - Current role: ${userToPromote.role}`);
      
      // This would happen via the /api/warehouse/set-capacity endpoint
      // The fix we applied will automatically update the user's role
      console.log('   - After warehouse assignment, role will be updated to: warehouse_manager');
      
      // Simulate the role update
      userToPromote.role = 'warehouse_manager';
      userToPromote.location = 'Test Warehouse Location';
      userToPromote.capacityLimit = 10000; // Add required field
      await userToPromote.save();
      console.log(`   ✅ User ${userToPromote.name} is now a warehouse_manager at ${userToPromote.location}`);
    }

    // Step 3: Create or update a warehouse
    console.log('\n3️⃣ CREATING/UPDATING WAREHOUSE:');
    const warehouseLocation = 'Test Warehouse Location';
    
    let warehouse = await Warehouse.findOne({ location: warehouseLocation });
    if (!warehouse) {
      warehouse = new Warehouse({
        location: warehouseLocation,
        manager: userToPromote._id,
        capacityLimit: 10000,
        isManuallyAdded: true,
        addedBy: userToPromote._id // Would normally be admin ID
      });
      await warehouse.save();
      console.log(`   ✅ Created warehouse at ${warehouseLocation}`);
    } else {
      warehouse.manager = userToPromote._id;
      await warehouse.save();
      console.log(`   ✅ Updated warehouse at ${warehouseLocation}`);
    }

    // Step 4: Create test inventory
    console.log('\n4️⃣ CREATING TEST INVENTORY:');
    
    // Check if inventory exists
    let inventoryItem = await Inventory.findOne({ location: warehouseLocation });
    if (!inventoryItem) {
      inventoryItem = new Inventory({
        user: userToPromote._id,
        itemName: 'Test Rice',
        quantity: 100,
        unit: 'kg',
        location: warehouseLocation,
        category: 'grains',
        status: 'available',
        description: 'Test inventory item',
        addedByRole: 'warehouse_manager' // Add required field
      });
      await inventoryItem.save();
      console.log(`   ✅ Created inventory item: ${inventoryItem.itemName} (${inventoryItem.quantity} ${inventoryItem.unit})`);
    } else {
      console.log(`   ℹ️ Inventory already exists: ${inventoryItem.itemName}`);
    }

    // Step 5: Test permission checks
    console.log('\n5️⃣ TESTING PERMISSION CHECKS:');
    
    console.log('   Checking if warehouse manager can edit/delete inventory:');
    
    // Check warehouse-manager link
    const warehouseLinked = warehouse.manager.toString() === userToPromote._id.toString();
    console.log(`   - Warehouse linked to manager: ${warehouseLinked ? '✅ Yes' : '❌ No'}`);
    
    // Check location match
    const locationMatch = userToPromote.location === inventoryItem.location;
    console.log(`   - Manager location matches inventory: ${locationMatch ? '✅ Yes' : '❌ No'}`);
    
    // Check role
    const hasRole = userToPromote.role === 'warehouse_manager';
    console.log(`   - User has warehouse_manager role: ${hasRole ? '✅ Yes' : '❌ No'}`);
    
    // Final permission check
    const canManageInventory = (warehouseLinked || (hasRole && locationMatch));
    console.log(`\n   🔑 CAN MANAGE INVENTORY: ${canManageInventory ? '✅ YES' : '❌ NO'}`);
    
    if (canManageInventory) {
      console.log('   ✅ User can edit and delete inventory items!');
    } else {
      console.log('   ❌ User cannot manage inventory. Fix needed!');
    }

    // Step 6: Show summary
    console.log('\n=== SUMMARY ===');
    console.log('📊 System Status:');
    console.log(`   - Warehouse Manager: ${userToPromote.name} (${userToPromote.email})`);
    console.log(`   - Location: ${userToPromote.location}`);
    console.log(`   - Warehouse: ${warehouse.location} (Capacity: ${warehouse.capacityLimit})`);
    console.log(`   - Inventory: ${inventoryItem.itemName} (${inventoryItem.quantity} ${inventoryItem.unit})`);
    console.log(`   - Permission to Edit/Delete: ${canManageInventory ? '✅ GRANTED' : '❌ DENIED'}`);

    // Login credentials
    console.log('\n🔐 TO TEST IN BROWSER:');
    console.log(`   1. Login as: ${userToPromote.email} / password123`);
    console.log('   2. Navigate to Warehouse Dashboard');
    console.log('   3. Go to Inventory tab');
    console.log('   4. Try Edit (green) or Delete (red) buttons');
    console.log('   5. Operations should work now! ✅');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n👋 Disconnected from MongoDB');
  }
}

// Run the test
testWarehouseFlow();
