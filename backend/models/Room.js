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
  sourceType: {
    type: String,
    enum: ['anime', 'external'],
    default: 'external',
  },
  animeId: {
    type: Number,
    default: null,
  },
  animeSlug: {
    type: String,
    default: '',
  },
  animeImage: {
    type: String,
    default: '',
  },
  currentEpisode: {
    type: Number,
    default: 1,
  },
  totalEpisodes: {
    type: Number,
    default: 0,
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
  playbackStartedAt: {
    type: Date,
    default: () => new Date(Date.now() + 5000),
  },
  currentTime: {
    type: Number,
    default: 0,
  },
  positionUpdatedAt: {
    type: Date,
    default: null,
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
RoomSchema.index({ isLive: 1, privacy: 1, createdAt: -1 });
RoomSchema.index({ participants: 1 });
RoomSchema.index({ host: 1 });
RoomSchema.index({ livekitRoom: 1 });

module.exports = mongoose.model('Room', RoomSchema);
