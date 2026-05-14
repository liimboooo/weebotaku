const express = require('express');
const router = express.Router();
const {
  createRoom,
  getRooms,
  getRoomById,
  getToken,
  endRoom,
  updateParticipantCount,
} = require('../controllers/roomController');
const { protect, optionalAuth } = require('../middleware/auth');

router.post('/', protect, createRoom);
router.get('/', getRooms);
router.get('/:id', getRoomById);
router.post('/:id/token', protect, getToken);
router.put('/:id/end', protect, endRoom);
router.put('/:id/participants', updateParticipantCount);

module.exports = router;
