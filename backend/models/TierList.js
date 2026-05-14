const mongoose = require('mongoose');

const TierItemSchema = new mongoose.Schema({
  id: { type: String, required: true },
  name: { type: String, required: true },
  image: { type: String, default: '' },
  rating: { type: Number, default: 0 },
  studio: { type: String, default: '' },
  genres: [String],
}, { _id: false });

const TierListSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  title: {
    type: String,
    default: 'My Tier List',
    trim: true,
    maxlength: [100, 'Title cannot exceed 100 characters'],
  },
  description: {
    type: String,
    default: '',
    maxlength: [500, 'Description cannot exceed 500 characters'],
  },
  isPublic: {
    type: Boolean,
    default: true,
  },
  tiers: {
    s: [TierItemSchema],
    a: [TierItemSchema],
    b: [TierItemSchema],
    c: [TierItemSchema],
    d: [TierItemSchema],
  },
  unranked: [TierItemSchema],
}, {
  timestamps: true,
});

TierListSchema.index({ user: 1, createdAt: -1 });
TierListSchema.index({ isPublic: 1, createdAt: -1 });

module.exports = mongoose.model('TierList', TierListSchema);
