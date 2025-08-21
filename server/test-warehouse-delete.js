#!/usr/bin/env node

const axios = require('axios');

async function testWarehouseDelete() {
  console.log('=== TESTING WAREHOUSE INVENTORY DELETE ===\n');

  // Test as warehouse manager (farmer@test.com was promoted to warehouse_manager)
  const email = 'farmer@test.com';
  const password = 'password123';

  try {
    // Step 1: Login
    console.log('1️⃣ LOGGING IN AS WAREHOUSE MANAGER...');
    const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
      email,
      password
    });

    const { token, user } = loginResponse.data;
    console.log(`   ✅ Logged in as: ${user.name} (${user.role})`);
    console.log(`   📍 Location: ${user.location}`);
    console.log(`   🔑 Token received: ${token.substring(0, 20)}...`);

    // Step 2: Get inventory items
    console.log('\n2️⃣ FETCHING INVENTORY...');
    const inventoryResponse = await axios.get('http://localhost:5000/api/inventory', {
      headers: { Authorization: `Bearer ${token}` }
    });

    const inventoryItems = inventoryResponse.data;
    console.log(`   📦 Found ${inventoryItems.length} inventory items`);
    
    if (inventoryItems.length === 0) {
      console.log('   ❌ No inventory items to test deletion');
      return;
    }

    const itemToDelete = inventoryItems[0];
    console.log(`   🎯 Will test deletion on: ${itemToDelete.itemName}`);
    console.log(`      - ID: ${itemToDelete._id}`);
    console.log(`      - Quantity: ${itemToDelete.quantity} ${itemToDelete.unit}`);
    console.log(`      - Location: ${itemToDelete.location}`);

    // Step 3: Try warehouse delete endpoint (partial removal)
    console.log('\n3️⃣ TESTING PARTIAL REMOVAL (warehouse endpoint)...');
    
    const partialRemovalData = {
      quantityToRemove: Math.floor(itemToDelete.quantity / 2), // Remove half
      reason: 'Test partial removal'
    };
    
    console.log(`   📤 Attempting to remove ${partialRemovalData.quantityToRemove} ${itemToDelete.unit}...`);
    
    try {
      const deleteResponse = await axios.delete(
        `http://localhost:5000/api/warehouse/inventory/${itemToDelete._id}/remove`,
        {
          data: partialRemovalData,
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      console.log('   ✅ PARTIAL REMOVAL SUCCESSFUL!');
      console.log(`      Response: ${JSON.stringify(deleteResponse.data.message)}`);
      
      // Check updated inventory
      const updatedInventory = await axios.get('http://localhost:5000/api/inventory', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const updatedItem = updatedInventory.data.find(i => i._id === itemToDelete._id);
      if (updatedItem) {
        console.log(`      New quantity: ${updatedItem.quantity} ${updatedItem.unit}`);
      }
      
    } catch (deleteError) {
      console.log('   ❌ PARTIAL REMOVAL FAILED!');
      console.log(`      Status: ${deleteError.response?.status}`);
      console.log(`      Error: ${deleteError.response?.data?.message || deleteError.message}`);
      console.log(`      Full error:`, deleteError.response?.data);
    }

    // Step 4: Try full removal
    console.log('\n4️⃣ TESTING FULL REMOVAL (warehouse endpoint)...');
    
    const fullRemovalData = {
      reason: 'Test full removal'
      // No quantityToRemove means remove all
    };
    
    console.log('   📤 Attempting to remove entire item...');
    
    try {
      const deleteResponse = await axios.delete(
        `http://localhost:5000/api/warehouse/inventory/${itemToDelete._id}/remove`,
        {
          data: fullRemovalData,
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      console.log('   ✅ FULL REMOVAL SUCCESSFUL!');
      console.log(`      Response: ${JSON.stringify(deleteResponse.data.message)}`);
      
    } catch (deleteError) {
      console.log('   ❌ FULL REMOVAL FAILED!');
      console.log(`      Status: ${deleteError.response?.status}`);
      console.log(`      Error: ${deleteError.response?.data?.message || deleteError.message}`);
      console.log(`      Full error:`, deleteError.response?.data);
    }

    // Step 5: Try farmer delete endpoint for comparison
    console.log('\n5️⃣ TESTING FARMER DELETE ENDPOINT (for comparison)...');
    
    // Create a new item first
    const newItem = await axios.post('http://localhost:5000/api/farmer/inventory/add', {
      itemName: 'Test Item for Deletion',
      quantity: 50,
      unit: 'kg',
      location: user.location,
      category: 'grains',
      description: 'Test item'
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log(`   📦 Created test item: ${newItem.data.itemName}`);
    
    try {
      const farmerDeleteResponse = await axios.delete(
        `http://localhost:5000/api/inventory/${newItem.data._id}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      console.log('   ✅ FARMER DELETE SUCCESSFUL!');
      console.log(`      Response: ${JSON.stringify(farmerDeleteResponse.data)}`);
      
    } catch (deleteError) {
      console.log('   ❌ FARMER DELETE FAILED!');
      console.log(`      Status: ${deleteError.response?.status}`);
      console.log(`      Error: ${deleteError.response?.data?.message || deleteError.message}`);
    }

    console.log('\n=== TEST COMPLETE ===');
    console.log('\n📊 SUMMARY:');
    console.log('   - Warehouse partial removal: Check results above');
    console.log('   - Warehouse full removal: Check results above');
    console.log('   - Farmer delete endpoint: Check results above');
    console.log('\n💡 If warehouse endpoints fail but farmer endpoint works,');
    console.log('   the issue is with the warehouse-specific endpoints.');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('   Response data:', error.response.data);
      console.error('   Response status:', error.response.status);
    }
  }
}

// Run the test
testWarehouseDelete();
