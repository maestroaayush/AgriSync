const AuditLog = require('../models/AuditLog');

// Middleware to automatically log HTTP requests
const auditMiddleware = (options = {}) => {
  return async (req, res, next) => {
    const startTime = Date.now();
    
    // Store original res.json to intercept response
    const originalJson = res.json;
    let responseData;
    
    res.json = function(data) {
      responseData = data;
      return originalJson.call(this, data);
    };
    
    // Store original res.status to intercept status
    const originalStatus = res.status;
    let statusCode;
    
    res.status = function(code) {
      statusCode = code;
      return originalStatus.call(this, code);
    };
    
    // Log after response is sent
    res.on('finish', async () => {
      try {
        const duration = Date.now() - startTime;
        const finalStatusCode = statusCode || res.statusCode;
        
        // Skip logging for certain routes or methods if specified
        if (options.skipRoutes && options.skipRoutes.some(route => req.path.includes(route))) {
          return;
        }
        
        if (options.skipMethods && options.skipMethods.includes(req.method)) {
          return;
        }
        
        // Determine action based on HTTP method and route
        const action = determineAction(req);
        const resource = determineResource(req);
        const category = determineCategory(req, action);
        const severity = determineSeverity(finalStatusCode, req);
        
        // Extract user info if available
        const user = req.user && req.user._id ? req.user : null;
        
        // Prepare request info
        const requestInfo = {
          method: req.method,
          url: req.originalUrl,
          userAgent: req.get('User-Agent'),
          ip: req.ip || req.connection.remoteAddress,
          headers: sanitizeHeaders(req.headers)
        };
        
        // Prepare result info
        const result = {
          success: finalStatusCode >= 200 && finalStatusCode < 400,
          statusCode: finalStatusCode,
          errorMessage: responseData?.message || responseData?.error || null,
          duration
        };
        
        // Prepare details
        const details = {
          description: generateDescription(action, resource, req, result.success),
          metadata: {
            query: req.query,
            params: req.params,
            bodyKeys: req.body ? Object.keys(req.body) : []
          }
        };
        
        // Log the action
        try {
          await AuditLog.logAction({
            user,
            action,
            resource,
            resourceId: extractResourceId(req),
            details,
            request: requestInfo,
            result,
            category,
            severity,
            tags: generateTags(req, action, result.success)
          });
        } catch (auditError) {
          // Handle storage quota exceeded error gracefully
          if (auditError.code === 8000 || auditError.message?.includes('space quota')) {
            console.warn('⚠️ Audit log skipped - database storage quota exceeded');
            console.warn('💡 Run cleanup-database.js to free up space');
          } else {
            console.error('❌ Audit logging failed:', auditError.message);
          }
          // Don't break the application if audit logging fails
        }
        
      } catch (error) {
        console.error('Audit logging failed:', error);
        // Don't break the application if audit logging fails
      }
    });
    
    next();
  };
};

