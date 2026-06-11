const Comment = require('../models/Comment');
const Notification = require('../models/Notification');
const { emitNotification } = require('./notifyHelper');
const { getIO } = require('../socket');

function broadcastToAnime(animeId, event, data) {
  try {
    const io = getIO();
    if (io) io.to(`anime:${animeId}`).emit(event, data);
  } catch {}
}

function addOwnFlag(comment, uid) {
  const obj = comment.toObject ? comment.toObject() : comment;
  if (!obj.user || (typeof obj.user === 'object' && !obj.user.username)) {
    obj.user = { _id: null, username: 'Deleted User', avatar: '', role: 'user' };
  }
  const uidStr = uid?.toString();
  obj.isOwn = uidStr ? (obj.user?._id?.toString() === uidStr) : false;
  const setOwn = (r) => {
    if (!r) return;
    if (!r.user || (typeof r.user === 'object' && !r.user.username)) {
      r.user = { _id: null, username: 'Deleted User', avatar: '', role: 'user' };
    }
    r.isOwn = uidStr ? (r.user?._id?.toString() === uidStr) : false;
    if (r.replies) r.replies.forEach(setOwn);
  };
  if (obj.replies) obj.replies.forEach(setOwn);
  return obj;
}

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
        .populate('replies.replies.user', 'username avatar role')
        .sort({ pinned: -1, ...sortObj })
        .skip(skip)
        .limit(limit),
      Comment.countDocuments(query),
    ]);

    const uid = req.user?.id;
    const hasUser = (arr) => uid ? (arr || []).some(x => x.toString() === uid) : false;

    const data = comments.map(c => {
      const obj = addOwnFlag(c, uid);
      obj.likedByMe = hasUser(obj.likes);
      obj.dislikedByMe = hasUser(obj.dislikes);
      const setFlags = (r) => {
        r.likedByMe = hasUser(r.likes);
        r.dislikedByMe = hasUser(r.dislikes);
        if (r.replies) r.replies.forEach(setFlags);
      };
      if (obj.replies) obj.replies.forEach(setFlags);
      return obj;
    });

    res.json({
      success: true,
      data,
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

    const created = await Comment.create({
      user: req.user.id,
      animeId: parseInt(animeId),
      episode: episode || null,
      content: content.trim(),
      isSpoiler: isSpoiler || false,
    });

    // Re-query with query-level populate (reliable) so the author is filled in
    const comment = await Comment.findById(created._id)
      .populate('user', 'username avatar role')
      .populate('replies.user', 'username avatar role')
      .populate('replies.replies.user', 'username avatar role');

    const withOwn = addOwnFlag(comment, req.user.id);

    broadcastToAnime(comment.animeId, 'new-comment', {
      action: 'created',
      comment: withOwn,
    });

    res.status(201).json({ success: true, data: withOwn });
  } catch (error) {
    console.error('CreateComment error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.likeComment = async (req, res) => {
  try {
    let comment = await Comment.findById(req.params.id);
    if (!comment) {
      comment = await Comment.findOne({ 'replies._id': req.params.id });
      if (comment) { req.params.replyId = req.params.id; return exports.likeReply(req, res); }
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
        link: `/anime/${comment.animeId}?comment=${comment._id}`,
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
    let comment = await Comment.findById(req.params.id);
    if (!comment) {
      comment = await Comment.findOne({ 'replies._id': req.params.id });
      if (comment) { req.params.replyId = req.params.id; return exports.dislikeReply(req, res); }
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
    const { content, isSpoiler } = req.body;
    if (!content || !content.trim()) {
      return res.status(400).json({ success: false, message: 'Reply content is required' });
    }

    let comment = await Comment.findById(req.params.id);
    let notifyUser = null;
    let parentCommentId = null;

    if (comment) {
      // Replying to a top-level comment
      comment.replies.push({
        user: req.user.id,
        content: content.trim(),
        isSpoiler: isSpoiler || false,
      });
      notifyUser = comment.user;
      parentCommentId = comment._id;
    } else {
      // Try depth 1 — replying to a reply
      comment = await Comment.findOne({ 'replies._id': req.params.id });
      if (comment) {
        const parentReply = comment.replies.id(req.params.id);
        if (!parentReply) return res.status(404).json({ success: false, message: 'Reply not found' });
        parentReply.replies.push({
          user: req.user.id,
          content: content.trim(),
          isSpoiler: isSpoiler || false,
        });
        notifyUser = parentReply.user;
        parentCommentId = comment._id;
      } else {
        // Try depth 2 — replying to a nested reply
        comment = await Comment.findOne({ 'replies.replies._id': req.params.id });
        if (!comment) return res.status(404).json({ success: false, message: 'Comment or reply not found' });

        const parentReply = comment.replies.find(r =>
          r.replies && r.replies.id(req.params.id)
        );
        if (!parentReply) return res.status(404).json({ success: false, message: 'Reply not found' });

        parentReply.replies.push({
          user: req.user.id,
          content: content.trim(),
          isSpoiler: isSpoiler || false,
        });
        notifyUser = parentReply.user;
        parentCommentId = comment._id;
      }
    }

    await comment.save();

    const populated = await Comment.findById(comment._id)
      .populate('user', 'username avatar role')
      .populate('replies.user', 'username avatar role')
      .populate('replies.replies.user', 'username avatar role');

    const withOwn = addOwnFlag(populated, req.user.id);

    if (notifyUser && notifyUser.toString() !== req.user.id) {
      const notif = await Notification.create({
        user: notifyUser,
        type: 'comment_reply',
        title: `${req.user.username} replied to your comment`,
        body: content.trim().slice(0, 100),
        link: `/anime/${comment.animeId}?comment=${comment._id}`,
        fromUser: req.user.id,
      });
      emitNotification(notifyUser, notif);
    }

    broadcastToAnime(comment.animeId, 'new-comment', {
      action: 'replied',
      comment: withOwn,
    });

    res.status(201).json({ success: true, data: withOwn });
  } catch (error) {
    console.error('ReplyToComment error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.deleteComment = async (req, res) => {
  try {
    let comment = await Comment.findById(req.params.id);
    if (!comment) {
      comment = await Comment.findOne({ 'replies._id': req.params.id });
      if (comment) { req.params.replyId = req.params.id; return exports.deleteReply(req, res); }
      comment = await Comment.findOne({ 'replies.replies._id': req.params.id });
      if (comment) { req.params.replyId = req.params.id; return exports.deleteReply(req, res); }
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
    let comment = await Comment.findById(req.params.id);
    if (!comment) {
      comment = await Comment.findOne({ 'replies._id': req.params.id });
      if (comment) { req.params.replyId = req.params.id; return exports.editReply(req, res); }
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

    const withOwn = addOwnFlag(comment, req.user.id);
    res.json({ success: true, data: withOwn });
  } catch (error) {
    console.error('EditComment error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

function findReplyAtDepth(comment, replyId) {
  let reply = comment.replies.id(replyId);
  if (reply) return reply;
  for (const r of comment.replies) {
    if (r.replies) {
      reply = r.replies.id(replyId);
      if (reply) return reply;
    }
  }
  return null;
}

exports.likeReply = async (req, res) => {
  try {
    let comment = await Comment.findOne({ 'replies._id': req.params.replyId });
    if (!comment) comment = await Comment.findOne({ 'replies.replies._id': req.params.replyId });
    if (!comment) return res.status(404).json({ success: false, message: 'Reply not found' });

    const reply = findReplyAtDepth(comment, req.params.replyId);
    if (!reply) return res.status(404).json({ success: false, message: 'Reply not found' });

    const userId = req.user.id;
    const likeIdx = reply.likes ? reply.likes.indexOf(userId) : -1;
    if (!reply.likes) reply.likes = [];

    if (likeIdx > -1) {
      reply.likes.splice(likeIdx, 1);
    } else {
      reply.likes.push(userId);
    }

    const dislikeIdx = reply.dislikes ? reply.dislikes.indexOf(userId) : -1;
    if (dislikeIdx > -1) reply.dislikes.splice(dislikeIdx, 1);

    await comment.save();
    res.json({ success: true, likes: reply.likes.length, dislikes: reply.dislikes?.length || 0, liked: likeIdx === -1 });
  } catch (error) {
    console.error('LikeReply error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.dislikeReply = async (req, res) => {
  try {
    let comment = await Comment.findOne({ 'replies._id': req.params.replyId });
    if (!comment) comment = await Comment.findOne({ 'replies.replies._id': req.params.replyId });
    if (!comment) return res.status(404).json({ success: false, message: 'Reply not found' });

    const reply = findReplyAtDepth(comment, req.params.replyId);
    if (!reply) return res.status(404).json({ success: false, message: 'Reply not found' });

    const userId = req.user.id;
    const dislikeIdx = reply.dislikes ? reply.dislikes.indexOf(userId) : -1;
    if (!reply.dislikes) reply.dislikes = [];

    if (dislikeIdx > -1) {
      reply.dislikes.splice(dislikeIdx, 1);
    } else {
      reply.dislikes.push(userId);
    }

    const likeIdx = reply.likes ? reply.likes.indexOf(userId) : -1;
    if (likeIdx > -1) reply.likes.splice(likeIdx, 1);

    await comment.save();
    res.json({ success: true, likes: reply.likes?.length || 0, dislikes: reply.dislikes.length, disliked: dislikeIdx === -1 });
  } catch (error) {
    console.error('DislikeReply error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.editReply = async (req, res) => {
  try {
    let comment = await Comment.findOne({ 'replies._id': req.params.replyId });
    if (!comment) comment = await Comment.findOne({ 'replies.replies._id': req.params.replyId });
    if (!comment) return res.status(404).json({ success: false, message: 'Reply not found' });

    const reply = findReplyAtDepth(comment, req.params.replyId);
    if (!reply) return res.status(404).json({ success: false, message: 'Reply not found' });

    if (reply.user.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    const { content } = req.body;
    if (content !== undefined) reply.content = content.trim();

    await comment.save();
    await comment.populate('user', 'username avatar role');
    await comment.populate('replies.user', 'username avatar role');
    await comment.populate('replies.replies.user', 'username avatar role');

    const withOwn = addOwnFlag(comment, req.user.id);
    res.json({ success: true, data: withOwn });
  } catch (error) {
    console.error('EditReply error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.deleteReply = async (req, res) => {
  try {
    let comment = await Comment.findOne({ 'replies._id': req.params.replyId });
    if (!comment) comment = await Comment.findOne({ 'replies.replies._id': req.params.replyId });
    if (!comment) return res.status(404).json({ success: false, message: 'Reply not found' });

    const reply = findReplyAtDepth(comment, req.params.replyId);
    if (!reply) return res.status(404).json({ success: false, message: 'Reply not found' });

    if (reply.user.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    const parentReply = comment.replies.id(req.params.replyId);
    if (parentReply) {
      comment.replies.pull({ _id: req.params.replyId });
    } else {
      const grandParent = comment.replies.find(r =>
        r.replies && r.replies.id(req.params.replyId)
      );
      if (grandParent) {
        grandParent.replies.pull({ _id: req.params.replyId });
        comment.markModified('replies');
      }
    }
    await comment.save();

    res.json({ success: true, message: 'Reply deleted' });
  } catch (error) {
    console.error('DeleteReply error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
