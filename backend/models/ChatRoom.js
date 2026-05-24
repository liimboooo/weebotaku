const mongoose = require('mongoose');

const ChatRoomSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Room name required'],
    trim: true,
    maxlength: 100,
  },
  description: {
    type: String,
    default: '',
    maxlength: 500,
  },
  type: {
    type: String,
    enum: ['public', 'private', 'anime_specific'],
    default: 'public',
  },
  animeId: {
    type: Number,
    default: null,
  },
  creator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  members: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }],
  isActive: {
    type: Boolean,
    default: true,
  },
  lastMessageAt: {
    type: Date,
    default: Date.now,
  },
}, { timestamps: true });

ChatRoomSchema.index({ isActive: 1, lastMessageAt: -1 });
ChatRoomSchema.index({ type: 1 });

module.exports = mongoose.model('ChatRoom', ChatRoomSchema);
