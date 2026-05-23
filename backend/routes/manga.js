const express = require('express');
const router = express.Router();
const { getReadlist, addToReadlist, removeFromReadlist } = require('../controllers/animeController');
const { protect } = require('../middleware/auth');

const MANGADEX_BASE = process.env.MANGADEX_API_URL || 'https://api.mangadex.org';

async function mangaFetch(path) {
  const res = await fetch(`${MANGADEX_BASE}${path}`);
  if (!res.ok) throw new Error(`MangaDex API error: ${res.status}`);
  return res.json();
}

// Proxy: search / list manga
router.get('/', async (req, res) => {
  try {
    const params = new URLSearchParams(req.query).toString();
    const data = await mangaFetch(`/manga${params ? `?${params}` : ''}`);
    res.json({ success: true, data: data.data });
  } catch (error) {
    console.error('Manga list error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch manga' });
  }
});

// Proxy: popular manga
router.get('/popular', async (req, res) => {
  try {
    const data = await mangaFetch('/manga?limit=20&order[rating]=desc&includes[]=cover_art');
    res.json({ success: true, data: data.data });
  } catch (error) {
    console.error('Popular manga error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch popular manga' });
  }
});

// Readlist
router.get('/readlist', protect, getReadlist);
router.post('/:id/list', protect, addToReadlist);
router.delete('/:id/list', protect, removeFromReadlist);

// Proxy: manga by ID (must be last)
router.get('/:id', async (req, res) => {
  try {
    const data = await mangaFetch(`/manga/${req.params.id}?includes[]=cover_art&includes[]=author`);
    res.json({ success: true, data: data.data });
  } catch (error) {
    console.error('Manga detail error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch manga details' });
  }
});

module.exports = router;
