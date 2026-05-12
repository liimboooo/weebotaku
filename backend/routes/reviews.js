const express = require('express');
const router = express.Router();
const { createReview, getReviews, likeReview, deleteReview } = require('../controllers/reviewController');
const { protect } = require('../middleware/auth');

router.post('/', protect, createReview);
router.get('/:type/:id', getReviews);
router.post('/:id/like', protect, likeReview);
router.delete('/:id', protect, deleteReview);

module.exports = router;
