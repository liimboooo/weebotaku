const mongoose = require('mongoose');

// Global like/dislike counts for an anime (watch-page reaction bar).
// Distinct from User.likedAnime, which is a user's personal "liked" list.
const AnimeReactionSchema = new mongoose.Schema({
  animeId: { type: Number, required: true, unique: true, index: true },
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  dislikes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
}, { timestamps: true });

module.exports = mongoose.model('AnimeReaction', AnimeReactionSchema);
