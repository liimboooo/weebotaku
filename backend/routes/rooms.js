const express = require('express');
const router = express.Router();
const {
  createRoom,
  getRooms,
  getRoomsInit,
  getRoomById,
  getRoomStatus,
  getToken,
  endRoom,
  joinRoom,
  leaveRoom,
  getFriendsActivity,
  sendMessage,
  getMessages,
  updateEpisode,
  syncPlayback,
  updatePosition,
} = require('../controllers/roomController');
const { protect } = require('../middleware/auth');

router.post('/', protect, createRoom);
router.get('/', getRooms);
router.get('/init', protect, getRoomsInit);
router.get('/friends-activity', protect, getFriendsActivity);
router.get('/:id', getRoomById);
router.get('/:id/status', getRoomStatus);
router.post('/:id/token', protect, getToken);
router.post('/:id/join', protect, joinRoom);
router.post('/:id/leave', protect, leaveRoom);
router.post('/:id/chat', protect, sendMessage);
router.get('/:id/chat', protect, getMessages);
router.put('/:id/end', protect, endRoom);
router.put('/:id/episode', protect, updateEpisode);
router.post('/:id/sync', protect, syncPlayback);
router.post('/:id/position', protect, updatePosition);

module.exports = router;
