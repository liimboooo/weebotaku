const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const xss = require('xss');
const ChatRoom = require('./models/ChatRoom');
const Message = require('./models/Message');
const User = require('./models/User');

function initSocket(httpServer) {
  const allowedOrigins = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map(s => s.trim()).filter(Boolean)
    : [];

  const io = new Server(httpServer, {
    cors: {
      origin: allowedOrigins.length > 0 ? allowedOrigins : true,
      credentials: true,
    },
    pingTimeout: 60000,
    maxHttpBufferSize: 1e6,
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error('Authentication required'));
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.id;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', async (socket) => {
    const user = await User.findById(socket.userId).select('username avatar').lean();
    if (!user) return socket.disconnect();

    socket.userData = { _id: socket.userId, username: user.username, avatar: user.avatar };

    socket.on('join_room', async (roomId) => {
      const room = await ChatRoom.findById(roomId);
      if (!room || !room.isActive) return;

      socket.join(roomId);
      socket.currentRoom = roomId;

      if (!room.members.some(m => m.toString() === socket.userId)) {
        room.members.push(socket.userId);
        await room.save();
      }

      socket.to(roomId).emit('user_joined', {
        user: socket.userData,
        roomId,
      });

      const members = await ChatRoom.findById(roomId)
        .select('members')
        .populate('members', 'username avatar')
        .lean();
      io.to(roomId).emit('room_members', {
        roomId,
        members: members?.members || [],
      });
    });

    socket.on('leave_room', (roomId) => {
      socket.leave(roomId);
      socket.currentRoom = null;
      socket.to(roomId).emit('user_left', {
        user: socket.userData,
        roomId,
      });
    });

    socket.on('send_message', async (data) => {
      const { roomId, type, mediaUrl } = data;
      const body = typeof data.body === 'string' ? xss(data.body.trim()) : '';
      if (!body || !roomId) return;

      const room = await ChatRoom.findById(roomId);
      if (!room || !room.isActive) return;

      const message = await Message.create({
        roomId,
        user: socket.userId,
        body: body.slice(0, 2000),
        type: type || 'text',
        mediaUrl: mediaUrl || null,
      });

      room.lastMessageAt = new Date();
      await room.save();

      const populated = await Message.findById(message._id)
        .populate('user', 'username avatar')
        .lean();

      io.to(roomId).emit('new_message', populated);
    });

    socket.on('typing', (roomId) => {
      socket.to(roomId).emit('user_typing', {
        user: socket.userData,
        roomId,
      });
    });

    socket.on('stop_typing', (roomId) => {
      socket.to(roomId).emit('user_stop_typing', {
        user: socket.userData,
        roomId,
      });
    });

    socket.on('disconnect', () => {
      if (socket.currentRoom) {
        socket.to(socket.currentRoom).emit('user_left', {
          user: socket.userData,
          roomId: socket.currentRoom,
        });
      }
    });
  });

  return io;
}

module.exports = initSocket;
