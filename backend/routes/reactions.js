const express = require('express');
const router = express.Router();
const { getReactions, toggleLike, toggleDislike } = require('../controllers/reactionController');
const { protect, optionalAuth } = require('../middleware/auth');

router.get('/:animeId', optionalAuth, getReactions);
router.post('/:animeId/like', protect, toggleLike);
router.post('/:animeId/dislike', protect, toggleDislike);

module.exports = router;
