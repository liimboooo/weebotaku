const express = require('express');
const router = express.Router();
const {
  sendRequest, acceptRequest, rejectRequest, removeFriend,
  getFriends, getPendingRequests, getFriendshipStatus,
} = require('../controllers/friendController');
const { protect } = require('../middleware/auth');

router.post('/request', protect, sendRequest);
router.put('/accept/:id', protect, acceptRequest);
router.delete('/reject/:id', protect, rejectRequest);
router.delete('/remove/:userId', protect, removeFriend);
router.get('/list', protect, getFriends);
router.get('/list/:userId', protect, getFriends);
router.get('/pending', protect, getPendingRequests);
router.get('/status/:userId', protect, getFriendshipStatus);

module.exports = router;
