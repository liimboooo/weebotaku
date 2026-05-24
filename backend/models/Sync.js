const mongoose = require('mongoose');

const SyncSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  service: {
    type: String,
    enum: ['mal', 'anilist'],
    required: true,
  },
  accessToken: {
    type: String,
    required: true,
  },
  refreshToken: {
    type: String,
    default: '',
  },
  expiresAt: {
    type: Date,
  },
  lastSynced: {
    type: Date,
  },
  syncStatus: {
    type: String,
    enum: ['synced', 'syncing', 'failed', 'disconnected'],
    default: 'synced',
  },
  lastError: {
    type: String,
    default: '',
  },
  username: {
    type: String,
    default: '',
  },
  autoSync: {
    type: Boolean,
    default: false,
  },
}, { timestamps: true });

SyncSchema.index({ userId: 1, service: 1 }, { unique: true });

module.exports = mongoose.model('Sync', SyncSchema);
