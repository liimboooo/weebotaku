const CommunityPost = require('../models/CommunityPost');
const pushService = require('../services/pushService');

const populateOpts = [
  { path: 'user', select: 'username avatar role' },
  { path: 'comments.user', select: 'username avatar' },
  { path: 'mentions', select: 'username avatar' },
];

// @route   GET /api/community
exports.getAllPosts = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 50);
    const skip = (page - 1) * limit;
    const { category, sort, type } = req.query;

    const query = { deletedAt: null };
    if (category) query.category = category;
    if (type) query.type = type;

    let sortObj = { createdAt: -1 };
    if (sort === 'trending') sortObj = { views: -1, createdAt: -1 };
    if (sort === 'most_liked') sortObj = { 'likes.length': -1, createdAt: -1 };

    const [posts, total] = await Promise.all([
      CommunityPost.find(query)
        .populate(populateOpts)
        .sort(sortObj)
        .skip(skip)
        .limit(limit),
      CommunityPost.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: posts,
      page,
      pages: Math.ceil(total / limit),
      total,
    });
  } catch (error) {
    console.error('GetAllPosts error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @route   GET /api/community/trending
exports.getTrending = async (req, res) => {
  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const posts = await CommunityPost.find({
      deletedAt: null,
      createdAt: { $gte: sevenDaysAgo },
    })
      .populate(populateOpts)
      .sort({ views: -1 })
      .limit(10);

    res.json({ success: true, data: posts });
  } catch (error) {
    console.error('GetTrending error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @route   GET /api/community/hashtag/:tag
exports.getByTag = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 50);
    const skip = (page - 1) * limit;
    const tag = req.params.tag.toLowerCase();

    const query = { deletedAt: null, tags: tag };
    const [posts, total] = await Promise.all([
      CommunityPost.find(query)
        .populate(populateOpts)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      CommunityPost.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: posts,
      page,
      pages: Math.ceil(total / limit),
      total,
    });
  } catch (error) {
    console.error('GetByTag error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @route   POST /api/community
exports.createPost = async (req, res) => {
  try {
    const { title, content, category, type, tags, images, mediaData, mentions } = req.body;

    if (!title || !content) {
      return res.status(400).json({ success: false, message: 'Title and content required' });
    }

    const post = await CommunityPost.create({
      user: req.user.id,
      title,
      content,
      category: category || 'discussion',
      type: type || 'text',
      tags: (tags || []).map(t => t.toLowerCase()),
      images: images || [],
      mediaData: mediaData || {},
      mentions: mentions || [],
    });

    await post.populate(populateOpts);

    if (mentions && mentions.length > 0) {
      for (const userId of mentions) {
        pushService.sendToUser(userId, {
          title: `${req.user.username} mentioned you`,
          body: title,
          link: `/community`,
          type: 'mention',
        }).catch(() => {});
      }
    }

    res.status(201).json({ success: true, data: post });
  } catch (error) {
    console.error('CreatePost error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @route   GET /api/community/:id
exports.getPostById = async (req, res) => {
  try {
    const post = await CommunityPost.findOne({ _id: req.params.id, deletedAt: null })
      .populate(populateOpts);

    if (!post) {
      return res.status(404).json({ success: false, message: 'Post not found' });
    }

    post.views += 1;
    await post.save();

    res.json({ success: true, data: post });
  } catch (error) {
    console.error('GetPostById error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @route   PUT /api/community/:id
exports.updatePost = async (req, res) => {
  try {
    const post = await CommunityPost.findOne({ _id: req.params.id, deletedAt: null });
    if (!post) {
      return res.status(404).json({ success: false, message: 'Post not found' });
    }
    if (post.user.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    const { title, content, category, type, tags, images, mediaData } = req.body;
    if (title !== undefined) post.title = title;
    if (content !== undefined) post.content = content;
    if (category !== undefined) post.category = category;
    if (type !== undefined) post.type = type;
    if (tags !== undefined) post.tags = tags.map(t => t.toLowerCase());
    if (images !== undefined) post.images = images;
    if (mediaData !== undefined) post.mediaData = mediaData;

    await post.save();
    await post.populate(populateOpts);

    res.json({ success: true, data: post });
  } catch (error) {
    console.error('UpdatePost error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @route   DELETE /api/community/:id
exports.deletePost = async (req, res) => {
  try {
    const post = await CommunityPost.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ success: false, message: 'Post not found' });
    }
    if (post.user.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    post.deletedAt = new Date();
    await post.save();
    res.json({ success: true, message: 'Post deleted' });
  } catch (error) {
    console.error('DeletePost error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @route   POST /api/community/:id/like
exports.likePost = async (req, res) => {
  try {
    const post = await CommunityPost.findOne({ _id: req.params.id, deletedAt: null });
    if (!post) {
      return res.status(404).json({ success: false, message: 'Post not found' });
    }

    const idx = post.likes.indexOf(req.user.id);
    const liked = idx === -1;
    if (liked) {
      post.likes.push(req.user.id);
    } else {
      post.likes.splice(idx, 1);
    }

    await post.save();
    res.json({ success: true, liked, likes: post.likes.length });
  } catch (error) {
    console.error('LikePost error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @route   POST /api/community/:id/comment
exports.addComment = async (req, res) => {
  try {
    const { content, mentions } = req.body;
    if (!content) {
      return res.status(400).json({ success: false, message: 'Comment content required' });
    }

    const post = await CommunityPost.findOne({ _id: req.params.id, deletedAt: null });
    if (!post) {
      return res.status(404).json({ success: false, message: 'Post not found' });
    }

    post.comments.push({
      user: req.user.id,
      content,
      mentions: mentions || [],
    });

    await post.save();
    await post.populate(populateOpts);

    const newComment = post.comments[post.comments.length - 1];

    if (post.user.toString() !== req.user.id) {
      pushService.sendToUser(post.user, {
        title: `${req.user.username} commented on your post`,
        body: content.substring(0, 100),
        link: `/community`,
        type: 'reply',
      }).catch(() => {});
    }

    res.status(201).json({ success: true, data: newComment });
  } catch (error) {
    console.error('AddComment error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @route   PUT /api/community/comment/:postId/:commentId
exports.updateComment = async (req, res) => {
  try {
    const { content } = req.body;
    if (!content) {
      return res.status(400).json({ success: false, message: 'Content required' });
    }

    const post = await CommunityPost.findOne({ _id: req.params.postId, deletedAt: null });
    if (!post) {
      return res.status(404).json({ success: false, message: 'Post not found' });
    }

    const comment = post.comments.id(req.params.commentId);
    if (!comment) {
      return res.status(404).json({ success: false, message: 'Comment not found' });
    }
    if (comment.user.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    comment.content = content;
    await post.save();

    res.json({ success: true, data: comment });
  } catch (error) {
    console.error('UpdateComment error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @route   DELETE /api/community/comment/:postId/:commentId
exports.deleteComment = async (req, res) => {
  try {
    const post = await CommunityPost.findOne({ _id: req.params.postId, deletedAt: null });
    if (!post) {
      return res.status(404).json({ success: false, message: 'Post not found' });
    }

    const comment = post.comments.id(req.params.commentId);
    if (!comment) {
      return res.status(404).json({ success: false, message: 'Comment not found' });
    }
    if (comment.user.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    post.comments.pull(req.params.commentId);
    await post.save();

    res.json({ success: true, message: 'Comment deleted' });
  } catch (error) {
    console.error('DeleteComment error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @route   POST /api/community/comment/:postId/:commentId/like
exports.likeComment = async (req, res) => {
  try {
    const post = await CommunityPost.findOne({ _id: req.params.postId, deletedAt: null });
    if (!post) {
      return res.status(404).json({ success: false, message: 'Post not found' });
    }

    const comment = post.comments.id(req.params.commentId);
    if (!comment) {
      return res.status(404).json({ success: false, message: 'Comment not found' });
    }

    const idx = comment.likes.indexOf(req.user.id);
    const liked = idx === -1;
    if (liked) {
      comment.likes.push(req.user.id);
    } else {
      comment.likes.splice(idx, 1);
    }

    await post.save();
    res.json({ success: true, liked, likes: comment.likes.length });
  } catch (error) {
    console.error('LikeComment error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
