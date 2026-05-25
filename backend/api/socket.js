const dotenv = require('dotenv');
dotenv.config();

const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const connectDB = require('../config/db');
const Notification = require('../models/Notification');

const io = new Server({
  cors: { origin: true, credentials: true },
  transports: ['websocket', 'polling'],
});

io.use((socket, next) => {
  const token = socket.handshake.auth?.token || socket.handshake.query?.token;
  if (!token) return next(new Error('Auth required'));
  try {
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
  socket.on('disconnect', () => {});
});

module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(200, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    });
    return res.end();
  }

  await connectDB().catch(() => {});

  if (res.socket?.server?.io) {
    res.status(200).json({ success: true, message: 'Socket already initialized' });
    return;
  }

  if (res.socket?.server) {
    io.attach(res.socket.server);
    res.socket.server.io = io;
  }

  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ success: true, message: 'Socket.io ready' }));
};
