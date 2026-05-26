const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  type: {
    type: String,
    enum: ['comment_reply', 'comment_like', 'review_like', 'friend_request', 'friend_accepted',
           'friend_online', 'system_update', 'new_feature', 'recommendation', 'room_invite', 'room_activity'],
    required: true,
  },
  title: { type: String, required: true },
  body: { type: String, default: '' },
  link: { type: String, default: null },
  read: { type: Boolean, default: false },
  fromUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
}, { timestamps: true });

notificationSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
