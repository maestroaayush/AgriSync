const express = require('express');
const router = express.Router();
const auditService = require('../services/auditService');
const AuditLog = require('../models/AuditLog');
const mongoose = require('mongoose');
const protect = require('../middleware/authMiddleware');

// Helper middleware to check admin role
const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ 
      success: false, 
      message: 'Access denied. Admin role required.' 
    });
  }
  next();
};

/**
 * @route GET /api/admin/storage
 * @desc Get database storage statistics
 * @access Private (Admin only)
 */
router.get('/storage', protect, requireAdmin, async (req, res) => {
  try {
    // Get MongoDB database statistics
    const dbStats = await mongoose.connection.db.stats();
    const auditStats = await auditService.getStorageStats();
    
    // Get collection-specific statistics
    const collections = await mongoose.connection.db.listCollections().toArray();
    const collectionStats = [];
    
    for (const collection of collections) {
      try {
        const stats = await mongoose.connection.db.collection(collection.name).stats();
        collectionStats.push({
          name: collection.name,
          documents: stats.count || 0,
          avgSize: stats.avgObjSize || 0,
          totalSize: stats.size || 0,
          storageSize: stats.storageSize || 0,
          indexSize: stats.totalIndexSize || 0
        });
      } catch (error) {
        // Some collections might not support stats
        collectionStats.push({
          name: collection.name,
          documents: 0,
          avgSize: 0,
          totalSize: 0,
          storageSize: 0,
          indexSize: 0
        });
      }
    }

    // Sort collections by size
    collectionStats.sort((a, b) => b.totalSize - a.totalSize);

    const storageInfo = {
      database: {
        dataSize: (dbStats.dataSize / (1024 * 1024)).toFixed(2) + ' MB',
        storageSize: (dbStats.storageSize / (1024 * 1024)).toFixed(2) + ' MB',
        indexSize: (dbStats.indexSize / (1024 * 1024)).toFixed(2) + ' MB',
        totalSize: ((dbStats.dataSize + dbStats.indexSize) / (1024 * 1024)).toFixed(2) + ' MB',
        documents: dbStats.objects || 0,
        collections: dbStats.collections || 0,
        avgObjSize: dbStats.avgObjSize || 0,
        usage: (((dbStats.dataSize + dbStats.indexSize) / (512 * 1024 * 1024)) * 100).toFixed(1) + '%',
        quotaLimit: '512 MB'
      },
      auditLogs: auditStats,
      collections: collectionStats,
      recommendations: []
    };

    // Add storage recommendations
    const totalSizeMB = (dbStats.dataSize + dbStats.indexSize) / (1024 * 1024);
    
    if (totalSizeMB > 450) {
      storageInfo.recommendations.push({
        priority: 'HIGH',
        action: 'Critical: Database approaching quota limit',
        suggestion: 'Immediate cleanup required or upgrade plan'
      });
    } else if (totalSizeMB > 350) {
      storageInfo.recommendations.push({
        priority: 'MEDIUM',
        action: 'Warning: Database usage is high',
        suggestion: 'Schedule regular cleanup or consider upgrading'
      });
    }

    if (auditStats && auditStats.totalLogs > 10000) {
      storageInfo.recommendations.push({
        priority: 'MEDIUM',
        action: 'Audit logs are accumulating',
        suggestion: 'Consider reducing retention period or cleanup frequency'
      });
    }

    // Find largest collections
    const largestCollections = collectionStats.slice(0, 3);
    largestCollections.forEach(collection => {
      if (collection.totalSize > 50 * 1024 * 1024) { // > 50MB
        storageInfo.recommendations.push({
          priority: 'LOW',
          action: `Large collection: ${collection.name}`,
          suggestion: `Consider archiving or cleanup (${(collection.totalSize / (1024 * 1024)).toFixed(1)} MB)`
        });
      }
    });

    res.json({
      success: true,
      data: storageInfo
    });

  } catch (error) {
    console.error('Storage statistics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve storage statistics',
      error: error.message
    });
  }
});

/**
 * @route POST /api/admin/storage/cleanup
 * @desc Trigger manual database cleanup
 * @access Private (Admin only)
 */
