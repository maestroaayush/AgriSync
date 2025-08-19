#!/usr/bin/env node

/**
 * Comprehensive Warehouse Dashboard Debug Script
 * 
 * This script will:
 * 1. Test server endpoints for warehouse dashboard
 * 2. Check authentication and permissions
 * 3. Test modal functionality
 * 4. Debug dropdown filtering issues
 * 5. Provide recommendations for fixes
 */

console.log('🔧 Warehouse Dashboard Debug Script');
console.log('=====================================\n');

const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Configuration
const BASE_URL = 'http://localhost:5000';
const CLIENT_PATH = './client/src/pages/dashboards/WarehouseDashboard.jsx';
const MODAL_PATH = './client/src/components/Modal.jsx';
const ADD_MODAL_PATH = './client/src/components/AddInventoryModal.jsx';

// Test credentials (you'll need to update these)
const TEST_CREDENTIALS = {
  email: 'warehouse@example.com',
  password: 'password123'
};

let authToken = null;
let testUser = null;

// Helper functions
function checkFileExists(filePath) {
  return fs.existsSync(path.join(__dirname, filePath));
}

function analyzeCodeFile(filePath, checks) {
  try {
    const content = fs.readFileSync(path.join(__dirname, filePath), 'utf8');
    console.log(`\n📁 Analyzing ${filePath}:`);
    
    checks.forEach(check => {
      const found = content.includes(check.pattern);
      const status = found ? '✅' : '❌';
      console.log(`   ${status} ${check.name}: ${found ? 'Found' : 'Missing'}`);
      
      if (!found && check.suggestion) {
        console.log(`      💡 Suggestion: ${check.suggestion}`);
      }
    });
    
    return content;
  } catch (error) {
    console.log(`   ❌ Could not read ${filePath}: ${error.message}`);
    return null;
  }
}

async function testAuthentication() {
  console.log('\n🔐 Testing Authentication...');
  
  try {
    const response = await axios.post(`${BASE_URL}/auth/login`, TEST_CREDENTIALS);
    authToken = response.data.token;
    testUser = response.data.user;
    
    console.log('   ✅ Authentication successful');
    console.log(`   👤 User: ${testUser.name} (${testUser.role})`);
    
    if (testUser.role !== 'warehouse_manager') {
      console.log('   ⚠️  Warning: Test user is not a warehouse manager');
      console.log('   💡 Create a warehouse manager user for proper testing');
    }
    
    return true;
  } catch (error) {
    console.log('   ❌ Authentication failed');
    console.log('   💡 You may need to register a warehouse manager user first');
    console.log(`   Error: ${error.response?.data?.message || error.message}`);
    return false;
  }
}

async function testServerEndpoints() {
  console.log('\n📡 Testing Server Endpoints...');
  
  const endpoints = [
    { url: '/health', method: 'GET', needsAuth: false, description: 'Health Check' },
    { url: '/api/inventory', method: 'GET', needsAuth: true, description: 'Get Inventory' },
    { url: '/api/inventory', method: 'POST', needsAuth: true, description: 'Add Inventory' },
    { url: '/api/deliveries', method: 'GET', needsAuth: true, description: 'Get Deliveries' }
  ];
  
  for (const endpoint of endpoints) {
    try {
      const config = endpoint.needsAuth && authToken ? 
        { headers: { Authorization: `Bearer ${authToken}` } } : {};
      
      let response;
      if (endpoint.method === 'GET') {
        response = await axios.get(`${BASE_URL}${endpoint.url}`, config);
      } else if (endpoint.method === 'POST') {
        // Test with minimal valid data
        const testData = {
          itemName: 'Test Item',
          quantity: 10,
          unit: 'kg',
          location: 'Test Location'
        };
        response = await axios.post(`${BASE_URL}${endpoint.url}`, testData, config);
      }
      
      console.log(`   ✅ ${endpoint.description}: Status ${response.status}`);
      
      if (endpoint.url === '/api/inventory' && endpoint.method === 'GET') {
        console.log(`      📦 Inventory items: ${response.data.length}`);
        if (response.data.length > 0) {
          const units = [...new Set(response.data.map(item => item.unit))];
          console.log(`      🔄 Available units: ${units.join(', ')}`);
        }
      }
      
    } catch (error) {
      const status = error.response?.status || 'Network Error';
      console.log(`   ❌ ${endpoint.description}: ${status}`);
      if (error.response?.data?.message) {
        console.log(`      Error: ${error.response.data.message}`);
      }
    }
  }
}

