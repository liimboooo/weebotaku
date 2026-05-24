const Notification = require('../models/Notification');
const pushService = require('../services/pushService');

// @route   GET /api/notifications
exports.getNotifications = async (req, res) => {
  try {
    const { filter, limit = 50, page = 1 } = req.query;
    const query = { userId: req.user.id };

    if (filter === 'unread') query.read = false;
    else if (filter && filter !== 'all') query.type = filter;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Notification.countDocuments(query);
    const unreadCount = await Notification.countDocuments({ userId: req.user.id, read: false });

    res.json({
      success: true,
      notifications,
      total,
      unreadCount,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
    });
  } catch (error) {
    console.error('GetNotifications error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @route   GET /api/notifications/unread-count
exports.getUnreadCount = async (req, res) => {
  try {
    const count = await Notification.countDocuments({ userId: req.user.id, read: false });
    res.json({ success: true, count });
  } catch (error) {
    console.error('GetUnreadCount error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @route   PUT /api/notifications/:id/read
exports.markAsRead = async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { read: true },
      { new: true }
    );
    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }
    res.json({ success: true, notification });
  } catch (error) {
    console.error('MarkAsRead error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @route   PUT /api/notifications/mark-all-read
exports.markAllAsRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { userId: req.user.id, read: false },
      { read: true }
    );
    res.json({ success: true });
  } catch (error) {
    console.error('MarkAllAsRead error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @route   DELETE /api/notifications/:id
exports.deleteNotification = async (req, res) => {
  try {
    const result = await Notification.deleteOne({ _id: req.params.id, userId: req.user.id });
    if (result.deletedCount === 0) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }
    res.json({ success: true });
  } catch (error) {
    console.error('DeleteNotification error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @route   DELETE /api/notifications/clear
exports.clearAll = async (req, res) => {
  try {
    await Notification.deleteMany({ userId: req.user.id });
    res.json({ success: true });
  } catch (error) {
    console.error('ClearAll error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @route   POST /api/notifications/push/subscribe
exports.subscribePush = async (req, res) => {
  try {
    const { endpoint, keys, userAgent } = req.body;
    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return res.status(400).json({ success: false, message: 'Invalid subscription data' });
    }
    await pushService.subscribe(req.user.id, { endpoint, keys }, userAgent);
    res.json({ success: true });
  } catch (error) {
    console.error('SubscribePush error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @route   POST /api/notifications/push/unsubscribe
exports.unsubscribePush = async (req, res) => {
  try {
    const { endpoint } = req.body;
    if (!endpoint) {
      return res.status(400).json({ success: false, message: 'Endpoint required' });
    }
    await pushService.unsubscribe(req.user.id, endpoint);
    res.json({ success: true });
  } catch (error) {
    console.error('UnsubscribePush error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @route   GET /api/notifications/push/status
exports.getPushStatus = async (req, res) => {
  try {
    const count = await pushService.getSubscriptionCount(req.user.id);
    res.json({
      success: true,
      subscribed: count > 0,
      deviceCount: count,
      vapidPublicKey: process.env.VAPID_PUBLIC_KEY || null,
    });
  } catch (error) {
    console.error('GetPushStatus error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @route   GET /api/notifications/push/vapid-key
exports.getVapidKey = async (req, res) => {
  res.json({
    success: true,
    vapidPublicKey: process.env.VAPID_PUBLIC_KEY || null,
  });
};

// @route   POST /api/notifications/send (admin only)
exports.sendNotification = async (req, res) => {
  try {
    const { userId, userIds, title, body, link, type, broadcast } = req.body;
    if (!title || !body) {
      return res.status(400).json({ success: false, message: 'Title and body required' });
    }

    if (broadcast) {
      await pushService.sendToAll({ title, body, link, type });
      return res.json({ success: true, message: 'Broadcast sent' });
    }

    if (userIds && Array.isArray(userIds)) {
      await pushService.sendToMultiple(userIds, { title, body, link, type });
      return res.json({ success: true, message: `Sent to ${userIds.length} users` });
    }

    if (userId) {
      const notification = await pushService.sendToUser(userId, { title, body, link, type });
      return res.json({ success: true, notification });
    }

    return res.status(400).json({ success: false, message: 'Specify userId, userIds, or broadcast' });
  } catch (error) {
    console.error('SendNotification error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
