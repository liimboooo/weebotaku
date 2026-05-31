const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const UserSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, 'Please provide a username'],
    unique: true,
    trim: true,
    minlength: [2, 'Username must be at least 2 characters'],
    maxlength: [30, 'Username cannot exceed 30 characters'],
  },
  email: {
    type: String,
    required: [true, 'Please provide an email'],
    unique: true,
    trim: true,
    lowercase: true,
    match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
  },
  password: {
    type: String,
    required: [true, 'Please provide a password'],
    minlength: [4, 'Password must be at least 4 characters'],
    select: false,
  },
  avatar: {
    type: String,
    default: '',
  },
  banner: {
    type: String,
    default: '',
  },
  bio: {
    type: String,
    default: 'Watching anime...',
    maxlength: [500, 'Bio cannot exceed 500 characters'],
  },
  statusMessage: {
    type: String,
    default: 'Watching anime...',
    maxlength: [100, 'Status message cannot exceed 100 characters'],
  },
  socialLinks: {
    instagram: { type: String, default: '' },
    twitter: { type: String, default: '' },
    discord: { type: String, default: '' },
    myanimelist: { type: String, default: '' },
    anilist: { type: String, default: '' },
  },
  watchlist: [{
    animeId: { type: Number, required: true },
    name: String,
    img: String,
    rating: Number,
    episodes: Number,
    year: Number,
    status: String,
    genres: [String],
    listStatus: { type: String, default: 'Watch Later' },
    type: { type: String, default: 'anime' },
    addedAt: { type: Date, default: Date.now },
  }],
  ratings: {
    type: Map,
    of: Number,
    default: {},
  },
  likedAnime: [{
    type: Number,
  }],
  watchHistory: [{
    animeId: { type: Number, required: true },
    episode: { type: Number, required: true },
    position: { type: Number, default: 0 },
    animeName: String,
    animeImg: String,
    timestamp: { type: Date, default: Date.now },
  }],
  favorites: [{
    animeId: { type: Number, required: true },
    name: String,
    img: String,
  }],
  activities: [{
    type: { type: String, enum: ['completed', 'rated', 'added', 'started', 'dropped', 'review'] },
    animeId: Number,
    animeName: String,
    animeImg: String,
    detail: String,
    createdAt: { type: Date, default: Date.now },
  }],
  recommendations: [{
    from: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    animeId: { type: Number, required: true },
    animeName: String,
    animeImg: String,
    message: String,
    createdAt: { type: Date, default: Date.now },
  }],
  collections: [{
    name: { type: String, required: true, maxlength: 50 },
    description: { type: String, default: '', maxlength: 200 },
    anime: [{
      animeId: { type: Number, required: true },
      name: String,
      img: String,
    }],
    isPublic: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now },
  }],
  progression: {
    xp: { type: Number, default: 0 },
    currentStreak: { type: Number, default: 0 },
    longestStreak: { type: Number, default: 0 },
    lastActiveDate: { type: String, default: '' },
    lastDailyBonus: { type: String, default: '' },
  },
  twoFactorSecret: { type: String, default: '' },
  backupCodes: [{ type: String }],
  emailVerified: { type: Boolean, default: false },
  emailVerificationToken: { type: String, default: '' },
  emailVerificationExpires: { type: Date },
  resetPasswordToken: { type: String, default: '' },
  resetPasswordExpires: { type: Date },
  settings: {
    darkMode: { type: String, default: 'auto' },
    fontSize: { type: String, default: 'Medium' },
    accentColor: { type: String, default: '#7c3aed' },
    autoNext: { type: Boolean, default: true },
    skipIntro: { type: Boolean, default: false },
    skipOutro: { type: Boolean, default: false },
    showSubtitles: { type: Boolean, default: true },
    disableAds: { type: Boolean, default: false },
    showComments: { type: Boolean, default: true },
    hideNsfw: { type: Boolean, default: true },
    showMatureWarnings: { type: Boolean, default: true },
    showEpisodeProgress: { type: Boolean, default: true },
    showRatingsCards: { type: Boolean, default: true },
    emailNotifs: { type: Boolean, default: true },
    newEpisodes: { type: Boolean, default: true },
    communityActivity: { type: Boolean, default: false },
    friendsActivity: { type: Boolean, default: false },
    systemUpdates: { type: Boolean, default: true },
    weeklyRecs: { type: Boolean, default: true },
    pushNotifs: { type: Boolean, default: true },
    newsNotifications: { type: Boolean, default: true },
    newEpisodeAlerts: { type: Boolean, default: true },
    commentReplies: { type: Boolean, default: true },
    friendRequests: { type: Boolean, default: true },
    animeRecs: { type: Boolean, default: false },
    newFeatures: { type: Boolean, default: false },
    publicProfile: { type: Boolean, default: true },
    showWatchlistPublic: { type: Boolean, default: true },
    allowMessaging: { type: String, default: 'anyone' },
    showActivityStatus: { type: Boolean, default: true },
    showLastActive: { type: Boolean, default: false },
    defaultDubbed: { type: String, default: 'subbed' },
    contentRating: { type: String, default: 'PG-13' },
    defaultListView: { type: String, default: 'Grid' },
    playbackSpeed: { type: Number, default: 1 },
    twoFactorEnabled: { type: Boolean, default: false },
    malConnected: { type: Boolean, default: false },
    malUsername: { type: String, default: '' },
    aniConnected: { type: Boolean, default: false },
    aniUsername: { type: String, default: '' },

  },
  memberSince: {
    type: Number,
    default: () => new Date().getFullYear(),
  },
  role: {
    type: String,
    enum: ['user', 'admin', 'banned'],
    default: 'user',
  },
}, { timestamps: true });

