const express = require('express');
const router = express.Router();
const {
  getAll, getFeatured, getByCategory, getById,
  likeNews, createNews, getTrendingNews,
} = require('../controllers/newsController');
const { protect, admin } = require('../middleware/auth');

router.get('/', getAll);
router.get('/featured', getFeatured);
router.get('/trending', getTrendingNews);
router.get('/category/:category', getByCategory);
router.get('/:id', getById);
router.post('/:id/like', protect, likeNews);
router.post('/', protect, admin, createNews);

module.exports = router;
