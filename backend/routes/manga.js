const express = require('express');
const router = express.Router();
const { getReadlist, addToReadlist, removeFromReadlist } = require('../controllers/animeController');
const { protect } = require('../middleware/auth');

// Readlist
router.get('/readlist', protect, getReadlist);
router.post('/:id/list', protect, addToReadlist);
router.delete('/:id/list', protect, removeFromReadlist);

module.exports = router;
