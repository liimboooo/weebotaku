const mongoose = require('mongoose');

const ReviewSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  animeId: {
    type: Number,
    required: [true, 'Please provide an anime ID'],
  },
  rating: {
    type: Number,
    required: [true, 'Please provide a rating'],
    min: 1,
    max: 10,
  },
  title: {
    type: String,
    required: [true, 'Please provide a review title'],
    trim: true,
    maxlength: 200,
  },
  content: {
    type: String,
    required: [true, 'Please provide review content'],
    maxlength: 5000,
  },
  isSpoiler: {
    type: Boolean,
    default: false,
  },
  likes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }],
  helpful: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }],
  replies: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    content: { type: String, required: true, maxlength: 2000 },
    createdAt: { type: Date, default: Date.now },
  }],
}, { timestamps: true });

ReviewSchema.index({ user: 1, animeId: 1 }, { unique: true });
ReviewSchema.index({ animeId: 1, createdAt: -1 });

module.exports = mongoose.model('Review', ReviewSchema);
