const express = require('express');
const router = express.Router();
const {
  getComments, createComment, likeComment, dislikeComment,
  replyToComment, deleteComment, editComment,
  likeReply, dislikeReply, editReply, deleteReply,
} = require('../controllers/commentController');
const { protect, optionalAuth } = require('../middleware/auth');

router.get('/:animeId', getComments);
router.post('/:animeId', protect, createComment);
router.post('/:id/like', protect, likeComment);
router.post('/:id/dislike', protect, dislikeComment);
router.post('/:id/reply', protect, replyToComment);
router.put('/:id', protect, editComment);
router.delete('/:id', protect, deleteComment);
router.post('/reply/:replyId/like', protect, likeReply);
router.post('/reply/:replyId/dislike', protect, dislikeReply);
router.put('/reply/:replyId', protect, editReply);
router.delete('/reply/:replyId', protect, deleteReply);

module.exports = router;