router.post('/storage/cleanup', protect, requireAdmin, async (req, res) => {
  try {
    const { type = 'standard' } = req.body;
    
    let cleanupResults = {};
    
    if (type === 'emergency') {
      // Emergency cleanup - more aggressive
      console.log('🚨 Admin triggered emergency cleanup');
      
      await auditService.performEmergencyCleanup();
      
      // Additional emergency cleanup
      const cutoffDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 7 days
      const emergencyResult = await AuditLog.deleteMany({
        createdAt: { $lt: cutoffDate }
      });
      
      cleanupResults = {
        type: 'emergency',
        auditLogsDeleted: emergencyResult.deletedCount,
        retentionPeriod: '7 days',
        triggeredBy: req.user.name || req.user.email
      };
      
    } else {
      // Standard cleanup
      console.log('🧹 Admin triggered standard cleanup');
      
      await auditService.performScheduledCleanup();
      
      cleanupResults = {
        type: 'standard',
        message: 'Standard cleanup completed',
        retentionPeriod: '30 days',
        triggeredBy: req.user.name || req.user.email
      };
    }

    // Log the admin action
    await auditService.logAction({
      user: req.user,
      action: 'SYSTEM_CLEANUP',
      resource: 'SYSTEM',
      details: {
        description: `${req.user.name} triggered ${type} database cleanup`,
        cleanupType: type,
        results: cleanupResults
      },
      result: { success: true },
      category: 'ADMIN',
      severity: 'MEDIUM',
      tags: ['CLEANUP', 'ADMIN']
    });

    res.json({
      success: true,
      message: `${type.charAt(0).toUpperCase() + type.slice(1)} cleanup completed successfully`,
      data: cleanupResults
    });

  } catch (error) {
    console.error('Manual cleanup error:', error);
    
    // Log the failed admin action
    try {
      await auditService.logAction({
        user: req.user,
        action: 'SYSTEM_CLEANUP',
        resource: 'SYSTEM',
        details: {
          description: `${req.user.name} failed to trigger cleanup`,
          error: error.message
        },
        result: { success: false },
        category: 'ADMIN',
        severity: 'HIGH',
        tags: ['CLEANUP', 'ADMIN', 'FAILURE']
      });
    } catch (logError) {
      console.error('Failed to log cleanup failure:', logError);
    }

    res.status(500).json({
      success: false,
      message: 'Cleanup operation failed',
      error: error.message
    });
  }
});

/**
 * @route GET /api/admin/storage/health
 * @desc Get storage health status
 * @access Private (Admin only)
 */
router.get('/storage/health', protect, requireAdmin, async (req, res) => {
  try {
    const dbStats = await mongoose.connection.db.stats();
    const totalSizeMB = (dbStats.dataSize + dbStats.indexSize) / (1024 * 1024);
    const usagePercentage = (totalSizeMB / 512) * 100;
    
    let status = 'healthy';
    let message = 'Storage usage is within acceptable limits';
    let actions = [];
    
    if (usagePercentage > 90) {
      status = 'critical';
      message = 'Storage quota nearly exceeded - immediate action required';
      actions = [
        'Run emergency cleanup',
        'Upgrade to paid MongoDB Atlas plan',
        'Archive old data'
      ];
    } else if (usagePercentage > 75) {
      status = 'warning';
      message = 'Storage usage is high - cleanup recommended';
      actions = [
        'Run standard cleanup',
        'Review data retention policies',
        'Monitor storage growth'
      ];
    } else if (usagePercentage > 50) {
      status = 'caution';
      message = 'Storage usage is moderate - monitoring recommended';
      actions = [
        'Schedule regular cleanup',
        'Review largest collections'
      ];
    }

    res.json({
      success: true,
      data: {
        status,
        message,
        usage: {
          percentage: usagePercentage.toFixed(1),
          current: totalSizeMB.toFixed(2) + ' MB',
          limit: '512 MB'
        },
        recommendedActions: actions,
        lastChecked: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Storage health check error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check storage health',
      error: error.message
    });
  }
});

module.exports = router;
