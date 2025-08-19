const axios = require('axios');

// Test credentials from our setup
const testCredentials = {
  email: 'test.farmer@example.com',
  password: 'password123'
};

const baseURL = 'http://localhost:5000';
let authToken = '';

async function testLogin() {
  try {
    console.log('🔐 Testing login...');
    const response = await axios.post(`${baseURL}/api/auth/login`, testCredentials);
    
    if (response.data.token) {
      authToken = response.data.token;
      console.log('✅ Login successful');
      console.log(`User: ${response.data.user.name} (${response.data.user.role})`);
      return true;
    } else {
      console.log('❌ Login failed - no token received');
      return false;
    }
  } catch (error) {
    console.error('❌ Login failed:', error.response?.data || error.message);
    return false;
  }
}

async function testGetInventory() {
  try {
    console.log('\n📦 Testing GET inventory...');
    const response = await axios.get(`${baseURL}/api/inventory`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    console.log(`✅ GET inventory successful - ${response.data.length} items found`);
    response.data.forEach((item, index) => {
      console.log(`  ${index + 1}. ${item.itemName}: ${item.quantity} ${item.unit} at ${item.location}`);
    });
    return true;
  } catch (error) {
    console.error('❌ GET inventory failed:', error.response?.data || error.message);
    return false;
  }
}

async function testAddInventory() {
  try {
    console.log('\n📦 Testing POST inventory (add item)...');
    const newItem = {
      itemName: 'Test Rice',
      category: 'grains',
      quantity: '50',
      unit: 'kg',
      location: 'Mumbai Central Warehouse',
      price: '30.00',
      qualityGrade: 'Premium',
      description: 'Premium basmati rice for testing'
    };

    const response = await axios.post(`${baseURL}/api/inventory`, newItem, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    console.log('✅ POST inventory successful');
    console.log(`Added: ${response.data.itemName} (${response.data.quantity} ${response.data.unit})`);
    return true;
  } catch (error) {
    console.error('❌ POST inventory failed:', error.response?.data || error.message);
    if (error.response?.status === 400) {
      console.log('This might be a warehouse capacity or validation issue');
    }
    return false;
  }
}

async function testRequestDelivery() {
  try {
    console.log('\n🚚 Testing POST delivery request...');
    const deliveryRequest = {
      destination: 'Delhi Storage Facility',
      itemName: 'Test Rice',
      quantity: '25',
      urgency: 'normal',
      notes: 'Test delivery request from HTTP script'
    };

    const response = await axios.post(`${baseURL}/api/deliveries`, deliveryRequest, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    console.log('✅ POST delivery request successful');
    console.log(`Requested delivery: ${response.data.delivery.goodsDescription} to ${response.data.delivery.dropoffLocation}`);
    return true;
  } catch (error) {
    console.error('❌ POST delivery request failed:', error.response?.data || error.message);
    return false;
  }
}

async function testGetDeliveries() {
  try {
    console.log('\n🚚 Testing GET deliveries...');
    const response = await axios.get(`${baseURL}/api/deliveries`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    console.log(`✅ GET deliveries successful - ${response.data.length} deliveries found`);
    response.data.forEach((delivery, index) => {
      console.log(`  ${index + 1}. ${delivery.goodsDescription}: ${delivery.status} (${delivery.pickupLocation} → ${delivery.dropoffLocation})`);
    });
    return true;
  } catch (error) {
    console.error('❌ GET deliveries failed:', error.response?.data || error.message);
    return false;
  }
}

async function runTests() {
  console.log('🧪 Starting API Tests for Farmer Dashboard\n');
  
  const loginSuccess = await testLogin();
  if (!loginSuccess) {
    console.log('\n❌ Cannot continue tests without authentication');
    return;
  }

  await testGetInventory();
  await testAddInventory();
  await testRequestDelivery();
  await testGetDeliveries();
  
  console.log('\n✅ All tests completed!');
  console.log('\n📝 If tests pass but browser doesn\'t work, check:');
  console.log('1. Browser console for JavaScript errors');
  console.log('2. Network tab for failed API calls');
  console.log('3. CORS issues');
  console.log('4. Frontend React app at http://localhost:5173');
}

runTests().catch(console.error);
