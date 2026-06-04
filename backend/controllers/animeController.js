const User = require('../models/User');
const Sync = require('../models/Sync');
const malService = require('../services/malService');
const anilistService = require('../services/anilistService');

function idParam(req) {
  const n = parseInt(req.params.id);
  if (isNaN(n) || n <= 0) return null;
  return n;
}

async function pushToConnectedServices(user, animeId, listStatus, rating = 0, progress = 0) {
  try {
    const syncs = await Sync.find({ userId: user._id, syncStatus: 'synced' });
    for (const sync of syncs) {
      try {
        let accessToken = sync.accessToken;
        if (sync.expiresAt && new Date() > sync.expiresAt && sync.refreshToken) {
          try {
            const refresh = sync.service === 'mal'
              ? await malService.refreshAccessToken(sync.refreshToken)
              : await anilistService.refreshAccessToken(sync.refreshToken);
            accessToken = refresh.accessToken;
            sync.accessToken = refresh.accessToken;
            sync.refreshToken = refresh.refreshToken || sync.refreshToken;
            sync.expiresAt = refresh.expiresAt;
            await sync.save();
          } catch {}
        }
        if (sync.service === 'mal') {
          await malService.updateAnimeList(accessToken, animeId, listStatus, rating, progress);
        } else if (sync.service === 'anilist') {
          await anilistService.saveMediaListEntry(accessToken, animeId, listStatus, rating, progress);
        }
      } catch {}
    }
  } catch {}
}

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
    const animeId = idParam(req);
    if (!animeId) return res.status(400).json({ success: false, message: 'Invalid anime ID' });
    const user = await User.findById(req.user.id);

    // Check if already in watchlist
    if (user.watchlist.some(item => item.animeId === animeId)) {
      return res.status(400).json({ success: false, message: 'Already in watchlist' });
    }

    const { name, img, rating, episodes, year, status, genres, listStatus } = req.body;
    user.watchlist.push({ animeId, name, img, rating, episodes, year, status, genres, listStatus });
    await user.save();

    pushToConnectedServices(user, animeId, listStatus || 'Planning', rating || 0, 0);

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
    const animeId = idParam(req);
    if (!animeId) return res.status(400).json({ success: false, message: 'Invalid anime ID' });
    const user = await User.findById(req.user.id);
    user.watchlist = user.watchlist.filter(item => item.animeId !== animeId);
    await user.save();

    pushToConnectedServices(user, animeId, 'Dropped', 0, 0);

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
    const animeId = idParam(req);
    if (!animeId) return res.status(400).json({ success: false, message: 'Invalid anime ID' });
    const { episodeWatched, animeName, animeImg, position } = req.body;
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
      position: position || 0,
      animeName,
      animeImg,
      timestamp: new Date(),
    });

    // Keep only last 100 history entries
    if (user.watchHistory.length > 100) {
      user.watchHistory = user.watchHistory.slice(0, 100);
    }

    await user.save();

    // Sync progress to connected services
    const watchlistItem = user.watchlist?.find(i => i.animeId === animeId);
    if (watchlistItem) {
      pushToConnectedServices(user, animeId, watchlistItem.listStatus || 'Watching', watchlistItem.rating || 0, episodeWatched || 0);
    } else {
      pushToConnectedServices(user, animeId, 'Watching', 0, episodeWatched || 0);
    }

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
    const animeId = idParam(req);
    if (!animeId) return res.status(400).json({ success: false, message: 'Invalid anime ID' });
    const { rating } = req.body;

    if (!rating || rating < 1 || rating > 10) {
      return res.status(400).json({ success: false, message: 'Rating must be between 1 and 10' });
    }

    const user = await User.findById(req.user.id);
    user.ratings.set(animeId, rating);
    await user.save();

    const watchlistItem = user.watchlist?.find(i => i.animeId === animeId);
    pushToConnectedServices(user, animeId, watchlistItem?.listStatus || 'Completed', rating, watchlistItem?.progress || 0);

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
    const animeId = idParam(req);
    if (!animeId) return res.status(400).json({ success: false, message: 'Invalid anime ID' });
    const user = await User.findById(req.user.id);

    const idx = user.likedAnime.indexOf(animeId);
    if (idx > -1) {
      user.likedAnime.splice(idx, 1);
    } else {
      user.likedAnime.push(animeId);
    }
    await user.save();

    if (idx === -1) {
      pushToConnectedServices(user, animeId, 'Planning', 0, 0);
    }

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


