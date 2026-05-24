const webpush = require('web-push');
const PushSubscription = require('../models/PushSubscription');
const Notification = require('../models/Notification');

const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
const vapidEmail = process.env.VAPID_EMAIL || 'mailto:admin@animewch.com';

if (vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails(vapidEmail, vapidPublicKey, vapidPrivateKey);
}

async function subscribe(userId, subscription, userAgent) {
  const { endpoint, keys } = subscription;
  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    throw new Error('Invalid push subscription data');
  }

  const existing = await PushSubscription.findOne({ userId, endpoint });
  if (existing) {
    existing.keys = keys;
    existing.isActive = true;
    existing.userAgent = userAgent || existing.userAgent;
    existing.lastUsedAt = new Date();
    await existing.save();
    return existing;
  }

  return PushSubscription.create({
    userId,
    endpoint,
    keys,
    userAgent: userAgent || '',
  });
}

async function unsubscribe(userId, endpoint) {
  return PushSubscription.deleteOne({ userId, endpoint });
}

async function sendToUser(userId, { title, body, link, imageUrl, type = 'system' }) {
  const notification = await Notification.create({
    userId,
    type,
    title,
    body,
    link,
    imageUrl,
    sentViaPush: false,
  });

  if (!vapidPublicKey || !vapidPrivateKey) {
    return notification;
  }

  const subscriptions = await PushSubscription.find({ userId, isActive: true });
  if (subscriptions.length === 0) return notification;

  const payload = JSON.stringify({
    title,
    body,
    link,
    imageUrl,
    type,
    notificationId: notification._id,
  });

  const results = await Promise.allSettled(
    subscriptions.map(sub =>
      webpush.sendNotification(
        { endpoint: sub.endpoint, keys: sub.keys },
        payload
      ).then(() => {
        sub.lastUsedAt = new Date();
        return sub.save();
      })
    )
  );

  let pushSent = false;
  for (let i = 0; i < results.length; i++) {
    if (results[i].status === 'fulfilled') {
      pushSent = true;
    } else {
      const err = results[i].reason;
      if (err?.statusCode === 410 || err?.statusCode === 404) {
        await PushSubscription.deleteOne({ _id: subscriptions[i]._id });
      }
    }
  }

  if (pushSent) {
    notification.sentViaPush = true;
    await notification.save();
  }

  return notification;
}

async function sendToMultiple(userIds, { title, body, link, imageUrl, type = 'system' }) {
  return Promise.allSettled(
    userIds.map(userId => sendToUser(userId, { title, body, link, imageUrl, type }))
  );
}

async function sendToAll({ title, body, link, type = 'system' }) {
  const subscriptions = await PushSubscription.find({ isActive: true }).distinct('userId');
  return sendToMultiple(subscriptions, { title, body, link, type });
}

async function getSubscriptionCount(userId) {
  return PushSubscription.countDocuments({ userId, isActive: true });
}

module.exports = {
  subscribe,
  unsubscribe,
  sendToUser,
  sendToMultiple,
  sendToAll,
  getSubscriptionCount,
};
