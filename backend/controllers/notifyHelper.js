const { getIO } = require('../socket');

async function emitNotification(userId, notification) {
  try {
    const payload = notification.toObject ? notification.toObject() : notification;
    const io = getIO();
    if (io) {
      io.to(`user:${userId}`).emit('notification', payload);
    }
  } catch {}
}

module.exports = { emitNotification };
