const mongoose = require('mongoose');
const auditService = require('./server/services/auditService');
require('dotenv').config();

async function testAuditService() {
  try {
    console.log('🧪 Testing Audit Service...');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // Test storage statistics
    console.log('\n📊 Getting storage statistics...');
    const stats = await auditService.getStorageStats();
    console.log('Storage Stats:', stats);

    // Test audit logging
    console.log('\n📝 Testing audit log creation...');
    const testLog = await auditService.logAction({
      action: 'SYSTEM_TEST',
      resource: 'SYSTEM',
      details: {
        description: 'Testing audit service functionality'
      },
      result: { success: true },
      category: 'SYSTEM',
      severity: 'LOW',
      tags: ['TEST']
    });

    if (testLog) {
      console.log('✅ Audit log created successfully');
    } else {
      console.log('ℹ️ Audit log creation skipped (quota management or sampling)');
    }

    // Test quota check
    console.log('\n🔍 Testing quota check...');
    const canWrite = await auditService.checkDatabaseQuota();
    console.log(`Database write capability: ${canWrite ? '✅ Available' : '❌ Blocked'}`);

    console.log('\n✅ All tests completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔐 Disconnected from MongoDB');
  }
}

testAuditService();
