const Friendship = require('../models/Friendship');
const User = require('../models/User');

exports.sendRequest = async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ success: false, message: 'userId required' });
    if (userId === req.user.id) return res.status(400).json({ success: false, message: 'Cannot friend yourself' });

    const existing = await Friendship.findOne({
      $or: [
        { requester: req.user.id, recipient: userId },
        { requester: userId, recipient: req.user.id },
      ],
    });

    if (existing) {
      if (existing.status === 'accepted') return res.status(400).json({ success: false, message: 'Already friends' });
      if (existing.status === 'pending') return res.status(400).json({ success: false, message: 'Request already pending' });
      if (existing.status === 'blocked') return res.status(400).json({ success: false, message: 'User is blocked' });
    }

    const friendship = await Friendship.create({
      requester: req.user.id,
      recipient: userId,
    });

    res.status(201).json({ success: true, data: friendship });
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ success: false, message: 'Request already exists' });
    console.error('SendFriendRequest error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.acceptRequest = async (req, res) => {
  try {
    const friendship = await Friendship.findById(req.params.id);
    if (!friendship) return res.status(404).json({ success: false, message: 'Request not found' });
    if (friendship.recipient.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }
    if (friendship.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'Request not pending' });
    }

    friendship.status = 'accepted';
    await friendship.save();

    res.json({ success: true, data: friendship });
  } catch (err) {
    console.error('AcceptFriendRequest error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.rejectRequest = async (req, res) => {
  try {
    const friendship = await Friendship.findById(req.params.id);
    if (!friendship) return res.status(404).json({ success: false, message: 'Request not found' });
    if (friendship.recipient.toString() !== req.user.id && friendship.requester.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    await friendship.deleteOne();
    res.json({ success: true, message: 'Request removed' });
  } catch (err) {
    console.error('RejectFriendRequest error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.removeFriend = async (req, res) => {
  try {
    const friendship = await Friendship.findOne({
      $or: [
        { requester: req.user.id, recipient: req.params.userId },
        { requester: req.params.userId, recipient: req.user.id },
      ],
      status: 'accepted',
    });

    if (!friendship) return res.status(404).json({ success: false, message: 'Not friends' });

    await friendship.deleteOne();
    res.json({ success: true, message: 'Friend removed' });
  } catch (err) {
    console.error('RemoveFriend error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.getFriends = async (req, res) => {
  try {
    const userId = req.params.userId || req.user.id;

    const friendships = await Friendship.find({
      $or: [{ requester: userId }, { recipient: userId }],
      status: 'accepted',
    })
      .populate('requester', 'username avatar bio statusMessage')
      .populate('recipient', 'username avatar bio statusMessage')
      .sort({ updatedAt: -1 });

    const friends = friendships.map(f => {
      const friend = f.requester._id.toString() === userId.toString() ? f.recipient : f.requester;
      return { ...friend.toObject(), friendshipId: f._id, since: f.updatedAt };
    });

    res.json({ success: true, data: friends });
  } catch (err) {
    console.error('GetFriends error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.getPendingRequests = async (req, res) => {
  try {
    const incoming = await Friendship.find({ recipient: req.user.id, status: 'pending' })
      .populate('requester', 'username avatar bio')
      .sort({ createdAt: -1 });

    const outgoing = await Friendship.find({ requester: req.user.id, status: 'pending' })
      .populate('recipient', 'username avatar bio')
      .sort({ createdAt: -1 });

    res.json({ success: true, data: { incoming, outgoing } });
  } catch (err) {
    console.error('GetPendingRequests error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.getFriendshipStatus = async (req, res) => {
  try {
    const friendship = await Friendship.findOne({
      $or: [
        { requester: req.user.id, recipient: req.params.userId },
        { requester: req.params.userId, recipient: req.user.id },
      ],
    });

    if (!friendship) return res.json({ success: true, data: { status: 'none' } });

    res.json({
      success: true,
      data: {
        status: friendship.status,
        friendshipId: friendship._id,
        isRequester: friendship.requester.toString() === req.user.id,
      },
    });
  } catch (err) {
    console.error('GetFriendshipStatus error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
