const express = require('express');
const router = express.Router();
const {
  getAllPosts, createPost, getPostById, updatePost, deletePost,
  likePost, addComment, updateComment, deleteComment, likeComment,
  getTrending, getByTag,
} = require('../controllers/communityController');
const { protect } = require('../middleware/auth');

router.get('/', getAllPosts);
router.get('/trending', getTrending);
router.get('/hashtag/:tag', getByTag);
router.post('/', protect, createPost);
router.get('/:id', getPostById);
router.put('/:id', protect, updatePost);
router.delete('/:id', protect, deletePost);
router.post('/:id/like', protect, likePost);
router.post('/:id/comment', protect, addComment);
router.put('/comment/:postId/:commentId', protect, updateComment);
router.delete('/comment/:postId/:commentId', protect, deleteComment);
router.post('/comment/:postId/:commentId/like', protect, likeComment);

module.exports = router;
