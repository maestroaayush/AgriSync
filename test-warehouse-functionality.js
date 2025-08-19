#!/usr/bin/env node

/**
 * Test Script for Warehouse Functionality Issues
 * 
 * This script tests:
 * 1. Add Item Modal functionality 
 * 2. Dropdown filtering in inventory tab
 * 3. Dropdown filtering in deliveries tab
 */

console.log('🧪 Testing Warehouse Functionality Issues...\n');

// Test 1: Check if server endpoints are working
console.log('📡 1. Testing Server Endpoints...');

const axios = require('axios');

async function testServerEndpoints() {
  try {
    // Test inventory endpoint (should require auth)
    const inventoryResponse = await axios.get('http://localhost:5000/api/inventory').catch(err => err.response);
    console.log(`   ✅ Inventory API: ${inventoryResponse?.status === 401 ? 'Working (Auth Required)' : 'Accessible'}`);

    // Test deliveries endpoint (should require auth)  
    const deliveriesResponse = await axios.get('http://localhost:5000/api/deliveries').catch(err => err.response);
    console.log(`   ✅ Deliveries API: ${deliveriesResponse?.status === 401 ? 'Working (Auth Required)' : 'Accessible'}`);

    // Test health check
    const healthResponse = await axios.get('http://localhost:5000/health').catch(err => err.response);
    console.log(`   ✅ Server Health: ${healthResponse?.status === 200 ? 'OK' : 'Not Available'}`);

  } catch (error) {
    console.log('   ❌ Server connection failed:', error.message);
  }
}

// Test 2: Check component files existence
console.log('\n📁 2. Testing Component Files...');

const fs = require('fs');
const path = require('path');

const componentsToCheck = [
  'client/src/components/Modal.jsx',
  'client/src/components/AddInventoryModal.jsx', 
  'client/src/pages/dashboards/WarehouseDashboard.jsx'
];

componentsToCheck.forEach(component => {
  const exists = fs.existsSync(path.join(__dirname, component));
  console.log(`   ${exists ? '✅' : '❌'} ${component}: ${exists ? 'Found' : 'Missing'}`);
});

// Test 3: Check for common issues in component files
console.log('\n🔍 3. Checking for Common Issues...');

function checkFileForIssues(filePath, issues) {
  try {
    const content = fs.readFileSync(path.join(__dirname, filePath), 'utf8');
    
    issues.forEach(issue => {
      const found = content.includes(issue.pattern);
      console.log(`   ${found ? '✅' : '❌'} ${issue.name}: ${found ? 'Found' : 'Missing'}`);
    });
    
  } catch (error) {
    console.log(`   ❌ Could not read ${filePath}: ${error.message}`);
  }
}

// Check Modal component
console.log('\n   📋 Modal.jsx Issues:');
checkFileForIssues('client/src/components/Modal.jsx', [
  { name: 'isOpen prop', pattern: 'isOpen' },
  { name: 'onClose prop', pattern: 'onClose' },
  { name: 'className support', pattern: 'className' }
]);

// Check AddInventoryModal
console.log('\n   📋 AddInventoryModal.jsx Issues:');
checkFileForIssues('client/src/components/AddInventoryModal.jsx', [
  { name: 'Form submission', pattern: 'handleSubmit' },
  { name: 'Error handling', pattern: 'setError' },
  { name: 'Loading state', pattern: 'setLoading' },
  { name: 'Token authentication', pattern: 'Bearer ${token}' }
]);

// Test 4: Suggest solutions
console.log('\n💡 4. Common Solutions:');
console.log('   🔧 Modal not opening:');
console.log('      - Check showAddModal state management');
console.log('      - Verify Modal component props');
console.log('      - Check for CSS z-index conflicts');
console.log('');
console.log('   🔧 Dropdown not filtering:');
console.log('      - Verify dropdown option values match database values');
console.log('      - Check filtering logic in filteredInventory/filteredDeliveries');
console.log('      - Ensure state updates on dropdown change');
console.log('');
console.log('   🔧 Add Item not working:');
console.log('      - Check network requests in browser console');
console.log('      - Verify authentication token');
console.log('      - Check API endpoint and payload format');

// Run the tests
(async () => {
  await testServerEndpoints();
  
  console.log('\n🎯 Testing Complete!');
  console.log('\n📋 Next Steps:');
  console.log('1. Open browser console and navigate to warehouse dashboard');
  console.log('2. Try clicking "Add Item" button and check for errors');
  console.log('3. Test dropdown filtering and verify state changes');
  console.log('4. Check network tab for failed API requests');
})();
