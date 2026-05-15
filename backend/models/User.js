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
  watchlist: [{
    animeId: { type: Number, required: true },
    name: String,
    img: String,
    rating: Number,
    episodes: Number,
    year: Number,
    status: String,
    genres: [String],
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

// Hash password before saving
UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare password
UserSchema.methods.matchPassword = async function (enteredPassword) {
  return bcrypt.compare(enteredPassword, this.password);
};

// Generate JWT
UserSchema.methods.getSignedJwtToken = function () {
  return jwt.sign({ id: this._id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE,
  });
};

// Return user object without password
UserSchema.methods.toPublic = function () {
  return {
    id: this._id,
    username: this.username,
    email: this.email,
    avatar: this.avatar,
    bio: this.bio,
    statusMessage: this.statusMessage,
    memberSince: this.memberSince,
    role: this.role,
    createdAt: this.createdAt,
    watchlistCount: this.watchlist.length,
    readlistCount: this.readlist.length,
    historyCount: this.watchHistory.length,
  };
};

module.exports = mongoose.model('User', UserSchema);