// Helper functions
function determineAction(req) {
  const { method, path } = req;
  const pathLower = path.toLowerCase();
  
  // Authentication actions
  if (pathLower.includes('/login')) return 'LOGIN';
  if (pathLower.includes('/logout')) return 'LOGOUT';
  if (pathLower.includes('/register')) return 'USER_CREATED';
  if (pathLower.includes('/reset-password')) return 'PASSWORD_RESET';
  if (pathLower.includes('/change-password')) return 'PASSWORD_CHANGED';
  
  // User management
  if (pathLower.includes('/users') && method === 'POST') return 'USER_CREATED';
  if (pathLower.includes('/users') && method === 'PUT') return 'USER_UPDATED';
  if (pathLower.includes('/users') && method === 'DELETE') return 'USER_DELETED';
  if (pathLower.includes('/approve')) return 'USER_APPROVED';
  if (pathLower.includes('/decline')) return 'USER_DECLINED';
  
  // Data actions
  if (pathLower.includes('/inventory') && method === 'POST') return 'INVENTORY_CREATED';
  if (pathLower.includes('/inventory') && method === 'PUT') return 'INVENTORY_UPDATED';
  if (pathLower.includes('/inventory') && method === 'DELETE') return 'INVENTORY_DELETED';
  
  if (pathLower.includes('/deliveries') && method === 'POST') return 'DELIVERY_CREATED';
  if (pathLower.includes('/deliveries') && method === 'PUT') return 'DELIVERY_UPDATED';
  if (pathLower.includes('/deliveries') && method === 'DELETE') return 'DELIVERY_DELETED';
  
  if (pathLower.includes('/warehouses') && method === 'POST') return 'WAREHOUSE_CREATED';
  if (pathLower.includes('/warehouses') && method === 'PUT') return 'WAREHOUSE_UPDATED';
  if (pathLower.includes('/warehouses') && method === 'DELETE') return 'WAREHOUSE_DELETED';
  
  // Admin actions
  if (pathLower.includes('/announcements') && method === 'POST') return 'ANNOUNCEMENT_CREATED';
  if (pathLower.includes('/announcements') && method === 'PUT') return 'ANNOUNCEMENT_UPDATED';
  if (pathLower.includes('/announcements') && method === 'DELETE') return 'ANNOUNCEMENT_DELETED';
  if (pathLower.includes('/export')) return 'SYSTEM_EXPORT';
  
  // Default actions
  if (method === 'POST') return 'DATA_CREATED';
  if (method === 'PUT' || method === 'PATCH') return 'DATA_UPDATED';
  if (method === 'DELETE') return 'DATA_DELETED';
  
  return 'API_ACCESS';
}

function determineResource(req) {
  const pathLower = req.path.toLowerCase();
  
  if (pathLower.includes('/users') || pathLower.includes('/auth')) return 'USER';
  if (pathLower.includes('/inventory')) return 'INVENTORY';
  if (pathLower.includes('/deliveries')) return 'DELIVERY';
  if (pathLower.includes('/warehouses')) return 'WAREHOUSE';
  if (pathLower.includes('/orders')) return 'ORDER';
  if (pathLower.includes('/announcements')) return 'ANNOUNCEMENT';
  if (pathLower.includes('/export') || pathLower.includes('/analytics')) return 'SYSTEM';
  
  return 'SYSTEM';
}

function determineCategory(req, action) {
  const authActions = ['LOGIN', 'LOGOUT', 'LOGIN_FAILED', 'PASSWORD_RESET', 'PASSWORD_CHANGED'];
  const userActions = ['USER_CREATED', 'USER_UPDATED', 'USER_DELETED', 'USER_APPROVED', 'USER_DECLINED'];
  const adminActions = ['ANNOUNCEMENT_CREATED', 'SYSTEM_EXPORT', 'BULK_OPERATION'];
  const dataActions = ['INVENTORY_CREATED', 'DELIVERY_CREATED', 'WAREHOUSE_CREATED', 'DATA_CREATED', 'DATA_UPDATED', 'DATA_DELETED'];
  
  if (authActions.includes(action)) return 'SECURITY';
  if (userActions.includes(action)) return 'USER';
  if (adminActions.includes(action)) return 'ADMIN';
  if (dataActions.includes(action)) return 'DATA';
  
  return 'SYSTEM';
}

function determineSeverity(statusCode, req) {
  // Critical errors
  if (statusCode >= 500) return 'CRITICAL';
  
  // Client errors
  if (statusCode >= 400) return 'MEDIUM';
  
  // Check for sensitive operations
  const pathLower = req.path.toLowerCase();
  if (pathLower.includes('/delete') || pathLower.includes('/decline')) return 'HIGH';
  if (pathLower.includes('/approve') || pathLower.includes('/export')) return 'MEDIUM';
  
  return 'LOW';
}

function extractResourceId(req) {
  // Try to extract ID from URL params
  if (req.params && req.params.id) return req.params.id;
  if (req.params && req.params.userId) return req.params.userId;
  if (req.params && req.params.deliveryId) return req.params.deliveryId;
  if (req.params && req.params.warehouseId) return req.params.warehouseId;
  
  // Try to extract from request body
  if (req.body && req.body._id) return req.body._id;
  if (req.body && req.body.id) return req.body.id;
  
  return null;
}

