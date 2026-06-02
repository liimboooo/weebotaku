const express = require('express');
const router = express.Router();
const { getWatch, incrementViews } = require('../controllers/watchController');

// GET /api/watch/:id - fetch metadata + recommendations
router.get('/:id', getWatch);

// POST /api/watch/:id/views - increment view count
router.post('/:id/views', incrementViews);

module.exports = router;
