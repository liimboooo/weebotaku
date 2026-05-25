const express = require('express');
const router = express.Router();
const { getNotifications, markRead, markAllRead, clearNotifications } = require('../controllers/notificationController');
const { protect } = require('../middleware/auth');

router.get('/', protect, getNotifications);
router.put('/read/:id', protect, markRead);
router.put('/read-all', protect, markAllRead);
router.delete('/', protect, clearNotifications);

module.exports = router;
