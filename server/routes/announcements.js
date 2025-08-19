const express = require('express');
const router = express.Router();
const Announcement = require('../models/Announcement');
const User = require('../models/user');
const protect = require('../middleware/authMiddleware');
const { auditLogger } = require('../middleware/auditMiddleware');

// Admin middleware to ensure only admins can create/manage announcements
const adminOnly = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Access denied. Admin role required.' });
  }
  next();
};

// GET /api/announcements - Get announcements for the current user
router.get('/', protect, async (req, res) => {
  try {
    const { includeRead = 'false', limit = 10, page = 1 } = req.query;
    const userRole = req.user.role;
    const userId = req.user.id;
    
    // Get active announcements for the user's role
    let announcements = await Announcement.getActiveForRole(userRole);
    
    // Filter out read announcements if requested
    if (includeRead === 'false') {
      announcements = announcements.filter(announcement => 
        !announcement.readBy.some(read => read.user.toString() === userId.toString())
      );
    }
    
    // Pagination
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const paginatedAnnouncements = announcements.slice(startIndex, endIndex);
    
    // Add read status to each announcement
    const announcementsWithStatus = paginatedAnnouncements.map(announcement => {
      const isRead = announcement.readBy.some(read => read.user.toString() === userId.toString());
      return {
        ...announcement.toObject(),
        isRead,
        readAt: isRead ? announcement.readBy.find(read => read.user.toString() === userId.toString()).readAt : null
      };
    });
    
    res.json({
      announcements: announcementsWithStatus,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: announcements.length,
        hasMore: endIndex < announcements.length
      }
    });
  } catch (error) {
    console.error('Error fetching announcements:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// POST /api/announcements - Create a new announcement (Admin only)
router.post('/', protect, adminOnly, async (req, res) => {
  try {
    const {
      title,
      message,
      type,
      priority,
      targetRoles,
      scheduledFor,
      expiresAt,
      displaySettings
    } = req.body;
    
    // Validate required fields
    if (!title || !message) {
      return res.status(400).json({ message: 'Title and message are required' });
    }
    
    // Calculate target users count
    let targetUsersCount = 0;
    if (targetRoles.includes('all')) {
      targetUsersCount = await User.countDocuments({ approved: true });
    } else {
      targetUsersCount = await User.countDocuments({ 
        role: { $in: targetRoles }, 
        approved: true 
      });
    }
    
    const announcement = new Announcement({
      title,
      message,
      type: type || 'info',
      priority: priority || 'normal',
      targetRoles: targetRoles || ['all'],
      scheduledFor: scheduledFor ? new Date(scheduledFor) : new Date(),
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      createdBy: req.user.id,
      stats: {
        totalTargetUsers: targetUsersCount,
        totalReadUsers: 0,
        readRate: 0
      },
      displaySettings: displaySettings || {}
    });
    
    await announcement.save();
    await announcement.populate('createdBy', 'name email role');
    
    // Log the action
    await auditLogger.logSystem('ANNOUNCEMENT_CREATED', {
      description: `Admin ${req.user.name} created announcement: ${title}`,
      metadata: {
        announcementId: announcement._id,
        targetRoles,
        targetUsersCount,
        type,
        priority
      }
    }, 'MEDIUM');
    
    res.status(201).json({
      message: 'Announcement created successfully',
      announcement
    });
  } catch (error) {
    console.error('Error creating announcement:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// PUT /api/announcements/:id - Update an announcement (Admin only)
router.put('/:id', protect, adminOnly, async (req, res) => {
  try {
    const announcementId = req.params.id;
    const updates = req.body;
    
    const announcement = await Announcement.findById(announcementId);
    if (!announcement) {
      return res.status(404).json({ message: 'Announcement not found' });
    }
    
    // Store old values for audit log
    const oldValues = announcement.toObject();
    
    // Update announcement
    Object.assign(announcement, updates);
    
    // Recalculate target users if roles changed
    if (updates.targetRoles) {
      let targetUsersCount = 0;
      if (updates.targetRoles.includes('all')) {
        targetUsersCount = await User.countDocuments({ approved: true });
      } else {
        targetUsersCount = await User.countDocuments({ 
          role: { $in: updates.targetRoles }, 
          approved: true 
        });
      }
      announcement.stats.totalTargetUsers = targetUsersCount;
      announcement.stats.readRate = ((announcement.stats.totalReadUsers / targetUsersCount) * 100).toFixed(1);
    }
    
    await announcement.save();
    await announcement.populate('createdBy', 'name email role');
    
    // Log the action
    await auditLogger.logSystem('ANNOUNCEMENT_UPDATED', {
      description: `Admin ${req.user.name} updated announcement: ${announcement.title}`,
      oldValues: { title: oldValues.title, targetRoles: oldValues.targetRoles },
      newValues: { title: announcement.title, targetRoles: announcement.targetRoles },
      metadata: { announcementId }
    }, 'MEDIUM');
    
    res.json({
      message: 'Announcement updated successfully',
      announcement
    });
  } catch (error) {
    console.error('Error updating announcement:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// DELETE /api/announcements/:id - Delete an announcement (Admin only)
router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    const announcementId = req.params.id;
    
    const announcement = await Announcement.findById(announcementId);
    if (!announcement) {
      return res.status(404).json({ message: 'Announcement not found' });
    }
    
    const announcementTitle = announcement.title;
    await Announcement.findByIdAndDelete(announcementId);
    
    // Log the action
    await auditLogger.logSystem('ANNOUNCEMENT_DELETED', {
      description: `Admin ${req.user.name} deleted announcement: ${announcementTitle}`,
      metadata: { 
        deletedAnnouncementId: announcementId,
        title: announcementTitle
      }
    }, 'HIGH');
    
    res.json({ message: 'Announcement deleted successfully' });
  } catch (error) {
    console.error('Error deleting announcement:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// POST /api/announcements/:id/mark-read - Mark an announcement as read
router.post('/:id/mark-read', protect, async (req, res) => {
  try {
    const announcementId = req.params.id;
    const userId = req.user.id;
    
    const announcement = await Announcement.findById(announcementId);
    if (!announcement) {
      return res.status(404).json({ message: 'Announcement not found' });
    }
    
    // Check if user is in target roles
    const userRole = req.user.role;
    if (!announcement.targetRoles.includes('all') && !announcement.targetRoles.includes(userRole)) {
      return res.status(403).json({ message: 'This announcement is not for your role' });
    }
    
    await announcement.markAsRead(userId);
    
    res.json({ message: 'Announcement marked as read' });
  } catch (error) {
    console.error('Error marking announcement as read:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// GET /api/announcements/admin/all - Get all announcements (Admin only)
router.get('/admin/all', protect, adminOnly, async (req, res) => {
  try {
    const { page = 1, limit = 20, isActive, type, priority } = req.query;
    
    // Build filter
    let filter = {};
    if (isActive !== undefined) filter.isActive = isActive === 'true';
    if (type) filter.type = type;
    if (priority) filter.priority = priority;
    
    const announcements = await Announcement.find(filter)
      .populate('createdBy', 'name email role')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));
    
    const total = await Announcement.countDocuments(filter);
    
    res.json({
      announcements,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching all announcements:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// GET /api/announcements/:id/stats - Get announcement statistics (Admin only)
router.get('/:id/stats', protect, adminOnly, async (req, res) => {
  try {
    const announcementId = req.params.id;
    
    const announcement = await Announcement.findById(announcementId)
      .populate('createdBy', 'name email role')
      .populate('readBy.user', 'name email role');
    
    if (!announcement) {
      return res.status(404).json({ message: 'Announcement not found' });
    }
    
    // Get detailed read statistics
    const readStats = {
      totalTargetUsers: announcement.stats.totalTargetUsers,
      totalReadUsers: announcement.stats.totalReadUsers,
      readRate: announcement.stats.readRate,
      readByRole: {},
      recentReads: announcement.readBy
        .sort((a, b) => new Date(b.readAt) - new Date(a.readAt))
        .slice(0, 10)
    };
    
    // Calculate read rate by role
    const roleStats = {};
    for (const read of announcement.readBy) {
      if (read.user && read.user.role) {
        if (!roleStats[read.user.role]) {
          roleStats[read.user.role] = 0;
        }
        roleStats[read.user.role]++;
      }
    }
    
    readStats.readByRole = roleStats;
    
    res.json({
      announcement: {
        ...announcement.toObject(),
        stats: readStats
      }
    });
  } catch (error) {
    console.error('Error fetching announcement stats:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
