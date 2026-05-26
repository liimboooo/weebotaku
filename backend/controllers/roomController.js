const Room = require('../models/Room');
const Friendship = require('../models/Friendship');
const Notification = require('../models/Notification');
const { AccessToken } = require('livekit-server-sdk');
const { emitNotification } = require('./notifyHelper');

// @route   POST /api/rooms
// @access  Private
exports.createRoom = async (req, res) => {
  try {
    const { name, sourceUrl, targetAnime, privacy, bitrate, inviteUserIds } = req.body;

    const livekitRoom = `room_${Date.now()}`;

    const room = await Room.create({
      name: name || 'Zenith Broadcast',
      host: req.user.id,
      sourceUrl: sourceUrl || '',
      targetAnime: targetAnime || '',
      privacy: privacy || 'public',
      bitrate: bitrate || 6000,
      participants: [req.user.id],
      participantCount: 1,
      livekitRoom,
    });

    await room.populate('host', 'username avatar');

    const directInviteIds = new Set();
    if (Array.isArray(inviteUserIds)) {
      inviteUserIds.forEach(id => { if (id !== req.user.id) directInviteIds.add(id); });
    }
    // legacy single-invite support
    if (req.body.inviteUserId && req.body.inviteUserId !== req.user.id) {
      directInviteIds.add(req.body.inviteUserId);
    }

    res.status(201).json({ success: true, data: room });

    // fire-and-forget: send notifications after response
    const username = req.user.username;
    const userId = req.user.id;

    for (const uid of directInviteIds) {
      Notification.create({
        user: uid,
        type: 'room_invite',
        title: `${username} invited you to watch together`,
        body: `Join "${room.name}"`,
        link: `/watch-together?room=${room._id}`,
        fromUser: userId,
      }).then(notif => emitNotification(uid, notif)).catch(() => {});
    }

    Friendship.find({
      $or: [{ requester: userId }, { recipient: userId }],
      status: 'accepted',
    }).then(friendships => {
      friendships.forEach(f => {
        const friendId = f.requester.toString() === userId
          ? f.recipient.toString()
          : f.requester.toString();
        if (directInviteIds.has(friendId)) return;
        Notification.create({
          user: friendId,
          type: 'room_activity',
          title: `${username} started watching`,
          body: room.targetAnime || room.name,
          link: `/watch-together?room=${room._id}`,
          fromUser: userId,
        }).then(notif => emitNotification(friendId, notif)).catch(() => {});
      });
    }).catch(() => {});
  } catch (error) {
    console.error('CreateRoom error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @route   POST /api/rooms/:id/join
// @access  Private
exports.joinRoom = async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);
    if (!room) return res.status(404).json({ success: false, message: 'Room not found' });
    if (!room.isLive) return res.status(400).json({ success: false, message: 'Room ended' });

    const uid = req.user.id;
    if (!room.participants.some(p => p.toString() === uid)) {
      room.participants.push(uid);
    }
    room.participantCount = room.participants.length;
    await room.save();
    await room.populate('host', 'username avatar');

    res.json({ success: true, data: room });
  } catch (error) {
    console.error('JoinRoom error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @route   POST /api/rooms/:id/leave
// @access  Private
exports.leaveRoom = async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);
    if (!room) return res.status(404).json({ success: false, message: 'Room not found' });

    room.participants = room.participants.filter(p => p.toString() !== req.user.id);
    room.participantCount = room.participants.length;
    await room.save();

    res.json({ success: true, message: 'Left room' });
  } catch (error) {
    console.error('LeaveRoom error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @route   GET /api/rooms/friends-activity
// @access  Private
exports.getFriendsActivity = async (req, res) => {
  try {
    const friendships = await Friendship.find({
      $or: [{ requester: req.user.id }, { recipient: req.user.id }],
      status: 'accepted',
    });

    const friendIds = friendships.map(f =>
      f.requester.toString() === req.user.id ? f.recipient : f.requester
    );

    const activeRooms = await Room.find({
      isLive: true,
      participants: { $in: friendIds },
    })
      .populate('host', 'username avatar')
      .populate('participants', 'username avatar')
      .sort({ createdAt: -1 });

    const friendsInRooms = new Set();
    const roomsWithFriends = activeRooms.map(room => {
      const friends = room.participants.filter(p =>
        friendIds.some(fid => fid.toString() === p._id.toString())
      );
      friends.forEach(f => friendsInRooms.add(f._id.toString()));
      return {
        _id: room._id,
        name: room.name,
        targetAnime: room.targetAnime,
        host: room.host,
        participantCount: room.participantCount,
        privacy: room.privacy,
        sourceUrl: room.sourceUrl,
        bitrate: room.bitrate,
        friends: friends.map(f => ({ _id: f._id, username: f.username, avatar: f.avatar })),
      };
    });

    const User = require('../models/User');
    const allFriends = await User.find(
      { _id: { $in: friendIds } },
      'username avatar'
    ).lean();

    const friendsNotInRooms = allFriends.filter(f => !friendsInRooms.has(f._id.toString()));

    res.json({
      success: true,
      data: {
        watching: roomsWithFriends,
        available: friendsNotInRooms,
      },
    });
  } catch (error) {
    console.error('GetFriendsActivity error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @route   GET /api/rooms
// @access  Public
exports.getRooms = async (req, res) => {
  try {
    const staleThreshold = new Date(Date.now() - 6 * 60 * 60 * 1000);
    await Room.updateMany(
      { isLive: true, createdAt: { $lt: staleThreshold } },
      { isLive: false }
    );

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
    room.participants = [];
    room.participantCount = 0;
    await room.save();

    res.json({ success: true, message: 'Room ended' });
  } catch (error) {
    console.error('EndRoom error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @route   POST /api/rooms/:id/chat
// @access  Private
exports.sendMessage = async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || !text.trim()) return res.status(400).json({ success: false, message: 'Message required' });

    const room = await Room.findById(req.params.id);
    if (!room || !room.isLive) return res.status(404).json({ success: false, message: 'Room not found' });

    const msg = {
      user: req.user.id,
      username: req.user.username,
      text: text.trim().slice(0, 500),
      ts: new Date(),
    };
    room.messages.push(msg);
    if (room.messages.length > 200) room.messages = room.messages.slice(-200);
    await room.save();

    res.status(201).json({ success: true, data: msg });
  } catch (error) {
    console.error('SendMessage error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @route   GET /api/rooms/:id/chat
// @access  Private
exports.getMessages = async (req, res) => {
  try {
    const room = await Room.findById(req.params.id).select('messages');
    if (!room) return res.status(404).json({ success: false, message: 'Room not found' });

    const after = req.query.after ? new Date(req.query.after) : null;
    let msgs = room.messages || [];
    if (after) msgs = msgs.filter(m => new Date(m.ts) > after);

    res.json({ success: true, data: msgs });
  } catch (error) {
    console.error('GetMessages error:', error);
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
