const express = require('express');
const router = express.Router();
const {
  getWatchlist, addToWatchlist, removeFromWatchlist,
  updateWatchHistory, getWatchHistory,
  rateAnime, getRatings,
  likeAnime, getLikedAnime,
} = require('../controllers/animeController');
const { protect } = require('../middleware/auth');

const API_BASE = 'https://api.jikan.moe/v4';

async function jikanFetch(endpoint) {
  const res = await fetch(`${API_BASE}${endpoint}`);
  if (!res.ok) throw new Error(`Jikan API error: ${res.status}`);
  return res.json();
}

// Proxy: search / list anime
router.get('/', async (req, res) => {
  try {
    const params = new URLSearchParams(req.query).toString();
    const data = await jikanFetch(`/anime${params ? `?${params}` : ''}`);
    res.json({ success: true, data: data.data, pagination: data.pagination });
  } catch (error) {
    console.error('Anime list error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch anime' });
  }
});

// Proxy: trending (currently airing, sorted by score)
router.get('/trending', async (req, res) => {
  try {
    const data = await jikanFetch('/anime?status=airing&order_by=score&sort=desc&limit=20');
    res.json({ success: true, data: data.data });
  } catch (error) {
    console.error('Trending error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch trending' });
  }
});

// Proxy: popular
router.get('/popular', async (req, res) => {
  try {
    const data = await jikanFetch('/top/anime?filter=bypopularity&limit=20');
    res.json({ success: true, data: data.data });
  } catch (error) {
    console.error('Popular error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch popular' });
  }
});

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

// Proxy: anime by ID (must be last — catches all other GET /:id)
router.get('/:id', async (req, res) => {
  try {
    const data = await jikanFetch(`/anime/${req.params.id}/full`);
    res.json({ success: true, data: data.data });
  } catch (error) {
    console.error('Anime detail error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch anime details' });
  }
});

module.exports = router;
