#!/usr/bin/env node

const mongoose = require('mongoose');
const Inventory = require('./models/Inventory');
const User = require('./models/user');
const Warehouse = require('./models/Warehouse');
require('dotenv').config();

async function testInventoryRemoval() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/agrisync', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB');

    // Find a warehouse manager
    const warehouseManager = await User.findOne({ role: 'warehouse_manager' });
    if (!warehouseManager) {
      console.error('❌ No warehouse manager found in database');
      process.exit(1);
    }
    
    console.log('👤 Warehouse Manager:', {
      name: warehouseManager.name,
      email: warehouseManager.email,
      location: warehouseManager.location,
      role: warehouseManager.role,
      id: warehouseManager._id
    });

    // Find an inventory item
    const inventoryItem = await Inventory.findOne({});
    if (!inventoryItem) {
      console.error('❌ No inventory items found in database');
      process.exit(1);
    }
    
    console.log('📦 Inventory Item:', {
      id: inventoryItem._id,
      name: inventoryItem.itemName,
      location: inventoryItem.location,
      quantity: inventoryItem.quantity,
      unit: inventoryItem.unit
    });

    // Check if warehouse exists for this location
    const warehouse = await Warehouse.findOne({ location: inventoryItem.location });
    console.log('🏭 Warehouse:', warehouse ? {
      location: warehouse.location,
      manager: warehouse.manager,
      capacityLimit: warehouse.capacityLimit,
      isManuallyAdded: warehouse.isManuallyAdded
    } : 'Not found');

    // Check if warehouse is linked to manager
    if (warehouse && warehouse.manager) {
      const isLinked = warehouse.manager.toString() === warehouseManager._id.toString();
      console.log('🔗 Warehouse-Manager Link:', isLinked ? 'Yes' : 'No');
    }

    // Check location match
    const locationMatch = warehouseManager.location === inventoryItem.location;
    console.log('📍 Location Match:', locationMatch ? 
      `Yes (${warehouseManager.location})` : 
      `No (User: ${warehouseManager.location}, Item: ${inventoryItem.location})`);

    // Test the removal logic
    console.log('\n🧪 Testing removal conditions:');
    
    if (warehouse && warehouse.manager && warehouse.manager.toString() === warehouseManager._id.toString()) {
      console.log('✅ PASS: Warehouse is explicitly linked to manager');
    } else if (warehouseManager.role === 'warehouse_manager' && warehouseManager.location === inventoryItem.location) {
      console.log('✅ PASS: Manager location matches inventory location');
    } else {
      console.log('❌ FAIL: Neither condition met for removal permission');
      console.log('   Fix: Either link warehouse to manager OR ensure user location matches inventory location');
    }

    // Suggest fixes
    console.log('\n💡 Suggested Fixes:');
    if (!warehouse) {
      console.log('1. Create warehouse document:');
      console.log(`   db.warehouses.insertOne({
       location: "${inventoryItem.location}",
       manager: ObjectId("${warehouseManager._id}"),
       capacityLimit: 10000,
       isManuallyAdded: true
     })`);
    } else if (!warehouse.manager) {
      console.log('1. Link warehouse to manager:');
      console.log(`   db.warehouses.updateOne(
       {_id: ObjectId("${warehouse._id}")},
       {$set: {manager: ObjectId("${warehouseManager._id}")}}
     )`);
    }
    
    if (!locationMatch) {
      console.log('2. Update user location to match inventory:');
      console.log(`   db.users.updateOne(
       {_id: ObjectId("${warehouseManager._id}")},
       {$set: {location: "${inventoryItem.location}"}}
     )`);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n👋 Disconnected from MongoDB');
  }
}

// Run the test
testInventoryRemoval();
