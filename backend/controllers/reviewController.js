const Review = require('../models/Review');
const Notification = require('../models/Notification');
const { emitNotification } = require('./notifyHelper');

exports.createReview = async (req, res) => {
  try {
    const { animeId, rating, title, content, isSpoiler } = req.body;

    if (!animeId || !rating || !title || !content) {
      return res.status(400).json({ success: false, message: 'Please provide animeId, rating, title, and content' });
    }

    const existing = await Review.findOne({ user: req.user.id, animeId });
    if (existing) {
      return res.status(400).json({ success: false, message: 'You already reviewed this' });
    }

    const review = await Review.create({
      user: req.user.id,
      animeId,
      rating,
      title,
      content,
      isSpoiler: isSpoiler || false,
    });

    await review.populate('user', 'username avatar');

    res.status(201).json({ success: true, data: review });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: 'You already reviewed this' });
    }
    console.error('CreateReview error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.getReviews = async (req, res) => {
  try {
    const { type, id } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const sort = req.query.sort || 'recent';

    const query = { animeId: parseInt(id) };

    let sortObj;
    switch (sort) {
      case 'most_liked': sortObj = { likes: -1, createdAt: -1 }; break;
      case 'most_helpful': sortObj = { helpful: -1, createdAt: -1 }; break;
      case 'highest': sortObj = { rating: -1, createdAt: -1 }; break;
      case 'lowest': sortObj = { rating: 1, createdAt: -1 }; break;
      default: sortObj = { createdAt: -1 };
    }

    const [reviews, total] = await Promise.all([
      Review.find(query)
        .populate('user', 'username avatar')
        .populate('replies.user', 'username avatar')
        .sort(sortObj)
        .skip(skip)
        .limit(limit),
      Review.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: reviews,
      page,
      pages: Math.ceil(total / limit),
      total,
    });
  } catch (error) {
    console.error('GetReviews error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.updateReview = async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);
    if (!review) {
      return res.status(404).json({ success: false, message: 'Review not found' });
    }
    if (review.user.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    const { rating, title, content, isSpoiler } = req.body;
    if (rating !== undefined) review.rating = rating;
    if (title !== undefined) review.title = title;
    if (content !== undefined) review.content = content;
    if (isSpoiler !== undefined) review.isSpoiler = isSpoiler;
    await review.save();

    await review.populate('user', 'username avatar');
    res.json({ success: true, data: review });
  } catch (error) {
    console.error('UpdateReview error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.markHelpful = async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);
    if (!review) {
      return res.status(404).json({ success: false, message: 'Review not found' });
    }

    const idx = review.helpful.indexOf(req.user.id);
    if (idx > -1) {
      review.helpful.splice(idx, 1);
    } else {
      review.helpful.push(req.user.id);
    }

    await review.save();
    res.json({ success: true, data: review, marked: idx === -1 });
  } catch (error) {
    console.error('MarkHelpful error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.addReply = async (req, res) => {
  try {
    const { content } = req.body;
    if (!content) {
      return res.status(400).json({ success: false, message: 'Reply content required' });
    }

    const review = await Review.findById(req.params.id);
    if (!review) {
      return res.status(404).json({ success: false, message: 'Review not found' });
    }

    review.replies.push({ user: req.user.id, content });
    await review.save();

    await review.populate('user', 'username avatar');
    await review.populate('replies.user', 'username avatar');
    res.status(201).json({ success: true, data: review });
  } catch (error) {
    console.error('AddReply error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.likeReview = async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);
    if (!review) {
      return res.status(404).json({ success: false, message: 'Review not found' });
    }

    const idx = review.likes.indexOf(req.user.id);
    const wasLiked = idx > -1;
    if (wasLiked) {
      review.likes.splice(idx, 1);
    } else {
      review.likes.push(req.user.id);
    }

    await review.save();

    if (!wasLiked && review.user.toString() !== req.user.id) {
      const notif = await Notification.create({
        user: review.user,
        type: 'review_like',
        title: `${req.user.username} liked your review`,
        body: review.title || review.content?.slice(0, 100) || '',
        link: `/anime/${review.animeId}/info`,
        fromUser: req.user.id,
      });
      emitNotification(review.user, notif);
    }

    res.json({ success: true, data: review, liked: idx === -1 });
  } catch (error) {
    console.error('LikeReview error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.deleteReview = async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);
    if (!review) {
      return res.status(404).json({ success: false, message: 'Review not found' });
    }

    if (review.user.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    await review.deleteOne();
    res.json({ success: true, message: 'Review deleted' });
  } catch (error) {
    console.error('DeleteReview error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
