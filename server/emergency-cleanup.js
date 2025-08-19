const mongoose = require('mongoose');
require('dotenv').config();

async function emergencyCleanup() {
  try {
    console.log('🚨 EMERGENCY CLEANUP: Freeing MongoDB Atlas space...');
    
    // Connect with minimal options
    await mongoose.connect(process.env.MONGO_URI, {
      maxPoolSize: 1,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 10000,
    });
    console.log('✅ Connected to MongoDB');

    // Get all collection names
    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    console.log('📋 Found collections:', collections.map(c => c.name));

    let totalDeleted = 0;

    // 1. Delete ALL audit logs (these take the most space)
    try {
      const auditResult = await db.collection('auditlogs').deleteMany({});
      console.log(`🗑️ Deleted ${auditResult.deletedCount} audit logs`);
      totalDeleted += auditResult.deletedCount;
    } catch (e) {
      console.log('⚠️ No audit logs collection found');
    }

    // 2. Delete old location history from deliveries
    try {
      const deliveriesCollection = db.collection('deliveries');
      
      // Remove locationHistory arrays from all deliveries
      const locationResult = await deliveriesCollection.updateMany(
        { locationHistory: { $exists: true } },
        { $unset: { locationHistory: "" } }
      );
      console.log(`🗑️ Cleared location history from ${locationResult.modifiedCount} deliveries`);
      
      // Remove trackingHistory arrays if they exist
      const trackingResult = await deliveriesCollection.updateMany(
        { trackingHistory: { $exists: true } },
        { $unset: { trackingHistory: "" } }
      );
      console.log(`🗑️ Cleared tracking history from ${trackingResult.modifiedCount} deliveries`);
      
    } catch (e) {
      console.log('⚠️ Error cleaning delivery history:', e.message);
    }

    // 3. Delete any test/sample documents
    try {
      const testDeliveries = await db.collection('deliveries').deleteMany({
        $or: [
          { 'customerInfo.name': /test|sample|dummy/i },
          { description: /test|sample|dummy/i }
        ]
      });
      console.log(`🗑️ Deleted ${testDeliveries.deletedCount} test deliveries`);
      totalDeleted += testDeliveries.deletedCount;
    } catch (e) {
      console.log('⚠️ Error cleaning test data:', e.message);
    }

    // 4. Clean any notification logs if they exist
    try {
      const notificationResult = await db.collection('notifications').deleteMany({
        createdAt: { $lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
      });
      console.log(`🗑️ Deleted ${notificationResult.deletedCount} old notifications`);
      totalDeleted += notificationResult.deletedCount;
    } catch (e) {
      console.log('⚠️ No notifications collection found');
    }

    // Get final stats
    const stats = await db.stats();
    const currentSize = (stats.dataSize / (1024 * 1024)).toFixed(2);
    
    console.log('\n📊 Cleanup Results:');
    console.log(`├── Total documents deleted: ${totalDeleted}`);
    console.log(`├── Current database size: ${currentSize} MB`);
    console.log(`└── Storage limit: 512 MB`);
    
    if (currentSize < 400) {
      console.log('\n✅ SUCCESS: Database is now under 400MB!');
    } else if (currentSize < 480) {
      console.log('\n⚠️ PARTIAL SUCCESS: Database reduced but still large');
    } else {
      console.log('\n🔴 STILL CRITICAL: Database still near limit');
      console.log('💡 Consider upgrading to a paid MongoDB Atlas plan');
    }

  } catch (error) {
    console.error('❌ Emergency cleanup failed:', error.message);
    
    if (error.code === 8000) {
      console.log('\n🚨 CRITICAL: Database is completely full!');
      console.log('📞 IMMEDIATE ACTION REQUIRED:');
      console.log('1. Upgrade MongoDB Atlas plan to paid tier (temporarily)');
      console.log('2. Or manually delete collections via MongoDB Atlas web interface');
      console.log('3. Or contact MongoDB support for emergency assistance');
    }
  } finally {
    await mongoose.disconnect();
    console.log('\n🔐 Disconnected from MongoDB');
  }
}

// Run emergency cleanup
emergencyCleanup();
