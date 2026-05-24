const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  type: {
    type: String,
    enum: ['episode', 'reply', 'friend_activity', 'mention', 'system'],
    default: 'system',
  },
  title: {
    type: String,
    required: true,
    maxlength: 200,
  },
  body: {
    type: String,
    required: true,
    maxlength: 500,
  },
  link: {
    type: String,
    default: null,
  },
  imageUrl: {
    type: String,
    default: null,
  },
  read: {
    type: Boolean,
    default: false,
  },
  sentViaPush: {
    type: Boolean,
    default: false,
  },
}, { timestamps: true });

NotificationSchema.index({ userId: 1, createdAt: -1 });
NotificationSchema.index({ userId: 1, read: 1 });

module.exports = mongoose.model('Notification', NotificationSchema);
