const express = require('express');
const router = express.Router();
const { getStream, testProviders } = require('../controllers/streamController');

router.get('/test-providers', testProviders);
router.get('/:title/:episode', getStream);

module.exports = router;
