const mongoose = require('mongoose');

const AnnouncementSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  message: {
    type: String,
    required: true,
    trim: true,
    maxlength: 2000
  },
  type: {
    type: String,
    enum: ['info', 'warning', 'success', 'error', 'maintenance', 'update'],
    default: 'info'
  },
  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal'
  },
  targetRoles: [{
    type: String,
    enum: ['farmer', 'transporter', 'warehouse_manager', 'market_vendor', 'admin', 'all']
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  scheduledFor: {
    type: Date,
    default: Date.now
  },
  expiresAt: {
    type: Date,
    default: null // null means no expiration
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  readBy: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    readAt: {
      type: Date,
      default: Date.now
    }
  }],
  // Statistics
  stats: {
    totalTargetUsers: {
      type: Number,
      default: 0
    },
    totalReadUsers: {
      type: Number,
      default: 0
    },
    readRate: {
      type: Number,
      default: 0
    }
  },
  // Display settings
  displaySettings: {
    showAsPopup: {
      type: Boolean,
      default: false
    },
    showInDashboard: {
      type: Boolean,
      default: true
    },
    showInNotifications: {
      type: Boolean,
      default: true
    },
    backgroundColor: {
      type: String,
      default: '#f3f4f6'
    },
    textColor: {
      type: String,
      default: '#1f2937'
    }
  }
}, {
  timestamps: true
});

// Index for efficient querying
AnnouncementSchema.index({ isActive: 1, scheduledFor: 1, expiresAt: 1 });
AnnouncementSchema.index({ targetRoles: 1, isActive: 1 });
AnnouncementSchema.index({ createdBy: 1 });

// Method to check if announcement is currently active
AnnouncementSchema.methods.isCurrentlyActive = function() {
  const now = new Date();
  return this.isActive && 
         this.scheduledFor <= now && 
         (!this.expiresAt || this.expiresAt > now);
};

// Method to mark as read by user
AnnouncementSchema.methods.markAsRead = function(userId) {
  const existingRead = this.readBy.find(r => r.user.toString() === userId.toString());
  if (!existingRead) {
    this.readBy.push({ user: userId, readAt: new Date() });
    this.stats.totalReadUsers = this.readBy.length;
    this.stats.readRate = ((this.stats.totalReadUsers / this.stats.totalTargetUsers) * 100).toFixed(1);
    return this.save();
  }
  return Promise.resolve(this);
};

// Static method to get active announcements for a user role
AnnouncementSchema.statics.getActiveForRole = function(role) {
  const now = new Date();
  return this.find({
    isActive: true,
    scheduledFor: { $lte: now },
    $or: [
      { expiresAt: null },
      { expiresAt: { $gt: now } }
    ],
    $or: [
      { targetRoles: 'all' },
      { targetRoles: role }
    ]
  }).populate('createdBy', 'name email role').sort({ priority: -1, createdAt: -1 });
};

module.exports = mongoose.model('Announcement', AnnouncementSchema);
