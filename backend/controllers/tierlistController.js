const TierList = require('../models/TierList');
const User = require('../models/User');

// @route   POST /api/tierlists
// @access  Private
exports.createTierList = async (req, res) => {
  try {
    const { title, description, isPublic, tiers, unranked } = req.body;

    const tierList = await TierList.create({
      user: req.user.id,
      title: title || 'My Tier List',
      description: description || '',
      isPublic: isPublic !== undefined ? isPublic : true,
      tiers: {
        s: tiers?.s || [],
        a: tiers?.a || [],
        b: tiers?.b || [],
        c: tiers?.c || [],
        d: tiers?.d || [],
      },
      unranked: unranked || [],
    });

    await tierList.populate('user', 'username avatar');

    res.status(201).json({ success: true, data: tierList });
  } catch (error) {
    console.error('CreateTierList error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @route   GET /api/tierlists/user/:userId
// @access  Public
exports.getUserTierLists = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const query = { user: userId };

    // Only show public lists unless the requester is the owner
    if (!req.user || req.user.id !== userId) {
      query.isPublic = true;
    }

    const tierLists = await TierList.find(query)
      .populate('user', 'username avatar')
      .sort({ createdAt: -1 });

    res.json({ success: true, data: tierLists });
  } catch (error) {
    console.error('GetUserTierLists error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @route   GET /api/tierlists/by-username/:username
// @access  Public
exports.getUserTierListsByUsername = async (req, res) => {
  try {
    const { username } = req.params;

    const user = await User.findOne({ username });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const query = { user: user._id, isPublic: true };

    const tierLists = await TierList.find(query)
      .populate('user', 'username avatar')
      .sort({ createdAt: -1 });

    res.json({ success: true, data: tierLists });
  } catch (error) {
    console.error('GetUserTierListsByUsername error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @route   GET /api/tierlists/community
// @access  Public
exports.getCommunityTierLists = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const [tierLists, total] = await Promise.all([
      TierList.find({ isPublic: true })
        .populate('user', 'username avatar')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      TierList.countDocuments({ isPublic: true }),
    ]);

    res.json({
      success: true,
      data: tierLists,
      page,
      pages: Math.ceil(total / limit),
      total,
    });
  } catch (error) {
    console.error('GetCommunityTierLists error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @route   GET /api/tierlists/:id
// @access  Public
exports.getTierListById = async (req, res) => {
  try {
    const tierList = await TierList.findById(req.params.id)
      .populate('user', 'username avatar');

    if (!tierList) {
      return res.status(404).json({ success: false, message: 'Tier list not found' });
    }

    if (!tierList.isPublic) {
      if (!req.user || req.user.id !== tierList.user._id.toString()) {
        return res.status(403).json({ success: false, message: 'Not authorized' });
      }
    }

    res.json({ success: true, data: tierList });
  } catch (error) {
    console.error('GetTierListById error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @route   PUT /api/tierlists/:id
// @access  Private
exports.updateTierList = async (req, res) => {
  try {
    const tierList = await TierList.findById(req.params.id);

    if (!tierList) {
      return res.status(404).json({ success: false, message: 'Tier list not found' });
    }

    if (tierList.user.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    const { title, description, isPublic, tiers, unranked } = req.body;

    if (title !== undefined) tierList.title = title;
    if (description !== undefined) tierList.description = description;
    if (isPublic !== undefined) tierList.isPublic = isPublic;
    if (tiers) {
      tierList.tiers = {
        s: tiers.s || [],
        a: tiers.a || [],
        b: tiers.b || [],
        c: tiers.c || [],
        d: tiers.d || [],
      };
    }
    if (unranked !== undefined) tierList.unranked = unranked;

    await tierList.save();
    await tierList.populate('user', 'username avatar');

    res.json({ success: true, data: tierList });
  } catch (error) {
    console.error('UpdateTierList error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @route   DELETE /api/tierlists/:id
// @access  Private
exports.deleteTierList = async (req, res) => {
  try {
    const tierList = await TierList.findById(req.params.id);

    if (!tierList) {
      return res.status(404).json({ success: false, message: 'Tier list not found' });
    }

    if (tierList.user.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    await tierList.deleteOne();

    res.json({ success: true, message: 'Tier list deleted' });
  } catch (error) {
    console.error('DeleteTierList error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
