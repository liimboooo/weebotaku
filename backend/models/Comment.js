const mongoose = require('mongoose');

const ReplySchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  content: { type: String, required: true, maxlength: 2000 },
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  createdAt: { type: Date, default: Date.now },
});

const CommentSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  animeId: {
    type: Number,
    required: true,
    index: true,
  },
  episode: {
    type: Number,
    default: null,
  },
  content: {
    type: String,
    required: [true, 'Comment content is required'],
    maxlength: [3000, 'Comment cannot exceed 3000 characters'],
  },
  isSpoiler: {
    type: Boolean,
    default: false,
  },
  pinned: {
    type: Boolean,
    default: false,
  },
  likes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }],
  dislikes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }],
  replies: [ReplySchema],
}, { timestamps: true });

CommentSchema.index({ animeId: 1, episode: 1, createdAt: -1 });

module.exports = mongoose.model('Comment', CommentSchema);
