#!/usr/bin/env node

const axios = require('axios');

const BASE_URL = 'http://localhost:5000';

// Test endpoints without authentication first
const testEndpoints = async () => {
  console.log('🔍 Testing Farmer Dashboard API Endpoints');
  console.log('=' .repeat(50));

  const endpointsToTest = [
    '/api/inventory',
    '/api/deliveries',
    '/api/warehouses', 
    '/api/orders',
    '/api/inventory/logs/recent',
    '/api/inventory/analytics',
    '/api/inventory/analytics/trends',
    '/api/deliveries/analytics',
    '/api/inventory/analytics/performance',
    '/api/notifications',
    '/api/transporters/locations'
  ];

  for (const endpoint of endpointsToTest) {
    try {
      console.log(`\n📡 Testing: ${endpoint}`);
      const response = await axios.get(`${BASE_URL}${endpoint}`, {
        timeout: 5000,
        validateStatus: () => true // Don't throw on 4xx/5xx
      });
      
      console.log(`   Status: ${response.status}`);
      console.log(`   Message: ${response.data.message || 'No message'}`);
      
      if (response.status === 200) {
        console.log(`   ✅ Endpoint accessible`);
        if (Array.isArray(response.data)) {
          console.log(`   📊 Data: Array with ${response.data.length} items`);
        } else if (typeof response.data === 'object') {
          console.log(`   📊 Data: Object with keys: ${Object.keys(response.data).join(', ')}`);
        }
      } else if (response.status === 401) {
        console.log(`   🔐 Authentication required (expected)`);
      } else if (response.status === 403) {
        console.log(`   🚫 Access forbidden`);
      } else if (response.status === 404) {
        console.log(`   ❌ Endpoint not found`);
      } else {
        console.log(`   ⚠️  Other error: ${response.status}`);
      }
    } catch (error) {
      if (error.code === 'ECONNREFUSED') {
        console.log(`   💥 Server not running`);
        return;
      } else {
        console.log(`   💥 Error: ${error.message}`);
      }
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log('🔍 Server Status Summary:');
  
  try {
    const healthResponse = await axios.get(`${BASE_URL}/`, {
      timeout: 3000
    });
    console.log(`✅ Server is running: ${healthResponse.data}`);
  } catch (error) {
    console.log(`❌ Server appears to be down: ${error.message}`);
  }
};

// Run the test
testEndpoints().catch(console.error);
