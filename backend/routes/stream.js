const express = require('express');
const router = express.Router();
const { getStream } = require('../controllers/streamController');

router.get('/:title/:episode', getStream);

module.exports = router;
