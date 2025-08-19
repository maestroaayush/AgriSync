const express = require('express');
const router = express.Router();
const AuditLog = require('../models/AuditLog');
const User = require('../models/user');
const protect = require('../middleware/authMiddleware');

// Admin middleware to ensure only admins can access audit logs
const adminOnly = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Access denied. Admin role required.' });
  }
  next();
};

// GET /api/audit/logs - Get filtered audit logs (Admin only)
router.get('/logs', protect, adminOnly, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      user,
      action,
      resource,
      category,
      severity,
      fromDate,
      toDate,
      ip,
      tags,
      search
    } = req.query;
    
    // Parse tags if provided
    const tagsArray = tags ? tags.split(',').map(tag => tag.trim()) : undefined;
    
    // Build filters
    const filters = {
      user,
      action,
      resource,
      category,
      severity,
      fromDate,
      toDate,
      ip,
      tags: tagsArray
    };
    
    // Add search functionality
    let logs;
    if (search) {
      // Search in description, user details, and action
      const searchRegex = new RegExp(search, 'i');
      logs = await AuditLog.find({
        $or: [
          { 'details.description': searchRegex },
          { 'userDetails.name': searchRegex },
          { 'userDetails.email': searchRegex },
          { action: searchRegex }
        ]
      })
      .populate('user', 'name email role')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));
    } else {
      logs = await AuditLog.getFilteredLogs(filters, {
        page: parseInt(page),
        limit: parseInt(limit),
        sort: { createdAt: -1 }
      });
    }
    
    // Get total count for pagination
    const totalQuery = search ? 
      AuditLog.countDocuments({
        $or: [
          { 'details.description': new RegExp(search, 'i') },
          { 'userDetails.name': new RegExp(search, 'i') },
          { 'userDetails.email': new RegExp(search, 'i') },
          { action: new RegExp(search, 'i') }
        ]
      }) :
      AuditLog.countDocuments(buildFilterQuery(filters));
    
    const total = await totalQuery;
    
    res.json({
      logs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// GET /api/audit/stats - Get audit statistics (Admin only)
router.get('/stats', protect, adminOnly, async (req, res) => {
  try {
    const { fromDate, toDate, period = '30d' } = req.query;
    
    // Calculate date range based on period
    let startDate, endDate;
    if (fromDate && toDate) {
      startDate = new Date(fromDate);
      endDate = new Date(toDate);
    } else {
      endDate = new Date();
      const periodMap = {
        '7d': 7,
        '30d': 30,
        '90d': 90,
        '1y': 365
      };
      const days = periodMap[period] || 30;
      startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    }
    
    // Get overall statistics
    const overallStats = await AuditLog.getStats({
      fromDate: startDate,
      toDate: endDate
    });
    
    // Get activity trends by day
    const activityTrends = await AuditLog.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: { 
            date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }
          },
          totalActions: { $sum: 1 },
          successfulActions: {
            $sum: { $cond: [{ $eq: ['$result.success', true] }, 1, 0] }
          },
          failedActions: {
            $sum: { $cond: [{ $eq: ['$result.success', false] }, 1, 0] }
          },
          criticalActions: {
            $sum: { $cond: [{ $eq: ['$severity', 'CRITICAL'] }, 1, 0] }
          }
        }
      },
      { $sort: { '_id.date': 1 } }
    ]);
    
    // Get action breakdown
    const actionBreakdown = await AuditLog.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: '$action',
          count: { $sum: 1 },
          successCount: {
            $sum: { $cond: [{ $eq: ['$result.success', true] }, 1, 0] }
          },
          failureCount: {
            $sum: { $cond: [{ $eq: ['$result.success', false] }, 1, 0] }
          }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 15 }
    ]);
    
    // Get category breakdown
    const categoryBreakdown = await AuditLog.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          severityBreakdown: {
            $push: '$severity'
          }
        }
      },
      { $sort: { count: -1 } }
    ]);
    
    // Get user activity (top active users)
    const userActivity = await AuditLog.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate },
          user: { $ne: null }
        }
      },
      {
        $group: {
          _id: '$user',
          actionCount: { $sum: 1 },
          userDetails: { $first: '$userDetails' },
          lastActivity: { $max: '$createdAt' },
          actions: { $addToSet: '$action' }
        }
      },
      { $sort: { actionCount: -1 } },
      { $limit: 10 }
    ]);
    
    // Get security events (failed logins, critical actions, etc.)
    const securityEvents = await AuditLog.find({
      createdAt: { $gte: startDate, $lte: endDate },
      $or: [
        { action: 'LOGIN_FAILED' },
        { severity: 'CRITICAL' },
        { category: 'SECURITY' }
      ]
    })
    .populate('user', 'name email role')
    .sort({ createdAt: -1 })
    .limit(20);
    
    // Get IP address activity
    const ipActivity = await AuditLog.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate },
          'request.ip': { $ne: null }
        }
      },
      {
        $group: {
          _id: '$request.ip',
          actionCount: { $sum: 1 },
          uniqueUsers: { $addToSet: '$user' },
          lastActivity: { $max: '$createdAt' },
          failedActions: {
            $sum: { $cond: [{ $eq: ['$result.success', false] }, 1, 0] }
          }
        }
      },
      { $sort: { actionCount: -1 } },
      { $limit: 10 }
    ]);
    
    res.json({
      period: {
        start: startDate,
        end: endDate,
        duration: `${Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24))} days`
      },
      overview: {
        totalLogs: overallStats.totalLogs,
        failedActions: overallStats.failedActions,
        successRate: overallStats.totalLogs > 0 ? 
          (((overallStats.totalLogs - overallStats.failedActions) / overallStats.totalLogs) * 100).toFixed(1) : 0,
        uniqueUsers: overallStats.uniqueUsers.length,
        uniqueIPs: overallStats.uniqueIPs.length
      },
      trends: {
        daily: activityTrends
      },
      breakdown: {
        actions: actionBreakdown,
        categories: categoryBreakdown
      },
      security: {
        events: securityEvents,
        summary: {
          totalSecurityEvents: securityEvents.length,
          criticalEvents: securityEvents.filter(e => e.severity === 'CRITICAL').length,
          failedLogins: securityEvents.filter(e => e.action === 'LOGIN_FAILED').length
        }
      },
      activity: {
        topUsers: userActivity,
        topIPs: ipActivity
      }
    });
  } catch (error) {
    console.error('Error fetching audit statistics:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// GET /api/audit/user/:userId - Get audit logs for a specific user (Admin only)
router.get('/user/:userId', protect, adminOnly, async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 20, fromDate, toDate } = req.query;
    
    // Verify user exists
    const user = await User.findById(userId).select('name email role');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Build date filter
    let dateFilter = {};
    if (fromDate || toDate) {
      dateFilter.createdAt = {};
      if (fromDate) dateFilter.createdAt.$gte = new Date(fromDate);
      if (toDate) dateFilter.createdAt.$lte = new Date(toDate);
    }
    
    // Get user's audit logs
    const logs = await AuditLog.find({
      user: userId,
      ...dateFilter
    })
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(parseInt(limit));
    
    // Get user activity summary
    const activitySummary = await AuditLog.aggregate([
      { $match: { user: userId, ...dateFilter } },
      {
        $group: {
          _id: null,
          totalActions: { $sum: 1 },
          successfulActions: {
            $sum: { $cond: [{ $eq: ['$result.success', true] }, 1, 0] }
          },
          failedActions: {
            $sum: { $cond: [{ $eq: ['$result.success', false] }, 1, 0] }
          },
          actionTypes: { $addToSet: '$action' },
          lastActivity: { $max: '$createdAt' },
          firstActivity: { $min: '$createdAt' }
        }
      }
    ]);
    
    const total = await AuditLog.countDocuments({ user: userId, ...dateFilter });
    
    res.json({
      user,
      logs,
      summary: activitySummary[0] || {
        totalActions: 0,
        successfulActions: 0,
        failedActions: 0,
        actionTypes: [],
        lastActivity: null,
        firstActivity: null
      },
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching user audit logs:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// GET /api/audit/export - Export audit logs (Admin only)
router.get('/export', protect, adminOnly, async (req, res) => {
  try {
    const {
      format = 'csv',
      fromDate,
      toDate,
      category,
      severity,
      limit = 10000
    } = req.query;
    
    // Build filter
    let filter = {};
    if (fromDate || toDate) {
      filter.createdAt = {};
      if (fromDate) filter.createdAt.$gte = new Date(fromDate);
      if (toDate) filter.createdAt.$lte = new Date(toDate);
    }
    if (category) filter.category = category;
    if (severity) filter.severity = severity;
    
    // Get logs
    const logs = await AuditLog.find(filter)
      .populate('user', 'name email role')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));
    
    if (format === 'csv') {
      // Generate CSV
      const csvHeaders = [
        'Timestamp',
        'User',
        'Email', 
        'Role',
        'Action',
        'Resource',
        'Category',
        'Severity',
        'Success',
        'IP Address',
        'Description'
      ];
      
      const csvRows = logs.map(log => [
        log.createdAt.toISOString(),
        log.userDetails?.name || log.user?.name || 'System',
        log.userDetails?.email || log.user?.email || '',
        log.userDetails?.role || log.user?.role || '',
        log.action,
        log.resource,
        log.category,
        log.severity,
        log.result?.success ? 'Yes' : 'No',
        log.request?.ip || '',
        log.details?.description || ''
      ]);
      
      const csvContent = [csvHeaders, ...csvRows]
        .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
        .join('\n');
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=audit_logs_${new Date().toISOString().split('T')[0]}.csv`);
      res.send(csvContent);
    } else {
      // Return JSON
      res.json({
        exportInfo: {
          totalRecords: logs.length,
          dateRange: {
            from: fromDate || 'Beginning',
            to: toDate || 'Now'
          },
          filters: { category, severity }
        },
        logs
      });
    }
  } catch (error) {
    console.error('Error exporting audit logs:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Helper function to build filter query
function buildFilterQuery(filters) {
  let query = {};
  
  if (filters.user) query.user = filters.user;
  if (filters.action) query.action = filters.action;
  if (filters.resource) query.resource = filters.resource;
  if (filters.category) query.category = filters.category;
  if (filters.severity) query.severity = filters.severity;
  if (filters.ip) query['request.ip'] = filters.ip;
  if (filters.tags && filters.tags.length > 0) query.tags = { $in: filters.tags };
  
  if (filters.fromDate || filters.toDate) {
    query.createdAt = {};
    if (filters.fromDate) query.createdAt.$gte = new Date(filters.fromDate);
    if (filters.toDate) query.createdAt.$lte = new Date(filters.toDate);
  }
  
  return query;
}

module.exports = router;
