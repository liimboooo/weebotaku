const User = require('../models/User');
const Report = require('../models/Report');
const CommunityPost = require('../models/CommunityPost');
const ChatRoom = require('../models/ChatRoom');
const Message = require('../models/Message');
const Notification = require('../models/Notification');

exports.getDashboardStats = async (req, res) => {
  try {
    const [
      totalUsers, newUsersToday, totalPosts, totalRooms,
      totalMessages, pendingReports, totalReports,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ createdAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) } }),
      CommunityPost.countDocuments({ deletedAt: null }),
      ChatRoom.countDocuments({ isActive: true }),
      Message.countDocuments(),
      Report.countDocuments({ status: 'pending' }),
      Report.countDocuments(),
    ]);

    const recentUsers = await User.find()
      .select('username avatar email role createdAt')
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    res.json({
      success: true,
      data: {
        totalUsers,
        newUsersToday,
        totalPosts,
        totalRooms,
        totalMessages,
        pendingReports,
        totalReports,
        recentUsers,
      },
    });
  } catch (err) {
    console.error('Admin getDashboardStats error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.getUsers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const skip = (page - 1) * limit;
    const search = req.query.search || '';
    const role = req.query.role || '';

    const query = {};
    if (search) {
      query.$or = [
        { username: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }
    if (role) query.role = role;

    const [users, total] = await Promise.all([
      User.find(query)
        .select('username email avatar role emailVerified createdAt progression')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      User.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: users,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error('Admin getUsers error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.updateUserRole = async (req, res) => {
  try {
    const { role } = req.body;
    if (!['user', 'admin'].includes(role)) {
      return res.status(400).json({ success: false, message: 'Invalid role' });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role },
      { new: true }
    ).select('username email role');

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({ success: true, data: user });
  } catch (err) {
    console.error('Admin updateUserRole error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.banUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    if (user.role === 'admin') {
      return res.status(400).json({ success: false, message: 'Cannot ban an admin' });
    }

    user.role = 'banned';
    await user.save();

    res.json({ success: true, message: `User ${user.username} banned` });
  } catch (err) {
    console.error('Admin banUser error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    if (user.role === 'admin') {
      return res.status(400).json({ success: false, message: 'Cannot delete an admin' });
    }

    await User.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'User deleted' });
  } catch (err) {
    console.error('Admin deleteUser error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.getReports = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const skip = (page - 1) * limit;
    const status = req.query.status || '';

    const query = {};
    if (status) query.status = status;

    const [reports, total] = await Promise.all([
      Report.find(query)
        .populate('user', 'username avatar')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Report.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: reports,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error('Admin getReports error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.updateReport = async (req, res) => {
  try {
    const { status } = req.body;
    if (!['pending', 'resolved', 'dismissed'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    const report = await Report.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    ).populate('user', 'username avatar');

    if (!report) {
      return res.status(404).json({ success: false, message: 'Report not found' });
    }

    res.json({ success: true, data: report });
  } catch (err) {
    console.error('Admin updateReport error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.getPosts = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const skip = (page - 1) * limit;

    const [posts, total] = await Promise.all([
      CommunityPost.find()
        .populate('user', 'username avatar')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      CommunityPost.countDocuments(),
    ]);

    res.json({
      success: true,
      data: posts,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error('Admin getPosts error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.deletePost = async (req, res) => {
  try {
    const post = await CommunityPost.findByIdAndUpdate(
      req.params.id,
      { deletedAt: new Date() },
      { new: true }
    );
    if (!post) {
      return res.status(404).json({ success: false, message: 'Post not found' });
    }
    res.json({ success: true, message: 'Post deleted' });
  } catch (err) {
    console.error('Admin deletePost error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.getChatRooms = async (req, res) => {
  try {
    const rooms = await ChatRoom.find()
      .populate('creator', 'username avatar')
      .sort({ lastMessageAt: -1 })
      .lean();
    res.json({ success: true, data: rooms });
  } catch (err) {
    console.error('Admin getChatRooms error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.deleteChatRoom = async (req, res) => {
  try {
    const room = await ChatRoom.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );
    if (!room) {
      return res.status(404).json({ success: false, message: 'Room not found' });
    }
    res.json({ success: true, message: 'Room deactivated' });
  } catch (err) {
    console.error('Admin deleteChatRoom error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
