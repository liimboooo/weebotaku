const AnimeReaction = require('../models/AnimeReaction');

const shape = (doc, uid) => ({
  likes: doc ? doc.likes.length : 0,
  dislikes: doc ? doc.dislikes.length : 0,
  liked: !!(doc && uid && doc.likes.some(x => x.toString() === uid)),
  disliked: !!(doc && uid && doc.dislikes.some(x => x.toString() === uid)),
});

// GET /api/reactions/:animeId  (optionalAuth)
exports.getReactions = async (req, res) => {
  try {
    const animeId = parseInt(req.params.animeId, 10);
    if (Number.isNaN(animeId)) return res.status(400).json({ success: false, message: 'Invalid anime id' });
    const doc = await AnimeReaction.findOne({ animeId });
    res.json({ success: true, data: shape(doc, req.user?.id) });
  } catch (err) {
    console.error('getReactions error:', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// POST /api/reactions/:animeId/like  (protect)
exports.toggleLike = async (req, res) => {
  try {
    const animeId = parseInt(req.params.animeId, 10);
    if (Number.isNaN(animeId)) return res.status(400).json({ success: false, message: 'Invalid anime id' });
    const uid = req.user.id;
    const doc = await AnimeReaction.findOneAndUpdate({ animeId }, { $setOnInsert: { animeId } }, { upsert: true, new: true });

    const di = doc.dislikes.findIndex(x => x.toString() === uid);
    if (di > -1) doc.dislikes.splice(di, 1);
    const li = doc.likes.findIndex(x => x.toString() === uid);
    if (li > -1) doc.likes.splice(li, 1); else doc.likes.push(uid);

    await doc.save();
    res.json({ success: true, data: shape(doc, uid) });
  } catch (err) {
    console.error('toggleLike error:', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// POST /api/reactions/:animeId/dislike  (protect)
exports.toggleDislike = async (req, res) => {
  try {
    const animeId = parseInt(req.params.animeId, 10);
    if (Number.isNaN(animeId)) return res.status(400).json({ success: false, message: 'Invalid anime id' });
    const uid = req.user.id;
    const doc = await AnimeReaction.findOneAndUpdate({ animeId }, { $setOnInsert: { animeId } }, { upsert: true, new: true });

    const li = doc.likes.findIndex(x => x.toString() === uid);
    if (li > -1) doc.likes.splice(li, 1);
    const di = doc.dislikes.findIndex(x => x.toString() === uid);
    if (di > -1) doc.dislikes.splice(di, 1); else doc.dislikes.push(uid);

    await doc.save();
    res.json({ success: true, data: shape(doc, uid) });
  } catch (err) {
    console.error('toggleDislike error:', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
