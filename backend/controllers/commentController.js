const Comment = require('../models/Comment');
const Notification = require('../models/Notification');
const { emitNotification } = require('./notifyHelper');

exports.getComments = async (req, res) => {
  try {
    const { animeId } = req.params;
    const episode = req.query.episode ? parseInt(req.query.episode) : null;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const sort = req.query.sort || 'newest';
    const skip = (page - 1) * limit;

    const query = { animeId: parseInt(animeId) };
    if (episode !== null) query.episode = episode;

    let sortObj = { createdAt: -1 };
    if (sort === 'oldest') sortObj = { createdAt: 1 };
    if (sort === 'top') sortObj = { likes: -1, createdAt: -1 };

    const [comments, total] = await Promise.all([
      Comment.find(query)
        .populate('user', 'username avatar role')
        .populate('replies.user', 'username avatar role')
        .sort({ pinned: -1, ...sortObj })
        .skip(skip)
        .limit(limit),
      Comment.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: comments,
      page,
      pages: Math.ceil(total / limit),
      total,
    });
  } catch (error) {
    console.error('GetComments error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.createComment = async (req, res) => {
  try {
    const { animeId } = req.params;
    const { content, episode, isSpoiler } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ success: false, message: 'Comment content is required' });
    }

    const comment = await Comment.create({
      user: req.user.id,
      animeId: parseInt(animeId),
      episode: episode || null,
      content: content.trim(),
      isSpoiler: isSpoiler || false,
    });

    await comment.populate('user', 'username avatar role');

    res.status(201).json({ success: true, data: comment });
  } catch (error) {
    console.error('CreateComment error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.likeComment = async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id);
    if (!comment) {
      return res.status(404).json({ success: false, message: 'Comment not found' });
    }

    const userId = req.user.id;
    const likeIdx = comment.likes.indexOf(userId);
    const dislikeIdx = comment.dislikes.indexOf(userId);

    if (dislikeIdx > -1) comment.dislikes.splice(dislikeIdx, 1);

    if (likeIdx > -1) {
      comment.likes.splice(likeIdx, 1);
    } else {
      comment.likes.push(userId);
    }

    const wasLiked = likeIdx > -1;
    await comment.save();

    if (!wasLiked && comment.user.toString() !== req.user.id) {
      const notif = await Notification.create({
        user: comment.user,
        type: 'comment_like',
        title: `${req.user.username} liked your comment`,
        body: comment.content.slice(0, 100),
        link: `/anime/${comment.animeId}/info`,
        fromUser: req.user.id,
      });
      emitNotification(comment.user, notif);
    }

    res.json({ success: true, likes: comment.likes.length, dislikes: comment.dislikes.length, liked: likeIdx === -1 });
  } catch (error) {
    console.error('LikeComment error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.dislikeComment = async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id);
    if (!comment) {
      return res.status(404).json({ success: false, message: 'Comment not found' });
    }

    const userId = req.user.id;
    const likeIdx = comment.likes.indexOf(userId);
    const dislikeIdx = comment.dislikes.indexOf(userId);

    if (likeIdx > -1) comment.likes.splice(likeIdx, 1);

    if (dislikeIdx > -1) {
      comment.dislikes.splice(dislikeIdx, 1);
    } else {
      comment.dislikes.push(userId);
    }

    await comment.save();
    res.json({ success: true, likes: comment.likes.length, dislikes: comment.dislikes.length, disliked: dislikeIdx === -1 });
  } catch (error) {
    console.error('DislikeComment error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.replyToComment = async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id);
    if (!comment) {
      return res.status(404).json({ success: false, message: 'Comment not found' });
    }

    const { content } = req.body;
    if (!content || !content.trim()) {
      return res.status(400).json({ success: false, message: 'Reply content is required' });
    }

    comment.replies.push({
      user: req.user.id,
      content: content.trim(),
    });

    await comment.save();
    await comment.populate('replies.user', 'username avatar role');

    if (comment.user.toString() !== req.user.id) {
      const notif = await Notification.create({
        user: comment.user,
        type: 'comment_reply',
        title: `${req.user.username} replied to your comment`,
        body: content.trim().slice(0, 100),
        link: `/anime/${comment.animeId}/info`,
        fromUser: req.user.id,
      });
      emitNotification(comment.user, notif);
    }

    res.status(201).json({ success: true, data: comment });
  } catch (error) {
    console.error('ReplyToComment error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.deleteComment = async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id);
    if (!comment) {
      return res.status(404).json({ success: false, message: 'Comment not found' });
    }

    if (comment.user.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    await comment.deleteOne();
    res.json({ success: true, message: 'Comment deleted' });
  } catch (error) {
    console.error('DeleteComment error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.editComment = async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id);
    if (!comment) {
      return res.status(404).json({ success: false, message: 'Comment not found' });
    }

    if (comment.user.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    const { content, isSpoiler } = req.body;
    if (content !== undefined) comment.content = content.trim();
    if (isSpoiler !== undefined) comment.isSpoiler = isSpoiler;

    await comment.save();
    await comment.populate('user', 'username avatar role');

    res.json({ success: true, data: comment });
  } catch (error) {
    console.error('EditComment error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
