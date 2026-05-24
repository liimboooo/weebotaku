const express = require('express');
const router = express.Router();
const {
  getRooms, getRoom, createRoom, updateRoom, deleteRoom,
  joinRoom, leaveRoom, getMessages, sendMessage,
} = require('../controllers/chatController');
const { protect } = require('../middleware/auth');

router.get('/rooms', protect, getRooms);
router.post('/rooms', protect, createRoom);
router.get('/rooms/:id', protect, getRoom);
router.put('/rooms/:id', protect, updateRoom);
router.delete('/rooms/:id', protect, deleteRoom);
router.post('/rooms/:id/join', protect, joinRoom);
router.post('/rooms/:id/leave', protect, leaveRoom);
router.get('/rooms/:id/messages', protect, getMessages);
router.post('/rooms/:id/messages', protect, sendMessage);

module.exports = router;
