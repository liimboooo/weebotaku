const mongoose = require('mongoose');

const RoomSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide a room name'],
    trim: true,
    maxlength: [100, 'Room name cannot exceed 100 characters'],
  },
  host: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  sourceUrl: {
    type: String,
    default: '',
  },
  targetAnime: {
    type: String,
    default: '',
  },
  privacy: {
    type: String,
    enum: ['public', 'encrypted', 'followers'],
    default: 'public',
  },
  bitrate: {
    type: Number,
    default: 6000,
  },
  isLive: {
    type: Boolean,
    default: true,
  },
  participants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }],
  participantCount: {
    type: Number,
    default: 0,
  },
  livekitRoom: {
    type: String,
    default: '',
  },
  messages: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    username: String,
    text: String,
    ts: { type: Date, default: Date.now },
  }],
}, {
  timestamps: true,
});

RoomSchema.index({ isLive: 1, createdAt: -1 });

module.exports = mongoose.model('Room', RoomSchema);