function sanitizeHeaders(headers) {
  const sanitized = { ...headers };
  
  // Remove sensitive headers
  delete sanitized.authorization;
  delete sanitized.cookie;
  delete sanitized['x-api-key'];
  
  return sanitized;
}

function generateDescription(action, resource, req, success) {
  const status = success ? 'successfully' : 'failed to';
  const user = req.user ? `${req.user.name} (${req.user.role})` : 'Anonymous user';
  
  const actionDescriptions = {
    'LOGIN': `${user} ${status} logged in`,
    'LOGOUT': `${user} ${status} logged out`,
    'USER_CREATED': `${user} ${status} created a new user`,
    'USER_UPDATED': `${user} ${status} updated user information`,
    'USER_DELETED': `${user} ${status} deleted a user`,
    'USER_APPROVED': `${user} ${status} approved a user`,
    'USER_DECLINED': `${user} ${status} declined a user`,
    'INVENTORY_CREATED': `${user} ${status} created inventory item`,
    'INVENTORY_UPDATED': `${user} ${status} updated inventory item`,
    'DELIVERY_CREATED': `${user} ${status} created a delivery`,
    'DELIVERY_UPDATED': `${user} ${status} updated delivery information`,
    'ANNOUNCEMENT_CREATED': `${user} ${status} created an announcement`,
    'SYSTEM_EXPORT': `${user} ${status} exported system data`
  };
  
  return actionDescriptions[action] || `${user} ${status} performed ${action} on ${resource}`;
}

function generateTags(req, action, success) {
  const tags = [];
  
  // Add method tag
  tags.push(req.method);
  
  // Add success/failure tag
  tags.push(success ? 'SUCCESS' : 'FAILURE');
  
  // Add user role tag if available
  if (req.user && req.user.role) {
    tags.push(`ROLE_${req.user.role.toUpperCase()}`);
  }
  
  // Add specific tags based on action
  if (action.includes('LOGIN')) tags.push('AUTH');
  if (action.includes('EXPORT')) tags.push('DATA_EXPORT');
  if (action.includes('DELETE')) tags.push('DESTRUCTIVE');
  if (action.includes('ANNOUNCEMENT')) tags.push('BROADCAST');
  
  return tags;
}

// Specific audit logging functions for manual use
const auditLogger = {
  // Log authentication events
  logAuth: async (user, action, success, req, details = {}) => {
    await AuditLog.logAction({
      user,
      action,
      resource: 'AUTH',
      details: {
        description: `${user?.name || 'User'} ${success ? 'successfully' : 'failed to'} ${action.toLowerCase()}`,
        ...details
      },
      request: {
        method: req?.method,
        url: req?.originalUrl,
        userAgent: req?.get('User-Agent'),
        ip: req?.ip || req?.connection?.remoteAddress
      },
      result: { success },
      category: 'SECURITY',
      severity: success ? 'LOW' : 'MEDIUM',
      tags: ['AUTH', success ? 'SUCCESS' : 'FAILURE']
    });
  },
  
  // Log user management events
  logUserManagement: async (user, action, targetUser, success, details = {}) => {
    await AuditLog.logAction({
      user,
      action,
      resource: 'USER',
      resourceId: targetUser?._id,
      details: {
        description: `${user?.name} ${success ? 'successfully' : 'failed to'} ${action.toLowerCase()} user ${targetUser?.name}`,
        ...details
      },
      result: { success },
      category: 'USER',
      severity: 'MEDIUM',
      tags: ['USER_MANAGEMENT', success ? 'SUCCESS' : 'FAILURE']
    });
  },
  
  // Log system events
  logSystem: async (action, details = {}, severity = 'LOW') => {
    await AuditLog.logAction({
      user: null,
      action,
      resource: 'SYSTEM',
      details,
      result: { success: true },
      category: 'SYSTEM',
      severity,
      tags: ['SYSTEM']
    });
  }
};

module.exports = { auditMiddleware, auditLogger };
