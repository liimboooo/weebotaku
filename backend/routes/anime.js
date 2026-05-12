const express = require('express');
const router = express.Router();
const {
  getWatchlist, addToWatchlist, removeFromWatchlist,
  updateWatchHistory, getWatchHistory,
  rateAnime, getRatings,
  likeAnime, getLikedAnime,
} = require('../controllers/animeController');
const { protect } = require('../middleware/auth');

// Watchlist
router.get('/watchlist', protect, getWatchlist);
router.post('/:id/watchlist', protect, addToWatchlist);
router.delete('/:id/watchlist', protect, removeFromWatchlist);

// Watch history
router.get('/history', protect, getWatchHistory);
router.post('/:id/history', protect, updateWatchHistory);

// Ratings
router.get('/ratings', protect, getRatings);
router.post('/:id/rate', protect, rateAnime);

// Likes
router.get('/liked', protect, getLikedAnime);
router.post('/:id/like', protect, likeAnime);

module.exports = router;
