const mongoose = require('mongoose');

const CommentSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  content: {
    type: String,
    required: true,
    maxlength: 2000,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const CommunityPostSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  title: {
    type: String,
    required: [true, 'Please provide a title'],
    trim: true,
    maxlength: 200,
  },
  content: {
    type: String,
    required: [true, 'Please provide content'],
    maxlength: 10000,
  },
  category: {
    type: String,
    enum: ['discussion', 'review', 'recommendation', 'meme', 'fanart', 'question', 'other'],
    default: 'discussion',
  },
  tags: [String],
  images: [String],
  likes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }],
  comments: [CommentSchema],
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

CommunityPostSchema.index({ createdAt: -1 });
CommunityPostSchema.index({ category: 1 });

module.exports = mongoose.model('CommunityPost', CommunityPostSchema);
