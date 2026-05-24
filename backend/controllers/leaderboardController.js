const User = require('../models/User');

exports.getLeaderboard = async (req, res) => {
  try {
    const type = req.query.type || 'xp';
    const limit = Math.min(parseInt(req.query.limit) || 50, 100);

    let sortField;
    let projection = 'username avatar progression';

    switch (type) {
      case 'xp':
        sortField = { 'progression.xp': -1 };
        break;
      case 'streak':
        sortField = { 'progression.longestStreak': -1 };
        break;
      case 'watchlist':
        sortField = null;
        projection = 'username avatar watchlist';
        break;
      case 'reviews':
        sortField = null;
        break;
      default:
        sortField = { 'progression.xp': -1 };
    }

    let users;

    if (type === 'watchlist') {
      users = await User.aggregate([
        { $project: { username: 1, avatar: 1, count: { $size: '$watchlist' } } },
        { $sort: { count: -1 } },
        { $limit: limit },
      ]);
    } else if (type === 'reviews') {
      const Review = require('../models/Review');
      const agg = await Review.aggregate([
        { $group: { _id: '$user', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: limit },
        { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } },
        { $unwind: '$user' },
        { $project: { username: '$user.username', avatar: '$user.avatar', count: 1 } },
      ]);
      users = agg;
    } else {
      const raw = await User.find()
        .select(projection)
        .sort(sortField)
        .limit(limit)
        .lean();

      users = raw.map(u => ({
        _id: u._id,
        username: u.username,
        avatar: u.avatar,
        xp: u.progression?.xp || 0,
        streak: u.progression?.currentStreak || 0,
        longestStreak: u.progression?.longestStreak || 0,
      }));
    }

    res.json({ success: true, data: users });
  } catch (err) {
    console.error('GetLeaderboard error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
