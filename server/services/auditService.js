const AuditLog = require('../models/AuditLog');

class AuditService {
  constructor() {
    this.isQuotaExceeded = false;
    this.lastQuotaCheck = null;
    this.quotaCheckInterval = 5 * 60 * 1000; // 5 minutes
    this.maxRetentionDays = 7; // Reduced from 30 to 7 days for faster cleanup
    this.cleanupBatchSize = 1000; // Delete in batches
  }

  /**
   * Check if we can write to the database
   */
  async checkDatabaseQuota() {
    const now = Date.now();
    
    // Only check quota every 5 minutes to avoid excessive database calls
    if (this.lastQuotaCheck && (now - this.lastQuotaCheck) < this.quotaCheckInterval) {
      return !this.isQuotaExceeded;
    }

    try {
      // Try a simple write operation to test quota
      const testDoc = new AuditLog({
        action: 'SYSTEM_QUOTA_CHECK',
        resource: 'SYSTEM',
        category: 'SYSTEM',
        severity: 'LOW',
        details: { description: 'Database quota check' },
        result: { success: true }
      });
      
      await testDoc.save();
      await testDoc.deleteOne(); // Clean up immediately
      
      this.isQuotaExceeded = false;
      this.lastQuotaCheck = now;
      return true;
    } catch (error) {
      if (error.code === 8000 || error.message?.includes('space quota')) {
        this.isQuotaExceeded = true;
        console.warn('⚠️ Database quota exceeded - audit logging suspended');
        console.warn('💡 Attempting automatic cleanup...');
        
        // Attempt automatic cleanup
        await this.performEmergencyCleanup();
        
        this.lastQuotaCheck = now;
        return false;
      }
      
      // Other errors don't necessarily mean quota issues
      console.error('Database quota check failed:', error.message);
      return true; // Assume we can write
    }
  }

  /**
   * Automatically clean up old audit logs when quota is exceeded
   */
  async performEmergencyCleanup() {
    try {
      console.log('🧹 Starting emergency audit log cleanup...');
      
      const cutoffDate = new Date(Date.now() - this.maxRetentionDays * 24 * 60 * 60 * 1000);
      
      // Count documents to be deleted
      const countToDelete = await AuditLog.countDocuments({
        createdAt: { $lt: cutoffDate }
      });
      
      if (countToDelete === 0) {
        console.log('ℹ️ No old audit logs to clean up');
        return;
      }
      
      // Delete in batches to avoid memory issues
      let totalDeleted = 0;
      let batchCount = 0;
      
      while (totalDeleted < countToDelete) {
        const batchResult = await AuditLog.deleteMany(
          { createdAt: { $lt: cutoffDate } },
          { limit: this.cleanupBatchSize }
        );
        
        totalDeleted += batchResult.deletedCount;
        batchCount++;
        
        console.log(`📦 Batch ${batchCount}: Deleted ${batchResult.deletedCount} audit logs`);
        
        // Break if no more documents to delete
        if (batchResult.deletedCount === 0) break;
        
        // Small delay between batches
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      console.log(`✅ Emergency cleanup completed: ${totalDeleted} audit logs deleted`);
      
      // Try to reset quota status after cleanup
      this.isQuotaExceeded = false;
      this.lastQuotaCheck = null;
      
    } catch (cleanupError) {
      console.error('❌ Emergency cleanup failed:', cleanupError.message);
    }
  }

  /**
   * Intelligent audit log creation with quota management
   */
  async logAction(logData) {
    try {
      // Check if we can write to database
      const canWrite = await this.checkDatabaseQuota();
      
      if (!canWrite) {
        // Quota exceeded - log to console instead
        console.log('🔄 Audit log (quota exceeded):', {
          action: logData.action,
          resource: logData.resource,
          user: logData.user?.name || logData.user?.email || 'System',
          success: logData.result?.success,
          timestamp: new Date().toISOString()
        });
        return null;
      }

      // Prioritize important actions - always try to log these
      const criticalActions = [
        'LOGIN', 'LOGIN_FAILED', 'USER_CREATED', 'USER_DELETED', 
        'PASSWORD_RESET', 'ROLE_CHANGED', 'SECURITY_ALERT'
      ];
      
      const isImportant = criticalActions.includes(logData.action) || 
                          logData.severity === 'CRITICAL' || 
                          logData.severity === 'HIGH';

      // Aggressive filtering for routine operations
      const routineActions = [
        'API_ACCESS', 'DATA_CREATED', 'DATA_UPDATED', 'DATA_DELETED'
      ];
      
      if (routineActions.includes(logData.action)) {
        // Skip 90% of routine API access logs to prevent storage explosion
        if (Math.random() > 0.1) {
          return null;
        }
      }
      
      // For other non-critical actions, sample the logs
      if (!isImportant && Math.random() > 0.5) {
        // Skip 50% of non-critical logs to reduce storage pressure
        return null;
      }

      // Create the audit log
      const auditLog = await AuditLog.logAction(logData);
      return auditLog;
      
    } catch (error) {
      if (error.code === 8000 || error.message?.includes('space quota')) {
        console.warn('⚠️ Audit log failed - quota exceeded');
        this.isQuotaExceeded = true;
        
        // Try emergency cleanup
        setImmediate(() => this.performEmergencyCleanup());
        
        return null;
      }
      
      // Log other errors but don't break the application
      console.error('❌ Audit logging failed:', error.message);
      return null;
    }
  }

  /**
   * Schedule regular cleanup of old audit logs
   */
  startScheduledCleanup() {
    // Run cleanup every 2 hours instead of 6 hours
    const cleanupInterval = 2 * 60 * 60 * 1000;
    
    setInterval(async () => {
      try {
        console.log('🕒 Running scheduled audit log cleanup...');
        await this.performScheduledCleanup();
      } catch (error) {
        console.error('❌ Scheduled cleanup failed:', error.message);
      }
    }, cleanupInterval);
    
    console.log('✅ Audit log scheduled cleanup started (every 2 hours)');
  }

  /**
   * Regular cleanup that runs on schedule
   */
  async performScheduledCleanup() {
    try {
      const cutoffDate = new Date(Date.now() - this.maxRetentionDays * 24 * 60 * 60 * 1000);
      
      const result = await AuditLog.deleteMany({
        createdAt: { $lt: cutoffDate }
      });
      
      if (result.deletedCount > 0) {
        console.log(`🧹 Scheduled cleanup: Deleted ${result.deletedCount} old audit logs`);
      }
      
      // Also clean up any orphaned or corrupted entries
      const orphanedResult = await AuditLog.deleteMany({
        $or: [
          { action: { $exists: false } },
          { resource: { $exists: false } },
          { category: { $exists: false } }
        ]
      });
      
      if (orphanedResult.deletedCount > 0) {
        console.log(`🧹 Cleaned up ${orphanedResult.deletedCount} corrupted audit entries`);
      }
      
    } catch (error) {
      console.error('❌ Scheduled cleanup error:', error.message);
    }
  }

  /**
   * Get current storage statistics
   */
  async getStorageStats() {
    try {
      const totalLogs = await AuditLog.countDocuments();
      const last24Hours = await AuditLog.countDocuments({
        createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
      });
      const last7Days = await AuditLog.countDocuments({
        createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
      });
      
      return {
        totalLogs,
        last24Hours,
        last7Days,
        quotaExceeded: this.isQuotaExceeded,
        retentionDays: this.maxRetentionDays
      };
    } catch (error) {
      console.error('❌ Failed to get storage stats:', error.message);
      return null;
    }
  }
}

// Create singleton instance
const auditService = new AuditService();

module.exports = auditService;
