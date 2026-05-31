const express = require('express');
const router = express.Router();
const {
  getTrending,
  getPopular,
  getSeasonal,
  getUpcoming,
  getTopRated,
  getAiring,
  search,
  getById,
  getDetails,
  getCharacters,
  getRecommendations,
  getSchedule,
  getGenres,
  getNewsFeed,
} = require('../controllers/catalogController');

router.get('/trending', getTrending);
router.get('/popular', getPopular);
router.get('/seasonal', getSeasonal);
router.get('/upcoming', getUpcoming);
router.get('/top-rated', getTopRated);
router.get('/airing', getAiring);
router.get('/search', search);
router.get('/genres', getGenres);
router.get('/schedule', getSchedule);
router.get('/news-feed', getNewsFeed);
router.get('/anime/:id', getById);
router.get('/anime/:id/details', getDetails);
router.get('/anime/:id/characters', getCharacters);
router.get('/anime/:id/recommendations', getRecommendations);

module.exports = router;
