const Room = require('../models/Room');
const Notification = require('../models/Notification');
const { AccessToken } = require('livekit-server-sdk');
const { emitNotification } = require('./notifyHelper');

// @route   POST /api/rooms
// @access  Private
exports.createRoom = async (req, res) => {
  try {
    const { name, sourceUrl, targetAnime, privacy, bitrate, inviteUserId } = req.body;

    const livekitRoom = `room_${Date.now()}`;

    const room = await Room.create({
      name: name || 'Zenith Broadcast',
      host: req.user.id,
      sourceUrl: sourceUrl || '',
      targetAnime: targetAnime || '',
      privacy: privacy || 'public',
      bitrate: bitrate || 6000,
      livekitRoom,
    });

    await room.populate('host', 'username avatar');

    if (inviteUserId && inviteUserId !== req.user.id) {
      const notif = await Notification.create({
        user: inviteUserId,
        type: 'room_invite',
        title: `${req.user.username} invited you to watch together`,
        body: `Join "${room.name}"`,
        link: `/watch-together?room=${room._id}`,
        fromUser: req.user.id,
      });
      emitNotification(inviteUserId, notif);
    }

    res.status(201).json({ success: true, data: room });
  } catch (error) {
    console.error('CreateRoom error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @route   GET /api/rooms
// @access  Public
exports.getRooms = async (req, res) => {
  try {
    const rooms = await Room.find({ isLive: true })
      .populate('host', 'username avatar')
      .sort({ createdAt: -1 })
      .limit(20);

    res.json({ success: true, data: rooms });
  } catch (error) {
    console.error('GetRooms error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @route   GET /api/rooms/:id
// @access  Public
exports.getRoomById = async (req, res) => {
  try {
    const room = await Room.findById(req.params.id)
      .populate('host', 'username avatar');

    if (!room) {
      return res.status(404).json({ success: false, message: 'Room not found' });
    }

    res.json({ success: true, data: room });
  } catch (error) {
    console.error('GetRoomById error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @route   POST /api/rooms/:id/token
// @access  Private
exports.getToken = async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);

    if (!room) {
      return res.status(404).json({ success: false, message: 'Room not found' });
    }

    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;

    if (!apiKey || !apiSecret) {
      return res.status(500).json({ success: false, message: 'LiveKit not configured' });
    }

    const at = new AccessToken(apiKey, apiSecret, {
      identity: req.user.username,
      name: req.user.username,
    });

    at.addGrant({
      room: room.livekitRoom,
      roomJoin: true,
      canPublish: true,
      canSubscribe: true,
    });

    const token = await at.toJwt();

    res.json({
      success: true,
      token,
      livekitUrl: process.env.LIVEKIT_URL,
      roomName: room.livekitRoom,
    });
  } catch (error) {
    console.error('GetToken error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @route   PUT /api/rooms/:id/end
// @access  Private
exports.endRoom = async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);

    if (!room) {
      return res.status(404).json({ success: false, message: 'Room not found' });
    }

    if (room.host.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Only the host can end the room' });
    }

    room.isLive = false;
    await room.save();

    res.json({ success: true, message: 'Room ended' });
  } catch (error) {
    console.error('EndRoom error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @route   PUT /api/rooms/:id/participants
// @access  Public
exports.updateParticipantCount = async (req, res) => {
  try {
    const { count } = req.body;
    const room = await Room.findByIdAndUpdate(
      req.params.id,
      { participantCount: count },
      { new: true }
    );

    if (!room) {
      return res.status(404).json({ success: false, message: 'Room not found' });
    }

    res.json({ success: true, data: room });
  } catch (error) {
    console.error('UpdateParticipantCount error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
