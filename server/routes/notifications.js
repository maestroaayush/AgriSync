const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification');
const protect = require('../middleware/authMiddleware');

// Get all notifications for user
router.get('/', protect, async (req, res) => {
  const notes = await Notification.find({ user: req.user.id }).sort({ createdAt: -1 });
  res.json(notes);
});

// Mark all as read
router.put('/mark-read', protect, async (req, res) => {
  await Notification.updateMany({ user: req.user.id, read: false }, { $set: { read: true } });
  res.json({ message: 'All notifications marked as read' });
});

module.exports = router;