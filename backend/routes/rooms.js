const express = require('express');
const router = express.Router();
const {
  createRoom,
  getRooms,
  getRoomById,
  getToken,
  endRoom,
  joinRoom,
  leaveRoom,
  getFriendsActivity,
  sendMessage,
  getMessages,
  updateEpisode,
} = require('../controllers/roomController');
const { protect } = require('../middleware/auth');

router.post('/', protect, createRoom);
router.get('/', getRooms);
router.get('/friends-activity', protect, getFriendsActivity);
router.get('/:id', getRoomById);
router.post('/:id/token', protect, getToken);
router.post('/:id/join', protect, joinRoom);
router.post('/:id/leave', protect, leaveRoom);
router.post('/:id/chat', protect, sendMessage);
router.get('/:id/chat', protect, getMessages);
router.put('/:id/end', protect, endRoom);
router.put('/:id/episode', protect, updateEpisode);

module.exports = router;
