const express = require('express');
const router = express.Router();
const {
  createReview, getReviews, likeReview, deleteReview,
  updateReview, markHelpful, addReply,
} = require('../controllers/reviewController');
const { protect } = require('../middleware/auth');

router.post('/', protect, createReview);
router.get('/:type/:id', getReviews);
router.put('/:id', protect, updateReview);
router.post('/:id/like', protect, likeReview);
router.post('/:id/helpful', protect, markHelpful);
router.post('/:id/reply', protect, addReply);
router.delete('/:id', protect, deleteReview);

module.exports = router;
