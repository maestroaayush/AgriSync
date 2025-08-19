const mongoose = require('mongoose');
require('dotenv').config();

async function findDatabaseGrowthCauses() {
  try {
    console.log('🔍 Investigating Database Growth Causes...');
    
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    const db = mongoose.connection.db;
    
    // Get collection document counts
    const collections = await db.listCollections().toArray();
    console.log('\n📊 Collection Document Counts:');
    
    const collectionCounts = [];
    
    for (const collection of collections) {
      try {
        const count = await db.collection(collection.name).countDocuments();
        collectionCounts.push({ name: collection.name, count });
        console.log(`├── ${collection.name}: ${count} documents`);
      } catch (error) {
        console.log(`├── ${collection.name}: Error counting - ${error.message}`);
      }
    }

    // Check specific problematic collections
    console.log('\n🔍 Detailed Analysis:');

    // 1. Audit Logs Analysis
    const auditCount = await db.collection('auditlogs').countDocuments();
    if (auditCount > 0) {
      console.log(`\n📝 Audit Logs (${auditCount} documents):`);
      
      // Get recent audit log samples
      const recentAudits = await db.collection('auditlogs')
        .find({})
        .sort({ createdAt: -1 })
        .limit(5)
        .toArray();

      console.log('Recent audit log entries:');
      recentAudits.forEach((audit, index) => {
        const size = JSON.stringify(audit).length;
        console.log(`   ${index + 1}. Action: ${audit.action}, Size: ${size} bytes, Date: ${audit.createdAt}`);
      });

      // Check for audit log growth in last 24 hours
      const last24h = await db.collection('auditlogs').countDocuments({
        createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
      });

      const lastWeek = await db.collection('auditlogs').countDocuments({
        createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
      });

      console.log(`   - Last 24 hours: ${last24h} new logs`);
      console.log(`   - Last 7 days: ${lastWeek} new logs`);
      console.log(`   - Daily rate: ${(lastWeek / 7).toFixed(0)} logs/day`);

      if (last24h > 500) {
        console.log('   🚨 HIGH AUDIT LOG CREATION RATE');
        console.log('   💡 Audit middleware may be too verbose');
      }
    }

    // 2. Deliveries Analysis
    const deliveryCount = await db.collection('deliveries').countDocuments();
    if (deliveryCount > 0) {
      console.log(`\n🚚 Deliveries (${deliveryCount} documents):`);
      
      // Sample delivery documents to check size
      const sampleDeliveries = await db.collection('deliveries')
        .find({})
        .limit(3)
        .toArray();

      let totalSize = 0;
      sampleDeliveries.forEach((delivery, index) => {
        const size = JSON.stringify(delivery).length;
        totalSize += size;
        const hasLocationHistory = delivery.locationHistory && delivery.locationHistory.length > 0;
        const hasTrackingHistory = delivery.trackingHistory && delivery.trackingHistory.length > 0;
        
        console.log(`   ${index + 1}. Size: ${(size/1024).toFixed(2)} KB, LocationHistory: ${hasLocationHistory ? delivery.locationHistory.length : 0}, TrackingHistory: ${hasTrackingHistory ? delivery.trackingHistory.length : 0}`);
      });

      if (sampleDeliveries.length > 0) {
        const avgSize = totalSize / sampleDeliveries.length;
        console.log(`   - Average document size: ${(avgSize/1024).toFixed(2)} KB`);

        if (avgSize > 20000) { // > 20KB
          console.log('   🚨 LARGE DELIVERY DOCUMENTS');
          console.log('   💡 Location/tracking history accumulating');
        }
      }
    }

    // 3. Check for other large collections
    console.log('\n📈 Growth Analysis:');
    
    const problemCollections = collectionCounts.filter(col => col.count > 1000);
    if (problemCollections.length > 0) {
      console.log('Collections with many documents:');
      problemCollections.forEach(col => {
        console.log(`   - ${col.name}: ${col.count} documents`);
      });
    }

    // 4. Estimate storage usage by collection
    console.log('\n💾 Estimated Storage Usage:');
    
    for (const col of collectionCounts) {
      if (col.count > 0) {
        // Get a sample document to estimate size
        try {
          const sample = await db.collection(col.name).findOne({});
          if (sample) {
            const sampleSize = JSON.stringify(sample).length;
            const estimatedTotal = (sampleSize * col.count) / (1024 * 1024);
            console.log(`   - ${col.name}: ~${estimatedTotal.toFixed(3)} MB (${col.count} × ${sampleSize} bytes)`);
            
            if (estimatedTotal > 50) {
              console.log(`     🚨 This collection is using significant space!`);
            }
          }
        } catch (error) {
          console.log(`   - ${col.name}: Could not estimate size`);
        }
      }
    }

    // 5. Check for specific growth patterns
    console.log('\n🔍 Growth Pattern Detection:');

    // Check if audit logs are growing rapidly
    if (auditCount > 0) {
      const oldestAudit = await db.collection('auditlogs').findOne({}, { sort: { createdAt: 1 } });
      const newestAudit = await db.collection('auditlogs').findOne({}, { sort: { createdAt: -1 } });
      
      if (oldestAudit && newestAudit) {
        const timespan = (new Date(newestAudit.createdAt) - new Date(oldestAudit.createdAt)) / (1000 * 60 * 60 * 24); // days
        const logsPerDay = auditCount / timespan;
        
        console.log(`Audit log creation rate: ${logsPerDay.toFixed(1)} logs/day over ${timespan.toFixed(1)} days`);
        
        if (logsPerDay > 100) {
          console.log('🚨 RAPID AUDIT LOG GROWTH DETECTED');
          console.log('💡 Causes could be:');
          console.log('   - Too many API requests being logged');
          console.log('   - Development/testing generating excessive logs');
          console.log('   - Audit middleware capturing too much detail');
          console.log('   - Background processes creating logs');
        }
      }
    }

    // Recommendations based on findings
    console.log('\n💡 Database Growth Prevention Recommendations:');
    
    if (auditCount > 1000) {
      console.log('🔧 Audit Log Management:');
      console.log('   - Reduce retention period from 30 to 7 days');
      console.log('   - Implement log sampling for non-critical actions');
      console.log('   - Skip logging for health checks and static files');
      console.log('   - Run cleanup more frequently (every 2 hours)');
    }

    if (deliveryCount > 100) {
      console.log('🔧 Delivery Data Management:');
      console.log('   - Limit location history to last 10 entries');
      console.log('   - Clear tracking data for completed deliveries after 24 hours');
      console.log('   - Archive old delivery data');
    }

    console.log('🔧 General Optimizations:');
    console.log('   - Enable the audit service automatic cleanup');
    console.log('   - Monitor database growth daily');
    console.log('   - Set up alerts at 300MB usage');
    console.log('   - Consider data archiving strategy');

  } catch (error) {
    console.error('❌ Analysis failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔐 Disconnected from MongoDB');
  }
}

findDatabaseGrowthCauses();
