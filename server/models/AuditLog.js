const mongoose = require('mongoose');

const AuditLogSchema = new mongoose.Schema({
  // User who performed the action
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false // Some actions might be system-initiated
  },
  userDetails: {
    name: String,
    email: String,
    role: String,
    ip: String
  },
  
  // Action details
  action: {
    type: String,
    required: true,
    enum: [
      // Authentication actions
      'LOGIN', 'LOGOUT', 'LOGIN_FAILED', 'PASSWORD_RESET', 'PASSWORD_CHANGED',
      'EMAIL_VERIFIED', 'ACCOUNT_LOCKED', 'ACCOUNT_UNLOCKED', 'API_ACCESS',
      
      // User management actions
      'USER_CREATED', 'USER_UPDATED', 'USER_DELETED', 'USER_APPROVED', 'USER_DECLINED',
      'ROLE_CHANGED', 'LOCATION_UPDATED',
      
      // Data actions
      'INVENTORY_CREATED', 'INVENTORY_UPDATED', 'INVENTORY_DELETED',
      'DELIVERY_CREATED', 'DELIVERY_UPDATED', 'DELIVERY_DELETED', 'DELIVERY_STATUS_CHANGED',
      'WAREHOUSE_CREATED', 'WAREHOUSE_UPDATED', 'WAREHOUSE_DELETED',
      'ORDER_CREATED', 'ORDER_UPDATED', 'ORDER_DELETED',
      
      // Generic data actions (fallback for middleware)
      'DATA_CREATED', 'DATA_UPDATED', 'DATA_DELETED',
      
      // Admin actions
      'ANNOUNCEMENT_CREATED', 'ANNOUNCEMENT_UPDATED', 'ANNOUNCEMENT_DELETED',
      'SYSTEM_EXPORT', 'SYSTEM_CONFIG_CHANGED', 'BULK_OPERATION',
      
      // System events
      'SYSTEM_STARTUP', 'SYSTEM_SHUTDOWN', 'DATABASE_BACKUP', 'DATABASE_RESTORE',
      'ERROR_OCCURRED', 'SECURITY_ALERT', 'SYSTEM_QUOTA_CHECK', 'SYSTEM_CLEANUP'
    ]
  },
  
  // Resource affected
  resource: {
    type: String,
    required: true,
    enum: ['USER', 'INVENTORY', 'DELIVERY', 'WAREHOUSE', 'ORDER', 'ANNOUNCEMENT', 'SYSTEM', 'AUTH']
  },
  
  resourceId: {
    type: String, // Can be ObjectId or other identifier
    required: false
  },
  
  // Detailed information
  details: {
    description: String,
    oldValues: mongoose.Schema.Types.Mixed,
    newValues: mongoose.Schema.Types.Mixed,
    metadata: mongoose.Schema.Types.Mixed
  },
  
  // Request information
  request: {
    method: String,
    url: String,
    userAgent: String,
    ip: String,
    headers: mongoose.Schema.Types.Mixed
  },
  
  // Result information
  result: {
    success: {
      type: Boolean,
      default: true
    },
    statusCode: Number,
    errorMessage: String,
    duration: Number // in milliseconds
  },
  
  // Categorization
  category: {
    type: String,
    enum: ['SECURITY', 'DATA', 'USER', 'SYSTEM', 'ADMIN'],
    required: true
  },
  
  severity: {
    type: String,
    enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
    default: 'LOW'
  },
  
  // Geolocation (if available)
  location: {
    country: String,
    region: String,
    city: String,
    coordinates: {
      latitude: Number,
      longitude: Number
    }
  },
  
  // Tags for easy filtering
  tags: [String]
  
}, {
  timestamps: true
});

// Indexes for efficient querying
AuditLogSchema.index({ user: 1, createdAt: -1 });
AuditLogSchema.index({ action: 1, createdAt: -1 });
AuditLogSchema.index({ resource: 1, resourceId: 1 });
AuditLogSchema.index({ category: 1, severity: 1 });
AuditLogSchema.index({ createdAt: -1 });
AuditLogSchema.index({ 'request.ip': 1 });
AuditLogSchema.index({ tags: 1 });

// Static method to log an action
AuditLogSchema.statics.logAction = async function({
  user,
  action,
  resource,
  resourceId,
  details,
  request,
  result,
  category,
  severity = 'LOW',
  tags = []
}) {
  try {
    // Safely extract user ID - only if it's a valid ObjectId
    let userId = null;
    if (user) {
      if (typeof user === 'string' && user.match(/^[0-9a-fA-F]{24}$/)) {
        userId = user;
      } else if (user._id && typeof user._id === 'string' && user._id.match(/^[0-9a-fA-F]{24}$/)) {
        userId = user._id;
      } else if (user.id && typeof user.id === 'string' && user.id.match(/^[0-9a-fA-F]{24}$/)) {
        userId = user.id;
      }
    }
    
    const logEntry = new this({
      user: userId,
      userDetails: user && (user.name || user.email || user.role) ? {
        name: user.name,
        email: user.email,
        role: user.role,
        ip: request?.ip
      } : null,
      action,
      resource,
      resourceId,
      details,
      request,
      result,
      category,
      severity,
      tags
    });
    
    await logEntry.save();
    return logEntry;
  } catch (error) {
    console.error('Failed to create audit log:', error);
    // Don't throw error to avoid breaking main functionality
    return null;
  }
};

// Static method to get audit logs with filters
AuditLogSchema.statics.getFilteredLogs = function(filters = {}, options = {}) {
  const {
    user,
    action,
    resource,
    category,
    severity,
    fromDate,
    toDate,
    ip,
    tags
  } = filters;
  
  const {
    page = 1,
    limit = 50,
    sort = { createdAt: -1 }
  } = options;
  
  let query = {};
  
  if (user) query.user = user;
  if (action) query.action = action;
  if (resource) query.resource = resource;
  if (category) query.category = category;
  if (severity) query.severity = severity;
  if (ip) query['request.ip'] = ip;
  if (tags && tags.length > 0) query.tags = { $in: tags };
  
  if (fromDate || toDate) {
    query.createdAt = {};
    if (fromDate) query.createdAt.$gte = new Date(fromDate);
    if (toDate) query.createdAt.$lte = new Date(toDate);
  }
  
  return this.find(query)
    .populate('user', 'name email role')
    .sort(sort)
    .skip((page - 1) * limit)
    .limit(limit);
};

// Static method to get audit statistics
AuditLogSchema.statics.getStats = async function(filters = {}) {
  const { fromDate, toDate } = filters;
  
  let matchStage = {};
  if (fromDate || toDate) {
    matchStage.createdAt = {};
    if (fromDate) matchStage.createdAt.$gte = new Date(fromDate);
    if (toDate) matchStage.createdAt.$lte = new Date(toDate);
  }
  
  const stats = await this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: null,
        totalLogs: { $sum: 1 },
        actionBreakdown: {
          $push: {
            action: '$action',
            category: '$category',
            severity: '$severity'
          }
        },
        failedActions: {
          $sum: { $cond: [{ $eq: ['$result.success', false] }, 1, 0] }
        },
        uniqueUsers: { $addToSet: '$user' },
        uniqueIPs: { $addToSet: '$request.ip' }
      }
    }
  ]);
  
  return stats[0] || {
    totalLogs: 0,
    actionBreakdown: [],
    failedActions: 0,
    uniqueUsers: [],
    uniqueIPs: []
  };
};

module.exports = mongoose.model('AuditLog', AuditLogSchema);
