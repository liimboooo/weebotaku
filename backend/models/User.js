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
  readlist: [{
    mangaId: { type: String, required: true },
    title: String,
    cover: String,
    author: String,
    rating: Number,
    ch: Number,
    status: String,
    demo: String,
    type: { type: String, default: 'manga' },
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
    animeName: String,
    animeImg: String,
    timestamp: { type: Date, default: Date.now },
  }],
  mangaProgress: {
    type: Map,
    of: Number,
    default: {},
  },
  progression: {
    xp: { type: Number, default: 0 },
    currentStreak: { type: Number, default: 0 },
    longestStreak: { type: Number, default: 0 },
    lastActiveDate: { type: String, default: '' },
    lastDailyBonus: { type: String, default: '' },
  },
  memberSince: {
    type: Number,
    default: () => new Date().getFullYear(),
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user',
  },
}, { timestamps: true });

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
  return jwt.sign({ id: this._id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE,
  });
};

UserSchema.methods.toPublic = function () {
  return {
    id: this._id,
    username: this.username,
    email: this.email,
    avatar: this.avatar,
    banner: this.banner,
    bio: this.bio,
    statusMessage: this.statusMessage,
    socialLinks: this.socialLinks,
    progression: this.progression,
    memberSince: this.memberSince,
    role: this.role,
    createdAt: this.createdAt,
    watchlistCount: this.watchlist.length,
    readlistCount: this.readlist.length,
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
    banner: this.banner,
    bio: this.bio,
    statusMessage: this.statusMessage,
    socialLinks: this.socialLinks,
    progression: this.progression,
    memberSince: this.memberSince,
    role: this.role,
    createdAt: this.createdAt,
    watchlist: this.watchlist,
    readlist: this.readlist,
    watchHistory: this.watchHistory,
    ratings: this.ratings ? Object.fromEntries(this.ratings) : {},
    likedAnime: this.likedAnime,
    mangaProgress: this.mangaProgress ? Object.fromEntries(this.mangaProgress) : {},
  };
};

UserSchema.methods.toRemoteProfile = function () {
  return {
    id: this._id,
    username: this.username,
    avatar: this.avatar,
    banner: this.banner,
    bio: this.bio,
    statusMessage: this.statusMessage,
    socialLinks: this.socialLinks,
    progression: this.progression,
    memberSince: this.memberSince,
    role: this.role,
    createdAt: this.createdAt,
    watchlistCount: this.watchlist.length,
    readlistCount: this.readlist.length,
    historyCount: this.watchHistory.length,
    ratingsCount: this.ratings ? this.ratings.size : 0,
    likedCount: this.likedAnime.length,
    watchlist: this.watchlist,
    likedAnime: this.likedAnime,
    ratings: this.ratings ? Object.fromEntries(this.ratings) : {},
    watchHistory: this.watchHistory.slice(0, 20),
  };
};

module.exports = mongoose.model('User', UserSchema);
