const { Server } = require('socket.io');

let io = null;

function getIO() {
  return io;
}

function initIO(httpServer) {
  if (io) return io;

  io = new Server(httpServer, {
    path: '/api/socket',
    cors: {
      origin: true,
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;
    if (!token) return next(new Error('Authentication required'));

    try {
      const jwt = require('jsonwebtoken');
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret_key_change_in_production');
      socket.userId = decoded.id;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    if (socket.userId) {
      socket.join(`user:${socket.userId}`);
    }

    socket.on('join-anime', (animeId) => {
      if (animeId) socket.join(`anime:${animeId}`);
    });

    socket.on('leave-anime', (animeId) => {
      if (animeId) socket.leave(`anime:${animeId}`);
    });

    socket.on('disconnect', () => {});
  });

  return io;
}

module.exports = { initIO, getIO };
