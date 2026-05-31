const express = require('express');
const router = express.Router();
const {
  searchAnime,
  getEpisodes,
  getSources,
  autoSources,
  streamProxy,
  searchReanime,
  getReanimeEpisodes,
  getReanimeStreamUrls,
  testProviders,
} = require('../controllers/streamController');

router.get('/test-providers', testProviders);
router.get('/search', searchAnime);
router.get('/episodes/:anilistId', getEpisodes);
router.get('/sources/:anilistId/:provider/:category/:episodeNum', getSources);
router.get('/auto/:anilistId/:episodeNum', autoSources);
router.get('/proxy', streamProxy);
router.get('/reanime/search', searchReanime);
router.get('/reanime/episodes/:slug', getReanimeEpisodes);
router.get('/reanime/stream', getReanimeStreamUrls);

module.exports = router;