async function analyzeComponentFiles() {
  console.log('\n📋 Analyzing Component Files...');
  
  // Check if files exist
  const files = [CLIENT_PATH, MODAL_PATH, ADD_MODAL_PATH];
  files.forEach(file => {
    const exists = checkFileExists(file);
    console.log(`   ${exists ? '✅' : '❌'} ${file}: ${exists ? 'Found' : 'Missing'}`);
  });
  
  // Analyze WarehouseDashboard component
  const warehouseChecks = [
    { name: 'showAddModal state', pattern: 'showAddModal', suggestion: 'Add useState for modal state' },
    { name: 'setShowAddModal function', pattern: 'setShowAddModal', suggestion: 'Add state setter function' },
    { name: 'Modal component import', pattern: 'import Modal', suggestion: 'Import Modal component' },
    { name: 'AddInventoryModal import', pattern: 'import AddInventoryModal', suggestion: 'Import AddInventoryModal component' },
    { name: 'inventoryFilter state', pattern: 'inventoryFilter', suggestion: 'Add filter state management' },
    { name: 'filteredInventory logic', pattern: 'filteredInventory', suggestion: 'Add inventory filtering logic' },
    { name: 'uniqueUnits array', pattern: 'uniqueUnits', suggestion: 'Generate unique units from inventory data' },
    { name: 'Add Item button click', pattern: 'onClick={() => setShowAddModal(true)', suggestion: 'Add click handler for Add Item button' }
  ];
  
  analyzeCodeFile(CLIENT_PATH, warehouseChecks);
  
  // Analyze Modal component
  const modalChecks = [
    { name: 'isOpen prop', pattern: 'isOpen', suggestion: 'Add isOpen prop handling' },
    { name: 'onClose prop', pattern: 'onClose', suggestion: 'Add onClose prop handling' },
    { name: 'className prop', pattern: 'className', suggestion: 'Add className prop for responsive sizing' },
    { name: 'Dialog.Root', pattern: 'Dialog.Root', suggestion: 'Use proper dialog implementation' }
  ];
  
  analyzeCodeFile(MODAL_PATH, modalChecks);
  
  // Analyze AddInventoryModal component  
  const addModalChecks = [
    { name: 'Form state management', pattern: 'useState', suggestion: 'Add form state with useState' },
    { name: 'handleSubmit function', pattern: 'handleSubmit', suggestion: 'Add form submission handler' },
    { name: 'axios import', pattern: 'import axios', suggestion: 'Import axios for API calls' },
    { name: 'API call with auth', pattern: 'Authorization: `Bearer', suggestion: 'Add authentication headers' },
    { name: 'Loading state', pattern: 'loading', suggestion: 'Add loading state for better UX' },
    { name: 'Error handling', pattern: 'error', suggestion: 'Add error state and handling' }
  ];
  
  analyzeCodeFile(ADD_MODAL_PATH, addModalChecks);
}

function checkForCommonIssues() {
  console.log('\n🚨 Checking for Common Issues...');
  
  const warehouseContent = analyzeCodeFile(CLIENT_PATH, []);
  if (warehouseContent) {
    // Check for dropdown filtering issues
    if (warehouseContent.includes('uniqueUnits')) {
      console.log('   ✅ Dynamic units dropdown implementation found');
    } else {
      console.log('   ❌ Missing dynamic units dropdown');
      console.log('      💡 Add: const uniqueUnits = [...new Set(inventory.map(item => item.unit))];');
    }
    
    // Check for modal implementation
    if (warehouseContent.includes('Modal isOpen={showAddModal}')) {
      console.log('   ✅ Modal implementation found');
    } else {
      console.log('   ❌ Missing proper Modal implementation');
      console.log('      💡 Add Modal with proper props in component return');
    }
    
    // Check for filtering logic
    if (warehouseContent.includes('filteredInventory = ')) {
      console.log('   ✅ Inventory filtering logic found');
    } else {
      console.log('   ❌ Missing inventory filtering logic');
      console.log('      💡 Add proper filtering based on inventoryFilter state');
    }
  }
}

function provideFixes() {
  console.log('\n🔧 Recommended Fixes:');
  console.log('========================');
  
  console.log('\n1. 🚪 Modal Not Opening Issues:');
  console.log('   • Check if showAddModal state is properly initialized');
  console.log('   • Verify setShowAddModal(true) is called on button click');
  console.log('   • Check for CSS z-index conflicts');
  console.log('   • Ensure Modal component has proper isOpen prop handling');
  
  console.log('\n2. 📋 Dropdown Filtering Issues:');
  console.log('   • Replace hardcoded dropdown options with dynamic ones');
  console.log('   • Use uniqueUnits array: [...new Set(inventory.map(item => item.unit))]');
  console.log('   • Ensure filtering logic matches dropdown values exactly');
  console.log('   • Add console.log to debug filter state changes');
  
  console.log('\n3. ➕ Add Item Not Working:');
  console.log('   • Check network requests in browser console');
  console.log('   • Verify authentication token is present and valid');
  console.log('   • Ensure API endpoint accepts the payload format');
  console.log('   • Add proper error handling and user feedback');
  
  console.log('\n4. 🔍 Browser Debugging Steps:');
  console.log('   • Open Developer Tools (F12)');
  console.log('   • Check Console tab for JavaScript errors');
  console.log('   • Check Network tab for failed API requests');
  console.log('   • Use React DevTools to inspect component state');
  
  console.log('\n5. 🧪 Testing Commands:');
  console.log('   • Test server: curl http://localhost:5000/health');
  console.log('   • Check authentication: look for token in localStorage');
  console.log('   • Test modal: document.querySelector("[data-testid=add-modal]")');
}

// Main execution
async function main() {
  console.log('Starting comprehensive warehouse dashboard debugging...\n');
  
  // Step 1: Check component files
  analyzeComponentFiles();
  
  // Step 2: Check for common issues
  checkForCommonIssues();
  
  // Step 3: Test authentication
  const authSuccess = await testAuthentication();
  
  // Step 4: Test server endpoints (if authenticated)
  if (authSuccess) {
    await testServerEndpoints();
  }
  
  // Step 5: Provide recommendations
  provideFixes();
  
  console.log('\n✅ Debug analysis complete!');
  console.log('Check the recommendations above to fix the warehouse dashboard issues.');
}

// Error handling
process.on('unhandledRejection', (error) => {
  console.error('Unhandled error:', error.message);
});

// Run the debug script
main().catch(error => {
  console.error('Debug script failed:', error.message);
  process.exit(1);
});
