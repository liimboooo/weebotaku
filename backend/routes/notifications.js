const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { admin } = require('../middleware/auth');
const {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  clearAll,
  subscribePush,
  unsubscribePush,
  getPushStatus,
  getVapidKey,
  sendNotification,
} = require('../controllers/notificationController');

router.get('/vapid-key', getVapidKey);

router.get('/', protect, getNotifications);
router.get('/unread-count', protect, getUnreadCount);
router.put('/mark-all-read', protect, markAllAsRead);
router.put('/:id/read', protect, markAsRead);
router.delete('/clear', protect, clearAll);
router.delete('/:id', protect, deleteNotification);

router.post('/push/subscribe', protect, subscribePush);
router.post('/push/unsubscribe', protect, unsubscribePush);
router.get('/push/status', protect, getPushStatus);

router.post('/send', protect, admin, sendNotification);

module.exports = router;
