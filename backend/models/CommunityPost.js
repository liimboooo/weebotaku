const mongoose = require('mongoose');

const PostCommentSchema = new mongoose.Schema({
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
  mentions: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }],
  likes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }],
}, { timestamps: true });

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
  type: {
    type: String,
    enum: ['text', 'image', 'video', 'link', 'tier_list'],
    default: 'text',
  },
  category: {
    type: String,
    enum: ['discussion', 'review', 'recommendation', 'meme', 'fanart', 'question', 'other'],
    default: 'discussion',
  },
  mediaData: {
    url: String,
    alt: String,
    videoId: String,
    platform: String,
    linkTitle: String,
    linkDescription: String,
    linkImage: String,
    tierListId: { type: mongoose.Schema.Types.ObjectId, ref: 'TierList' },
  },
  tags: [String],
  mentions: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }],
  images: [String],
  likes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }],
  comments: [PostCommentSchema],
  views: {
    type: Number,
    default: 0,
  },
  deletedAt: {
    type: Date,
    default: null,
  },
}, { timestamps: true });

CommunityPostSchema.index({ createdAt: -1 });
CommunityPostSchema.index({ category: 1 });
CommunityPostSchema.index({ tags: 1 });
CommunityPostSchema.index({ views: -1 });

module.exports = mongoose.model('CommunityPost', CommunityPostSchema);
