const express = require('express');
const router = express.Router();
const { createReport, getReports, updateReportStatus } = require('../controllers/reportController');
const { protect, admin, optionalAuth } = require('../middleware/auth');

router.post('/', optionalAuth, createReport);
router.get('/', protect, admin, getReports);
router.put('/:id', protect, admin, updateReportStatus);

module.exports = router;
