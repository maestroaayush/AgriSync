const mongoose = require('mongoose');
const AuditLog = require('./models/AuditLog');
const Delivery = require('./models/Delivery');
require('dotenv').config();

async function cleanupDatabase() {
  try {
    console.log('🧹 Starting MongoDB Atlas Storage Cleanup...');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // Get database statistics
    const stats = await mongoose.connection.db.stats();
    console.log(`📊 Current database size: ${(stats.dataSize / (1024 * 1024)).toFixed(2)} MB`);
    console.log(`📊 Storage size: ${(stats.storageSize / (1024 * 1024)).toFixed(2)} MB`);
    console.log(`📊 Index size: ${(stats.indexSize / (1024 * 1024)).toFixed(2)} MB`);

    let totalCleaned = 0;
    let spaceFreed = 0;

    // 1. Clean old audit logs (keep only last 30 days)
    console.log('\n🗂️ Cleaning old audit logs...');
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    try {
      const auditResult = await AuditLog.deleteMany({
        createdAt: { $lt: thirtyDaysAgo }
      });
      console.log(`✅ Deleted ${auditResult.deletedCount} old audit logs (older than 30 days)`);
      totalCleaned += auditResult.deletedCount;
    } catch (auditError) {
      console.log('⚠️ Audit log cleanup failed:', auditError.message);
    }

    // 2. Clean up old location tracking data in deliveries
    console.log('\n📍 Cleaning old location tracking data...');
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    
    try {
      // Find deliveries with old location data
      const deliveriesWithOldLocations = await Delivery.find({
        'trackingHistory.timestamp': { $lt: sevenDaysAgo },
        status: { $in: ['delivered', 'cancelled'] }
      });

      let locationEntriesRemoved = 0;
      
      for (const delivery of deliveriesWithOldLocations) {
        const originalLocationCount = delivery.trackingHistory ? delivery.trackingHistory.length : 0;
        
        // Keep only the last 5 location entries for completed deliveries
        if (delivery.trackingHistory && delivery.trackingHistory.length > 5) {
          delivery.trackingHistory = delivery.trackingHistory
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
            .slice(0, 5);
          
          await delivery.save();
          locationEntriesRemoved += originalLocationCount - delivery.trackingHistory.length;
        }
      }
      
      console.log(`✅ Cleaned location tracking data from ${deliveriesWithOldLocations.length} completed deliveries`);
      console.log(`✅ Removed ${locationEntriesRemoved} old location entries`);
      totalCleaned += locationEntriesRemoved;
    } catch (locationError) {
      console.log('⚠️ Location cleanup failed:', locationError.message);
    }

    // 3. Clean up test/dummy data (if any)
    console.log('\n🧪 Looking for test data to clean...');
    
    try {
      // Remove test deliveries (those with test patterns in names)
      const testDeliveryResult = await Delivery.deleteMany({
        $or: [
          { 'customerInfo.name': /test|dummy|sample/i },
          { description: /test|dummy|sample/i }
        ]
      });
      console.log(`✅ Deleted ${testDeliveryResult.deletedCount} test deliveries`);
      totalCleaned += testDeliveryResult.deletedCount;
    } catch (testError) {
      console.log('⚠️ Test data cleanup failed:', testError.message);
    }

    // 4. Compact collections to reclaim space
    console.log('\n🗜️ Compacting database collections...');
    try {
      const collections = await mongoose.connection.db.listCollections().toArray();
      console.log(`Found ${collections.length} collections to compact`);
      
      for (const collection of collections) {
        try {
          await mongoose.connection.db.collection(collection.name).reIndex();
          console.log(`✅ Reindexed collection: ${collection.name}`);
        } catch (compactError) {
          console.log(`⚠️ Could not reindex ${collection.name}:`, compactError.message);
        }
      }
    } catch (compactError) {
      console.log('⚠️ Collection compacting failed:', compactError.message);
    }

    // Get final statistics
    const finalStats = await mongoose.connection.db.stats();
    const spaceSaved = (stats.dataSize - finalStats.dataSize) / (1024 * 1024);
    
    console.log('\n📊 Cleanup Summary:');
    console.log(`├── Items cleaned: ${totalCleaned}`);
    console.log(`├── Space before: ${(stats.dataSize / (1024 * 1024)).toFixed(2)} MB`);
    console.log(`├── Space after: ${(finalStats.dataSize / (1024 * 1024)).toFixed(2)} MB`);
    console.log(`└── Space freed: ${spaceSaved > 0 ? '+' : ''}${spaceSaved.toFixed(2)} MB`);
    
    if (finalStats.dataSize / (1024 * 1024) < 400) {
      console.log('\n✅ Database is now under 400MB - you have plenty of space!');
    } else if (finalStats.dataSize / (1024 * 1024) < 450) {
      console.log('\n⚠️ Database is under 450MB - consider regular cleanup');
    } else {
      console.log('\n🔴 Database is still close to limit - may need additional cleanup');
    }

  } catch (error) {
    console.error('❌ Cleanup failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔐 Disconnected from MongoDB');
  }
}

// Run cleanup if this file is executed directly
if (require.main === module) {
  cleanupDatabase();
}

module.exports = { cleanupDatabase };
