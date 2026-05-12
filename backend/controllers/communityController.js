const CommunityPost = require('../models/CommunityPost');

// @route   GET /api/community
// @access  Public
exports.getAllPosts = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const category = req.query.category;

    const query = category ? { category } : {};

    const [posts, total] = await Promise.all([
      CommunityPost.find(query)
        .populate('user', 'username avatar')
        .populate('comments.user', 'username avatar')
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
    console.error('GetAllPosts error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @route   POST /api/community
// @access  Private
exports.createPost = async (req, res) => {
  try {
    const { title, content, category, tags, images } = req.body;

    if (!title || !content) {
      return res.status(400).json({ success: false, message: 'Please provide title and content' });
    }

    const post = await CommunityPost.create({
      user: req.user.id,
      title,
      content,
      category: category || 'discussion',
      tags: tags || [],
      images: images || [],
    });

    await post.populate('user', 'username avatar');

    res.status(201).json({ success: true, data: post });
  } catch (error) {
    console.error('CreatePost error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @route   GET /api/community/:id
// @access  Public
exports.getPostById = async (req, res) => {
  try {
    const post = await CommunityPost.findById(req.params.id)
      .populate('user', 'username avatar')
      .populate('comments.user', 'username avatar');

    if (!post) {
      return res.status(404).json({ success: false, message: 'Post not found' });
    }

    res.json({ success: true, data: post });
  } catch (error) {
    console.error('GetPostById error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @route   POST /api/community/:id/like
// @access  Private
exports.likePost = async (req, res) => {
  try {
    const post = await CommunityPost.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ success: false, message: 'Post not found' });
    }

    const idx = post.likes.indexOf(req.user.id);
    if (idx > -1) {
      post.likes.splice(idx, 1);
    } else {
      post.likes.push(req.user.id);
    }

    await post.save();
    res.json({ success: true, data: post, liked: idx === -1 });
  } catch (error) {
    console.error('LikePost error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @route   POST /api/community/:id/comment
// @access  Private
exports.addComment = async (req, res) => {
  try {
    const { content } = req.body;
    if (!content) {
      return res.status(400).json({ success: false, message: 'Please provide comment content' });
    }

    const post = await CommunityPost.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ success: false, message: 'Post not found' });
    }

    post.comments.push({
      user: req.user.id,
      content,
    });

    await post.save();
    await post.populate('comments.user', 'username avatar');

    res.status(201).json({ success: true, data: post });
  } catch (error) {
    console.error('AddComment error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @route   DELETE /api/community/:id
// @access  Private
exports.deletePost = async (req, res) => {
  try {
    const post = await CommunityPost.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ success: false, message: 'Post not found' });
    }

    if (post.user.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    await post.deleteOne();
    res.json({ success: true, message: 'Post deleted' });
  } catch (error) {
    console.error('DeletePost error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
