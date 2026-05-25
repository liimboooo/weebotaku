const Notification = require('../models/Notification');

exports.getNotifications = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const notifications = await Notification.find({ user: req.user.id })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('fromUser', 'username avatar');
    const unreadCount = await Notification.countDocuments({ user: req.user.id, read: false });
    res.json({ success: true, data: notifications, unreadCount });
  } catch (error) {
    console.error('GetNotifications error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.markRead = async (req, res) => {
  try {
    await Notification.findOneAndUpdate({ _id: req.params.id, user: req.user.id }, { read: true });
    res.json({ success: true });
  } catch (error) {
    console.error('MarkRead error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.markAllRead = async (req, res) => {
  try {
    await Notification.updateMany({ user: req.user.id, read: false }, { read: true });
    res.json({ success: true });
  } catch (error) {
    console.error('MarkAllRead error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.clearNotifications = async (req, res) => {
  try {
    await Notification.deleteMany({ user: req.user.id });
    res.json({ success: true });
  } catch (error) {
    console.error('ClearNotifications error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.createNotification = async ({ userId, type, title, body, link, fromUserId }) => {
  try {
    return await Notification.create({ user: userId, type, title, body, link, fromUser: fromUserId });
  } catch (error) {
    console.error('CreateNotification error:', error);
    return null;
  }
};
