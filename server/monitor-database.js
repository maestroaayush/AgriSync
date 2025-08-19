const mongoose = require('mongoose');
require('dotenv').config();

async function createMonitoringJob() {
  try {
    console.log('📊 Database Growth Monitor Starting...');
    
    await mongoose.connect(process.env.MONGO_URI);
    
    const db = mongoose.connection.db;
    
    // Function to log database status
    const logStatus = async () => {
      try {
        const stats = await db.stats();
        const auditCount = await db.collection('auditlogs').countDocuments();
        const deliveryCount = await db.collection('deliveries').countDocuments();
        
        const totalSizeMB = (stats.dataSize + stats.indexSize) / (1024 * 1024);
        const usagePercent = (totalSizeMB / 512) * 100;
        
        console.log(`\n📊 [${new Date().toISOString()}] Database Status:`);
        console.log(`├── Total Size: ${totalSizeMB.toFixed(2)} MB (${usagePercent.toFixed(1)}%)`);
        console.log(`├── Documents: ${stats.objects}`);
        console.log(`├── Audit Logs: ${auditCount}`);
        console.log(`└── Deliveries: ${deliveryCount}`);
        
        // Alert if usage is growing too fast
        if (usagePercent > 80) {
          console.log('🚨 CRITICAL: Database usage > 80% - Emergency cleanup needed!');
        } else if (usagePercent > 60) {
          console.log('⚠️ WARNING: Database usage > 60% - Cleanup recommended');
        } else if (usagePercent > 40) {
          console.log('📈 CAUTION: Database usage > 40% - Monitor closely');
        }
        
        // Check audit log growth rate
        if (auditCount > 100) {
          const recent = await db.collection('auditlogs').countDocuments({
            createdAt: { $gte: new Date(Date.now() - 60 * 60 * 1000) } // last hour
          });
          
          if (recent > 50) {
            console.log('🚨 HIGH AUDIT LOG GROWTH: ' + recent + ' logs in last hour');
            console.log('💡 Consider checking for polling or excessive API calls');
          }
        }
        
      } catch (error) {
        console.error('❌ Monitoring error:', error.message);
      }
    };
    
    // Log status immediately
    await logStatus();
    
    // Set up monitoring interval (every 30 minutes)
    const monitoringInterval = setInterval(logStatus, 30 * 60 * 1000);
    
    console.log('✅ Database monitoring started (checking every 30 minutes)');
    console.log('Press Ctrl+C to stop monitoring');
    
    // Graceful shutdown
    process.on('SIGINT', () => {
      console.log('\n🔄 Stopping database monitor...');
      clearInterval(monitoringInterval);
      mongoose.disconnect().then(() => {
        console.log('🔐 Disconnected from MongoDB');
        process.exit(0);
      });
    });
    
  } catch (error) {
    console.error('❌ Monitor setup failed:', error);
    process.exit(1);
  }
}

// If running directly, start monitoring
if (require.main === module) {
  createMonitoringJob();
}

module.exports = { createMonitoringJob };
