const ChatRoom = require('../models/ChatRoom');
const Message = require('../models/Message');

// @route   GET /api/chat/rooms
exports.getRooms = async (req, res) => {
  try {
    const { type } = req.query;
    const query = { isActive: true };
    if (type) query.type = type;

    const rooms = await ChatRoom.find(query)
      .populate('creator', 'username avatar')
      .sort({ lastMessageAt: -1 })
      .limit(50);

    res.json({ success: true, data: rooms });
  } catch (error) {
    console.error('GetChatRooms error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @route   GET /api/chat/rooms/:id
exports.getRoom = async (req, res) => {
  try {
    const room = await ChatRoom.findById(req.params.id)
      .populate('creator', 'username avatar')
      .populate('members', 'username avatar');

    if (!room) {
      return res.status(404).json({ success: false, message: 'Room not found' });
    }

    const messages = await Message.find({ roomId: room._id })
      .populate('user', 'username avatar')
      .sort({ createdAt: -1 })
      .limit(50);

    res.json({
      success: true,
      data: {
        room,
        messages: messages.reverse(),
      },
    });
  } catch (error) {
    console.error('GetChatRoom error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @route   POST /api/chat/rooms
exports.createRoom = async (req, res) => {
  try {
    const { name, description, type, animeId } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, message: 'Room name required' });
    }

    const room = await ChatRoom.create({
      name,
      description: description || '',
      type: type || 'public',
      animeId: animeId || null,
      creator: req.user.id,
      members: [req.user.id],
    });

    await room.populate('creator', 'username avatar');

    res.status(201).json({ success: true, data: room });
  } catch (error) {
    console.error('CreateChatRoom error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @route   PUT /api/chat/rooms/:id
exports.updateRoom = async (req, res) => {
  try {
    const room = await ChatRoom.findById(req.params.id);
    if (!room) {
      return res.status(404).json({ success: false, message: 'Room not found' });
    }
    if (room.creator.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    const { name, description } = req.body;
    if (name !== undefined) room.name = name;
    if (description !== undefined) room.description = description;
    await room.save();

    res.json({ success: true, data: room });
  } catch (error) {
    console.error('UpdateChatRoom error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @route   DELETE /api/chat/rooms/:id
exports.deleteRoom = async (req, res) => {
  try {
    const room = await ChatRoom.findById(req.params.id);
    if (!room) {
      return res.status(404).json({ success: false, message: 'Room not found' });
    }
    if (room.creator.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    room.isActive = false;
    await room.save();

    res.json({ success: true, message: 'Room deleted' });
  } catch (error) {
    console.error('DeleteChatRoom error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @route   POST /api/chat/rooms/:id/join
exports.joinRoom = async (req, res) => {
  try {
    const room = await ChatRoom.findById(req.params.id);
    if (!room) {
      return res.status(404).json({ success: false, message: 'Room not found' });
    }

    if (!room.members.includes(req.user.id)) {
      room.members.push(req.user.id);
      await room.save();
    }

    res.json({ success: true, joined: true });
  } catch (error) {
    console.error('JoinChatRoom error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @route   POST /api/chat/rooms/:id/leave
exports.leaveRoom = async (req, res) => {
  try {
    const room = await ChatRoom.findById(req.params.id);
    if (!room) {
      return res.status(404).json({ success: false, message: 'Room not found' });
    }

    room.members = room.members.filter(m => m.toString() !== req.user.id);
    await room.save();

    res.json({ success: true, left: true });
  } catch (error) {
    console.error('LeaveChatRoom error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @route   GET /api/chat/rooms/:id/messages
exports.getMessages = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 50, 100);
    const skip = (page - 1) * limit;

    const messages = await Message.find({ roomId: req.params.id })
      .populate('user', 'username avatar')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.json({ success: true, data: messages.reverse() });
  } catch (error) {
    console.error('GetMessages error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @route   POST /api/chat/rooms/:id/messages
exports.sendMessage = async (req, res) => {
  try {
    const { body, type, mediaUrl } = req.body;
    if (!body) {
      return res.status(400).json({ success: false, message: 'Message body required' });
    }

    const room = await ChatRoom.findById(req.params.id);
    if (!room || !room.isActive) {
      return res.status(404).json({ success: false, message: 'Room not found' });
    }

    const message = await Message.create({
      roomId: req.params.id,
      user: req.user.id,
      body,
      type: type || 'text',
      mediaUrl: mediaUrl || null,
    });

    room.lastMessageAt = new Date();
    await room.save();

    await message.populate('user', 'username avatar');

    res.status(201).json({ success: true, data: message });
  } catch (error) {
    console.error('SendMessage error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
