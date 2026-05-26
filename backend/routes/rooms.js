const express = require('express');
const router = express.Router();
const {
  createRoom,
  getRooms,
  getRoomById,
  getToken,
  endRoom,
  updateParticipantCount,
  joinRoom,
  leaveRoom,
  getFriendsActivity,
} = require('../controllers/roomController');
const { protect, optionalAuth } = require('../middleware/auth');

router.post('/', protect, createRoom);
router.get('/', getRooms);
router.get('/friends-activity', protect, getFriendsActivity);
router.get('/:id', getRoomById);
router.post('/:id/token', protect, getToken);
router.post('/:id/join', protect, joinRoom);
router.post('/:id/leave', protect, leaveRoom);
router.put('/:id/end', protect, endRoom);
router.put('/:id/participants', updateParticipantCount);

module.exports = router;
