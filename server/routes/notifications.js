const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification');
const protect = require('../middleware/authMiddleware');

// @route   GET /api/notifications
// @desc    Get all notifications for current user
router.get('/', protect, async (req, res) => {
  try {
    // Fetch notifications for user (logging disabled to reduce console spam)
    const notifications = await Notification.find({ user: req.user.id }).sort({ createdAt: -1 });
    res.json(notifications);
  } catch (err) {
    console.error('Error fetching notifications:', err);
    res.status(500).json({ message: 'Server error fetching notifications' });
  }
});

// @route   POST /api/notifications
// @desc    Create a new notification
router.post('/', protect, async (req, res) => {
  try {
    const { title, message, type, category, data } = req.body;
    
    console.log('📬 Creating notification for user:', req.user.id);
    console.log('📬 Notification data:', { title, message, type, category });
    
    const notification = new Notification({
      user: req.user.id,
      title,
      message,
      type: type || 'info',
      category: category || 'general',
      data: data || {}
    });
    
    await notification.save();
    console.log('📬 Notification created:', notification._id);
    
    res.status(201).json({
      message: 'Notification created successfully',
      notification
    });
  } catch (err) {
    console.error('Error creating notification:', err);
    res.status(500).json({ message: 'Server error creating notification' });
  }
});

// @route   PUT /api/notifications/mark-read
// @desc    Mark all notifications as read for current user
router.put('/mark-read', protect, async (req, res) => {
  try {
    await Notification.updateMany({ user: req.user.id, read: false }, { $set: { read: true } });
    res.json({ message: 'All notifications marked as read' });
  } catch (err) {
    console.error('Error marking notifications as read:', err);
    res.status(500).json({ message: 'Server error marking notifications as read' });
  }
});

// @route   PUT /api/notifications/:id/read
// @desc    Mark a specific notification as read
router.put('/:id/read', protect, async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, user: req.user.id },
      { $set: { read: true } },
      { new: true }
    );
    
    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }
    
    res.json({ message: 'Notification marked as read', notification });
  } catch (err) {
    console.error('Error marking notification as read:', err);
    res.status(500).json({ message: 'Server error marking notification as read' });
  }
});

// @route   DELETE /api/notifications/:id
// @desc    Delete a specific notification
router.delete('/:id', protect, async (req, res) => {
  try {
    const notification = await Notification.findOneAndDelete({
      _id: req.params.id,
      user: req.user.id
    });
    
    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }
    
    res.json({ message: 'Notification deleted successfully' });
  } catch (err) {
    console.error('Error deleting notification:', err);
    res.status(500).json({ message: 'Server error deleting notification' });
  }
});

// @route   GET /api/notifications/unread/count
// @desc    Get count of unread notifications
router.get('/unread/count', protect, async (req, res) => {
  try {
    const count = await Notification.countDocuments({ user: req.user.id, read: false });
    res.json({ count });
  } catch (err) {
    console.error('Error getting unread notification count:', err);
    res.status(500).json({ message: 'Server error getting notification count' });
  }
});

module.exports = router;
