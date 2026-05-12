const express = require('express');
const router = express.Router();
const { getAllPosts, createPost, getPostById, likePost, addComment, deletePost } = require('../controllers/communityController');
const { protect } = require('../middleware/auth');

router.get('/', getAllPosts);
router.post('/', protect, createPost);
router.get('/:id', getPostById);
router.post('/:id/like', protect, likePost);
router.post('/:id/comment', protect, addComment);
router.delete('/:id', protect, deletePost);

module.exports = router;
