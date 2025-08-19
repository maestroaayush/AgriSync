const mongoose = require('mongoose');
require('dotenv').config();

async function analyzeDatabase() {
  try {
    console.log('🔍 Analyzing Database Growth Patterns...');
    
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // Get database statistics
    const db = mongoose.connection.db;
    const stats = await db.stats();
    
    console.log('\n📊 Current Database Statistics:');
    console.log(`├── Data Size: ${(stats.dataSize / (1024 * 1024)).toFixed(2)} MB`);
    console.log(`├── Storage Size: ${(stats.storageSize / (1024 * 1024)).toFixed(2)} MB`);
    console.log(`├── Index Size: ${(stats.indexSize / (1024 * 1024)).toFixed(2)} MB`);
    console.log(`├── Total Objects: ${stats.objects}`);
    console.log(`├── Collections: ${stats.collections}`);
    console.log(`└── Average Object Size: ${stats.avgObjSize} bytes`);

    // Analyze each collection
    const collections = await db.listCollections().toArray();
    console.log('\n📋 Collection Analysis:');
    
    const collectionData = [];
    
    for (const collection of collections) {
      try {
        const collStats = await db.collection(collection.name).stats();
        const count = await db.collection(collection.name).countDocuments();
        
        const collectionInfo = {
          name: collection.name,
          documents: count,
          avgSize: collStats.avgObjSize || 0,
          totalSize: collStats.size || 0,
          storageSize: collStats.storageSize || 0,
          indexSize: collStats.totalIndexSize || 0
        };
        
        collectionData.push(collectionInfo);
        
      } catch (error) {
        console.log(`⚠️ Could not analyze collection ${collection.name}: ${error.message}`);
      }
    }

    // Sort by total size
    collectionData.sort((a, b) => b.totalSize - a.totalSize);

    collectionData.forEach((col, index) => {
      const sizeInMB = (col.totalSize / (1024 * 1024)).toFixed(3);
      const indicator = index === 0 ? '🔴' : index === 1 ? '🟡' : '🟢';
      console.log(`${indicator} ${col.name}:`);
      console.log(`   ├── Documents: ${col.documents}`);
      console.log(`   ├── Total Size: ${sizeInMB} MB`);
      console.log(`   ├── Avg Doc Size: ${col.avgSize} bytes`);
      console.log(`   └── Index Size: ${(col.indexSize / (1024 * 1024)).toFixed(3)} MB`);
    });

    // Check for problematic patterns
    console.log('\n🚨 Potential Issues:');
    
    const largeCollections = collectionData.filter(col => col.totalSize > 10 * 1024 * 1024); // > 10MB
    if (largeCollections.length > 0) {
      console.log('📈 Large Collections Found:');
      largeCollections.forEach(col => {
        console.log(`   - ${col.name}: ${(col.totalSize / (1024 * 1024)).toFixed(2)} MB`);
      });
    }

    const manyDocuments = collectionData.filter(col => col.documents > 10000);
    if (manyDocuments.length > 0) {
      console.log('📄 Collections with Many Documents:');
      manyDocuments.forEach(col => {
        console.log(`   - ${col.name}: ${col.documents} documents`);
      });
    }

    const bigDocuments = collectionData.filter(col => col.avgSize > 50000); // > 50KB avg
    if (bigDocuments.length > 0) {
      console.log('📦 Collections with Large Documents:');
      bigDocuments.forEach(col => {
        console.log(`   - ${col.name}: ${(col.avgSize / 1024).toFixed(2)} KB average`);
      });
    }

    // Audit logs specific analysis
    const auditCol = collectionData.find(col => col.name === 'auditlogs');
    if (auditCol && auditCol.documents > 0) {
      console.log('\n📝 Audit Log Analysis:');
      
      const AuditLog = require('./models/AuditLog');
      
      // Check recent audit log growth
      const last24Hours = await AuditLog.countDocuments({
        createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
      });
      
      const lastWeek = await AuditLog.countDocuments({
        createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
      });

      console.log(`├── Total audit logs: ${auditCol.documents}`);
      console.log(`├── Last 24 hours: ${last24Hours}`);
      console.log(`├── Last 7 days: ${lastWeek}`);
      console.log(`├── Daily average: ${(lastWeek / 7).toFixed(0)} logs/day`);
      console.log(`└── Growth rate: ${((last24Hours / (lastWeek / 7)) * 100).toFixed(0)}% of weekly average`);

      if (last24Hours > 1000) {
        console.log('⚠️ HIGH AUDIT LOG GROWTH DETECTED');
        console.log('💡 Consider reducing audit log verbosity or retention period');
      }
    }

    // Deliveries analysis
    const deliveryCol = collectionData.find(col => col.name === 'deliveries');
    if (deliveryCol && deliveryCol.documents > 0) {
      console.log('\n🚚 Delivery Data Analysis:');
      
      const Delivery = require('./models/Delivery');
      
      // Check for deliveries with location history
      const withLocationHistory = await Delivery.countDocuments({
        $or: [
          { locationHistory: { $exists: true, $ne: [] } },
          { trackingHistory: { $exists: true, $ne: [] } }
        ]
      });

      console.log(`├── Total deliveries: ${deliveryCol.documents}`);
      console.log(`├── With location data: ${withLocationHistory}`);
      console.log(`└── Average size: ${(deliveryCol.avgSize / 1024).toFixed(2)} KB`);

      if (deliveryCol.avgSize > 20000) { // > 20KB average
        console.log('⚠️ LARGE DELIVERY DOCUMENTS DETECTED');
        console.log('💡 Location/tracking history may be accumulating');
      }
    }

    // Recommendations
    console.log('\n💡 Recommendations:');
    
    const totalUsagePercent = ((stats.dataSize + stats.indexSize) / (512 * 1024 * 1024)) * 100;
    
    if (totalUsagePercent > 80) {
      console.log('🔴 CRITICAL: Database usage > 80%');
      console.log('   - Run emergency cleanup immediately');
      console.log('   - Consider upgrading MongoDB Atlas plan');
    } else if (totalUsagePercent > 60) {
      console.log('🟡 WARNING: Database usage > 60%');
      console.log('   - Schedule more frequent cleanups');
      console.log('   - Review data retention policies');
    } else {
      console.log('🟢 HEALTHY: Database usage < 60%');
      console.log('   - Continue regular monitoring');
      console.log('   - Current cleanup schedule is adequate');
    }

    if (auditCol && auditCol.documents > 5000) {
      console.log('   - Reduce audit log retention from 30 to 14 days');
    }

    if (deliveryCol && deliveryCol.avgSize > 15000) {
      console.log('   - Implement location history cleanup for completed deliveries');
    }

  } catch (error) {
    console.error('❌ Analysis failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔐 Disconnected from MongoDB');
  }
}

analyzeDatabase();
