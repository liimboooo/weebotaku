const express = require('express');
const router = express.Router();
const { getTrending, getSeasonal, getUpcoming } = require('../controllers/trendingController');

router.get('/trending', getTrending);
router.get('/seasonal', getSeasonal);
router.get('/upcoming', getUpcoming);

module.exports = router;