UserSchema.index({ 'progression.xp': -1 });
UserSchema.index({ 'progression.longestStreak': -1 });
UserSchema.index({ role: 1 });
UserSchema.index({ createdAt: -1 });

UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

UserSchema.methods.matchPassword = async function (enteredPassword) {
  return bcrypt.compare(enteredPassword, this.password);
};

UserSchema.methods.getSignedJwtToken = function () {
  return jwt.sign(
    { id: this._id, username: this.username, role: this.role || 'user' },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE }
  );
};

UserSchema.methods.toPublic = function () {
  return {
    id: this._id,
    username: this.username,
    avatar: this.avatar,
    bio: this.bio,
    socialLinks: this.socialLinks,
    memberSince: this.memberSince,
    role: this.role,
    createdAt: this.createdAt,
    watchlistCount: this.watchlist.length,
    historyCount: this.watchHistory.length,
    ratingsCount: this.ratings ? this.ratings.size : 0,
    likedCount: this.likedAnime.length,
  };
};

UserSchema.methods.toFullProfile = function () {
  return {
    id: this._id,
    username: this.username,
    email: this.email,
    avatar: this.avatar,
    bio: this.bio,
    socialLinks: this.socialLinks,
    memberSince: this.memberSince,
    role: this.role,
    createdAt: this.createdAt,
    watchlist: this.watchlist,
    watchHistory: this.watchHistory,
    ratings: this.ratings ? Object.fromEntries(this.ratings) : {},
    likedAnime: this.likedAnime,
    favorites: this.favorites || [],
    activities: (this.activities || []).slice(0, 30),
    recommendations: this.recommendations || [],
    collections: this.collections || [],
  };
};

UserSchema.methods.toRemoteProfile = function () {
  const showWatchlist = this.settings?.showWatchlistPublic !== false;
  return {
    id: this._id,
    username: this.username,
    avatar: this.avatar,
    bio: this.bio,
    socialLinks: this.socialLinks,
    memberSince: this.memberSince,
    role: this.role,
    createdAt: this.createdAt,
    watchlistCount: showWatchlist ? this.watchlist.length : 0,
    historyCount: showWatchlist ? this.watchHistory.length : 0,
    ratingsCount: showWatchlist ? (this.ratings ? this.ratings.size : 0) : 0,
    likedCount: showWatchlist ? this.likedAnime.length : 0,
    watchlist: showWatchlist ? this.watchlist : [],
    likedAnime: showWatchlist ? this.likedAnime : [],
    ratings: showWatchlist ? (this.ratings ? Object.fromEntries(this.ratings) : {}) : {},
    watchHistory: showWatchlist ? this.watchHistory.slice(0, 20) : [],
    favorites: this.favorites || [],
    activities: (this.activities || []).slice(0, 30),
    collections: (this.collections || []).filter(c => c.isPublic),
  };
};

module.exports = mongoose.model('User', UserSchema);
