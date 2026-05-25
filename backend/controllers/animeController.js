const User = require('../models/User');

// @route   GET /api/anime/watchlist
// @access  Private
exports.getWatchlist = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    res.json({ success: true, data: user.watchlist });
  } catch (error) {
    console.error('GetWatchlist error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @route   POST /api/anime/:id/watchlist
// @access  Private
exports.addToWatchlist = async (req, res) => {
  try {
    const animeId = parseInt(req.params.id);
    const user = await User.findById(req.user.id);

    // Check if already in watchlist
    if (user.watchlist.some(item => item.animeId === animeId)) {
      return res.status(400).json({ success: false, message: 'Already in watchlist' });
    }

    const { name, img, rating, episodes, year, status, genres } = req.body;
    user.watchlist.push({ animeId, name, img, rating, episodes, year, status, genres });
    await user.save();

    res.status(201).json({ success: true, data: user.watchlist });
  } catch (error) {
    console.error('AddToWatchlist error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @route   DELETE /api/anime/:id/watchlist
// @access  Private
exports.removeFromWatchlist = async (req, res) => {
  try {
    const animeId = parseInt(req.params.id);
    const user = await User.findById(req.user.id);
    user.watchlist = user.watchlist.filter(item => item.animeId !== animeId);
    await user.save();

    res.json({ success: true, data: user.watchlist });
  } catch (error) {
    console.error('RemoveFromWatchlist error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @route   POST /api/anime/:id/history
// @access  Private
exports.updateWatchHistory = async (req, res) => {
  try {
    const animeId = parseInt(req.params.id);
    const { episodeWatched, animeName, animeImg } = req.body;
    const user = await User.findById(req.user.id);

    // Dedup: remove existing entry for same anime+episode, then add to front
    const existingIdx = user.watchHistory.findIndex(
      h => h.animeId === animeId && h.episode === episodeWatched
    );
    if (existingIdx !== -1) {
      user.watchHistory.splice(existingIdx, 1);
    }
    user.watchHistory.unshift({
      animeId,
      episode: episodeWatched,
      animeName,
      animeImg,
      timestamp: new Date(),
    });

    // Keep only last 100 history entries
    if (user.watchHistory.length > 100) {
      user.watchHistory = user.watchHistory.slice(0, 100);
    }

    await user.save();
    res.json({ success: true, data: user.watchHistory });
  } catch (error) {
    console.error('UpdateWatchHistory error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @route   GET /api/anime/history
// @access  Private
exports.getWatchHistory = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    res.json({ success: true, data: user.watchHistory });
  } catch (error) {
    console.error('GetWatchHistory error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @route   POST /api/anime/:id/rate
// @access  Private
exports.rateAnime = async (req, res) => {
  try {
    const animeId = req.params.id;
    const { rating } = req.body;

    if (!rating || rating < 1 || rating > 10) {
      return res.status(400).json({ success: false, message: 'Rating must be between 1 and 10' });
    }

    const user = await User.findById(req.user.id);
    user.ratings.set(animeId, rating);
    await user.save();

    res.json({ success: true, data: Object.fromEntries(user.ratings) });
  } catch (error) {
    console.error('RateAnime error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @route   GET /api/anime/ratings
// @access  Private
exports.getRatings = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    res.json({ success: true, data: Object.fromEntries(user.ratings) });
  } catch (error) {
    console.error('GetRatings error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @route   POST /api/anime/:id/like
// @access  Private
exports.likeAnime = async (req, res) => {
  try {
    const animeId = parseInt(req.params.id);
    const user = await User.findById(req.user.id);

    const idx = user.likedAnime.indexOf(animeId);
    if (idx > -1) {
      user.likedAnime.splice(idx, 1);
    } else {
      user.likedAnime.push(animeId);
    }
    await user.save();

    res.json({ success: true, data: user.likedAnime, liked: idx === -1 });
  } catch (error) {
    console.error('LikeAnime error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @route   GET /api/anime/liked
// @access  Private
exports.getLikedAnime = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    res.json({ success: true, data: user.likedAnime });
  } catch (error) {
    console.error('GetLikedAnime error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @route   GET /api/manga/readlist
// @access  Private
exports.getReadlist = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    res.json({ success: true, data: user.readlist });
  } catch (error) {
    console.error('GetReadlist error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @route   POST /api/manga/:id/list
// @access  Private
exports.addToReadlist = async (req, res) => {
  try {
    const mangaId = req.params.id;
    const user = await User.findById(req.user.id);

    if (user.readlist.some(item => item.mangaId === mangaId)) {
      return res.status(400).json({ success: false, message: 'Already in readlist' });
    }

    const { title, cover, author, rating, ch, status, demo } = req.body;
    user.readlist.push({ mangaId, title, cover, author, rating, ch, status, demo });
    await user.save();

    res.status(201).json({ success: true, data: user.readlist });
  } catch (error) {
    console.error('AddToReadlist error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @route   DELETE /api/manga/:id/list
// @access  Private
exports.removeFromReadlist = async (req, res) => {
  try {
    const mangaId = req.params.id;
    const user = await User.findById(req.user.id);
    user.readlist = user.readlist.filter(item => item.mangaId !== mangaId);
    await user.save();

    res.json({ success: true, data: user.readlist });
  } catch (error) {
    console.error('RemoveFromReadlist error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
