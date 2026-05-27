const Room = require('../models/Room');
const Friendship = require('../models/Friendship');
const Notification = require('../models/Notification');
const User = require('../models/User');
const { AccessToken } = require('livekit-server-sdk');
const { emitNotification } = require('./notifyHelper');

let lastCleanup = 0;

function notifyRoomEnded(participantIds, hostUsername, roomName) {
  for (const uid of participantIds) {
    Notification.create({
      user: uid,
      type: 'room_ended',
      title: `${hostUsername} ended the room`,
      body: `"${roomName}" has ended`,
    }).then(notif => emitNotification(uid, notif)).catch(() => {});
  }
}

// @route   POST /api/rooms
// @access  Private
exports.createRoom = async (req, res) => {
  try {
    const { name, sourceUrl, sourceType, targetAnime, privacy, bitrate, inviteUserIds, animeId, animeSlug, animeImage, currentEpisode, totalEpisodes } = req.body;

    const livekitRoom = `room_${Date.now()}`;

    const room = await Room.create({
      name: name || 'Zenith Broadcast',
      host: req.user.id,
      sourceUrl: sourceUrl || '',
      sourceType: sourceType || 'external',
      targetAnime: targetAnime || '',
      animeId: animeId || null,
      animeSlug: animeSlug || '',
      animeImage: animeImage || '',
      currentEpisode: currentEpisode || 1,
      totalEpisodes: totalEpisodes || 0,
      privacy: privacy || 'public',
      bitrate: bitrate || 6000,
      participants: [req.user.id],
      participantCount: 1,
      livekitRoom,
    });

    const roomData = room.toObject();
    roomData.host = { _id: req.user._id, username: req.user.username };

    const directInviteIds = new Set();
    if (Array.isArray(inviteUserIds)) {
      inviteUserIds.forEach(id => { if (id !== req.user.id) directInviteIds.add(id); });
    }
    // legacy single-invite support
    if (req.body.inviteUserId && req.body.inviteUserId !== req.user.id) {
      directInviteIds.add(req.body.inviteUserId);
    }

    res.status(201).json({ success: true, data: roomData });

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
    }).lean().then(async (friendships) => {
      const notifs = friendships
        .map(f => {
          const friendId = f.requester.toString() === userId
            ? f.recipient.toString()
            : f.requester.toString();
          if (directInviteIds.has(friendId)) return null;
          return {
            user: friendId,
            type: 'room_activity',
            title: `${username} started watching`,
            body: room.targetAnime || room.name,
            link: `/watch-together?room=${room._id}`,
            fromUser: userId,
          };
        })
        .filter(Boolean);
      if (notifs.length) {
        const created = await Notification.insertMany(notifs);
        created.forEach(n => emitNotification(n.user.toString(), n));
      }
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
    const room = await Room.findById(req.params.id).select('isLive privacy host participants').lean();
    if (!room) return res.status(404).json({ success: false, message: 'Room not found' });
    if (!room.isLive) return res.status(400).json({ success: false, message: 'Room ended' });

    if (room.privacy !== 'public' && room.host.toString() !== req.user.id) {
      const isFriend = await Friendship.exists({
        $or: [
          { requester: room.host, recipient: req.user.id },
          { requester: req.user.id, recipient: room.host },
        ],
        status: 'accepted',
      });
      if (!isFriend) return res.status(403).json({ success: false, message: 'This room is private' });
    }

    const alreadyIn = room.participants.some(p => p.toString() === req.user.id);

    const updated = await Room.findByIdAndUpdate(
      req.params.id,
      {
        $addToSet: { participants: req.user.id },
        ...(alreadyIn ? {} : { $inc: { participantCount: 1 } }),
      },
      { new: true }
    ).populate('host', 'username');

    res.json({ success: true, data: updated });
  } catch (error) {
    console.error('JoinRoom error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @route   POST /api/rooms/:id/leave
// @access  Private
exports.leaveRoom = async (req, res) => {
  try {
    const room = await Room.findById(req.params.id).select('host participants name').lean();
    if (!room) return res.status(404).json({ success: false, message: 'Room not found' });

    const isHostLeaving = room.host.toString() === req.user.id;

    if (isHostLeaving) {
      const participantIds = room.participants
        .map(p => p.toString())
        .filter(id => id !== req.user.id);

      await Room.updateOne(
        { _id: req.params.id },
        { $set: { isLive: false, participants: [], participantCount: 0, messages: [] } }
      );

      res.json({ success: true, message: 'Room ended (host left)' });

      notifyRoomEnded(participantIds, req.user.username, room.name);
      return;
    }

    const updated = await Room.findByIdAndUpdate(
      req.params.id,
      { $pull: { participants: req.user.id } },
      { new: true, select: 'participants' }
    );
    if (updated) {
      await Room.updateOne({ _id: req.params.id }, { $set: { participantCount: updated.participants.length } });
    }

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
    }).select('requester recipient')
      .populate('requester', 'username')
      .populate('recipient', 'username')
      .lean();

    const friends = friendships.map(f => {
      const isRequester = f.requester._id.toString() === req.user.id;
      return isRequester ? f.recipient : f.requester;
    });

    if (friends.length === 0) {
      return res.json({ success: true, data: { watching: [], available: [] } });
    }

    const friendIds = friends.map(f => f._id);
    const friendIdSet = new Set(friendIds.map(id => id.toString()));
    const friendMap = new Map(friends.map(f => [f._id.toString(), f]));

    const activeRooms = await Room.find({
      isLive: true,
      privacy: 'public',
      participants: { $in: friendIds },
    })
      .select('name targetAnime host participantCount privacy sourceUrl sourceType currentEpisode totalEpisodes animeId bitrate participants')
      .populate('host', 'username')
      .sort({ createdAt: -1 })
      .lean();

    const friendsInRooms = new Set();

    const watching = activeRooms.map(room => {
      const roomFriends = room.participants
        .filter(pid => friendIdSet.has(pid.toString()))
        .map(pid => {
          const key = pid.toString();
          friendsInRooms.add(key);
          const f = friendMap.get(key);
          return f ? { _id: f._id, username: f.username } : { _id: pid, username: '?' };
        });

      return {
        _id: room._id, name: room.name, targetAnime: room.targetAnime,
        host: room.host, participantCount: room.participantCount, privacy: room.privacy,
        sourceUrl: room.sourceUrl, sourceType: room.sourceType,
        currentEpisode: room.currentEpisode, totalEpisodes: room.totalEpisodes,
        animeId: room.animeId, bitrate: room.bitrate, friends: roomFriends,
      };
    });

    const available = friends.filter(f => !friendsInRooms.has(f._id.toString()));

    res.json({ success: true, data: { watching, available } });
  } catch (error) {
    console.error('GetFriendsActivity error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @route   GET /api/rooms/init
// @access  Private (combined rooms + friends activity in one call)
exports.getRoomsInit = async (req, res) => {
  try {
    const now = Date.now();
    if (now - lastCleanup > 5 * 60 * 1000) {
      lastCleanup = now;
      const staleThreshold = new Date(now - 6 * 60 * 60 * 1000);
      Room.updateMany(
        { isLive: true, createdAt: { $lt: staleThreshold } },
        { isLive: false }
      ).exec().catch(() => {});
    }

    const userId = req.user.id;

    const [rooms, friendships] = await Promise.all([
      Room.find({ isLive: true, privacy: 'public' })
        .select('name host targetAnime participantCount privacy sourceType sourceUrl currentEpisode totalEpisodes animeId bitrate createdAt participants')
        .populate('host', 'username')
        .sort({ createdAt: -1 })
        .limit(20)
        .lean(),
      Friendship.find({
        $or: [{ requester: userId }, { recipient: userId }],
        status: 'accepted',
      }).select('requester recipient').lean(),
    ]);

    const friendIds = friendships.map(f =>
      f.requester.toString() === userId ? f.recipient : f.requester
    );
    const friendIdSet = new Set(friendIds.map(id => id.toString()));

    let watching = [];
    let available = [];

    if (friendIds.length > 0) {
      const allFriends = await User.find(
        { _id: { $in: friendIds } },
        'username'
      ).lean();

      const friendMap = new Map(allFriends.map(f => [f._id.toString(), f]));
      const friendsInRooms = new Set();

      const friendRooms = rooms.filter(room =>
        room.participants?.some(pid => friendIdSet.has(pid.toString()))
      );

      watching = friendRooms.map(room => {
        const friends = (room.participants || [])
          .filter(pid => friendIdSet.has(pid.toString()))
          .map(pid => {
            const key = pid.toString();
            friendsInRooms.add(key);
            const f = friendMap.get(key);
            return f ? { _id: f._id, username: f.username } : { _id: pid, username: '?' };
          });

        return {
          _id: room._id,
          name: room.name,
          targetAnime: room.targetAnime,
          host: room.host,
          participantCount: room.participantCount,
          privacy: room.privacy,
          sourceUrl: room.sourceUrl,
          sourceType: room.sourceType,
          currentEpisode: room.currentEpisode,
          totalEpisodes: room.totalEpisodes,
          animeId: room.animeId,
          bitrate: room.bitrate,
          friends,
        };
      });

      available = allFriends.filter(f => !friendsInRooms.has(f._id.toString()));
    }

    const roomsClean = rooms.map(({ participants, ...rest }) => rest);

    res.json({
      success: true,
      data: {
        rooms: roomsClean,
        watching,
        available,
      },
    });
  } catch (error) {
    console.error('GetRoomsInit error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @route   GET /api/rooms
// @access  Public
exports.getRooms = async (req, res) => {
  try {
    const now = Date.now();
    if (now - lastCleanup > 5 * 60 * 1000) {
      lastCleanup = now;
      const staleThreshold = new Date(now - 6 * 60 * 60 * 1000);
      Room.updateMany(
        { isLive: true, createdAt: { $lt: staleThreshold } },
        { isLive: false }
      ).exec().catch(() => {});
    }

    const rooms = await Room.find({ isLive: true, privacy: 'public' })
      .select('name host targetAnime participantCount privacy sourceType sourceUrl currentEpisode totalEpisodes animeId animeSlug bitrate playbackStartedAt currentTime positionUpdatedAt createdAt')
      .populate('host', 'username')
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

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
      .populate('host', 'username')
      .lean();

    if (!room) {
      return res.status(404).json({ success: false, message: 'Room not found' });
    }

    res.json({ success: true, data: room });
  } catch (error) {
    console.error('GetRoomById error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @route   GET /api/rooms/:id/status
// @access  Public (lightweight poll endpoint)
exports.getRoomStatus = async (req, res) => {
  try {
    const room = await Room.findById(req.params.id)
      .select('isLive currentEpisode sourceUrl participantCount playbackStartedAt currentTime positionUpdatedAt')
      .lean();

    if (!room) {
      return res.status(404).json({ success: false, message: 'Room not found' });
    }

    res.json({ success: true, data: room });
  } catch (error) {
    console.error('GetRoomStatus error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @route   POST /api/rooms/:id/token
// @access  Private
exports.getToken = async (req, res) => {
  try {
    const room = await Room.findById(req.params.id).select('isLive participants host livekitRoom').lean();

    if (!room) {
      return res.status(404).json({ success: false, message: 'Room not found' });
    }

    if (!room.isLive) {
      return res.status(400).json({ success: false, message: 'Room ended' });
    }

    const isParticipant = room.participants.some(p => p.toString() === req.user.id);
    if (!isParticipant) {
      return res.status(403).json({ success: false, message: 'Join the room first' });
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

    const isHost = room.host.toString() === req.user.id;
    at.addGrant({
      room: room.livekitRoom,
      roomJoin: true,
      canPublish: isHost,
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
    const room = await Room.findById(req.params.id).select('host participants name').lean();

    if (!room) {
      return res.status(404).json({ success: false, message: 'Room not found' });
    }

    if (room.host.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Only the host can end the room' });
    }

    const participantIds = room.participants
      .map(p => p.toString())
      .filter(id => id !== req.user.id);

    await Room.updateOne(
      { _id: req.params.id },
      { $set: { isLive: false, participants: [], participantCount: 0, messages: [] } }
    );

    res.json({ success: true, message: 'Room ended' });

    notifyRoomEnded(participantIds, req.user.username, room.name);
  } catch (error) {
    console.error('EndRoom error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @route   PUT /api/rooms/:id/episode
// @access  Private (host only)
exports.updateEpisode = async (req, res) => {
  try {
    const episode = parseInt(req.body.episode, 10);
    if (!Number.isInteger(episode) || episode < 1) {
      return res.status(400).json({ success: false, message: 'Invalid episode number' });
    }
    const { sourceUrl } = req.body;
    const room = await Room.findById(req.params.id);
    if (!room) return res.status(404).json({ success: false, message: 'Room not found' });
    if (!room.isLive) return res.status(400).json({ success: false, message: 'Room ended' });
    if (room.host.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Only the host can change episodes' });
    }

    const update = { currentEpisode: episode, playbackStartedAt: new Date(Date.now() + 5000), currentTime: 0, positionUpdatedAt: new Date() };
    if (sourceUrl) update.sourceUrl = sourceUrl;

    const updated = await Room.findByIdAndUpdate(req.params.id, { $set: update }, { new: true });

    res.json({ success: true, data: { currentEpisode: updated.currentEpisode, sourceUrl: updated.sourceUrl, playbackStartedAt: updated.playbackStartedAt } });
  } catch (error) {
    console.error('UpdateEpisode error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @route   POST /api/rooms/:id/sync
// @access  Private (host only)
exports.syncPlayback = async (req, res) => {
  try {
    const room = await Room.findById(req.params.id).select('host isLive').lean();
    if (!room) return res.status(404).json({ success: false, message: 'Room not found' });
    if (!room.isLive) return res.status(400).json({ success: false, message: 'Room ended' });
    if (room.host.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Only the host can sync' });
    }
    const now = Date.now();
    const currentTime = req.body.currentTime !== undefined
      ? Math.max(0, req.body.currentTime)
      : 0;
    await Room.updateOne({ _id: req.params.id }, {
      $set: {
        playbackStartedAt: new Date(now),
        currentTime,
        positionUpdatedAt: new Date(now),
      },
    });
    res.json({ success: true, data: { playbackStartedAt: new Date(now), currentTime } });
  } catch (error) {
    console.error('SyncPlayback error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @route   POST /api/rooms/:id/position
// @access  Private (host only)
exports.updatePosition = async (req, res) => {
  try {
    const room = await Room.findById(req.params.id).select('host isLive').lean();
    if (!room) return res.status(404).json({ success: false, message: 'Room not found' });
    if (!room.isLive) return res.status(400).json({ success: false, message: 'Room ended' });
    if (room.host.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Only the host can update position' });
    }
    const currentTime = req.body.currentTime !== undefined
      ? Math.max(0, req.body.currentTime)
      : undefined;
    if (currentTime === undefined) {
      return res.status(400).json({ success: false, message: 'currentTime required' });
    }
    await Room.updateOne({ _id: req.params.id }, {
      $set: { currentTime, positionUpdatedAt: new Date() },
    });
    res.json({ success: true });
  } catch (error) {
    console.error('UpdatePosition error:', error);
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
    await Room.findByIdAndUpdate(req.params.id, {
      $push: { messages: { $each: [msg], $slice: -200 } },
    });

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
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);
    const after = req.query.after ? new Date(req.query.after) : null;

    let query;
    if (after) {
      query = Room.findById(req.params.id, {
        messages: { $elemMatch: { ts: { $gt: after } } },
      });
    } else {
      query = Room.findById(req.params.id).select('messages');
    }

    const room = await query.lean();
    if (!room) return res.status(404).json({ success: false, message: 'Room not found' });

    let msgs = room.messages || [];
    if (after) msgs = msgs.filter(m => new Date(m.ts) > after);
    msgs = msgs.slice(-limit);

    res.json({ success: true, data: msgs });
  } catch (error) {
    console.error('GetMessages error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

