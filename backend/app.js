const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const hpp = require('hpp');
const rateLimit = require('express-rate-limit');

const app = express();

app.set('trust proxy', 1);

// ─── Security Headers ───────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
}));
app.use(hpp());

// ─── CORS ────────────────────────────────────────────────
app.use(cors({
  origin: true,
  credentials: true,
}));

// ─── Body Parsing ────────────────────────────────────────
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

// ─── XSS Sanitization ───────────────────────────────────
app.use(require('./middleware/sanitize'));

// ─── Rate Limiting ───────────────────────────────────────
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 200 : 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please try again later' },
});
app.use('/api/', globalLimiter);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many auth attempts, please try again later' },
});
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/auth/forgot-password', authLimiter);

const messageLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: { success: false, message: 'Message rate limit reached' },
});
app.use('/api/chat/rooms/:id/messages', messageLimiter);

// ─── Routes ──────────────────────────────────────────────
app.use('/api/auth', require('./routes/auth'));
app.use('/api/anime', require('./routes/anime'));
app.use('/api/manga', require('./routes/manga'));
app.use('/api/reviews', require('./routes/reviews'));
app.use('/api/community', require('./routes/community'));
app.use('/api/news', require('./routes/news'));
app.use('/api/tierlists', require('./routes/tierlists'));
app.use('/api/rooms', require('./routes/rooms'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/comments', require('./routes/comments'));
app.use('/api/scrape', require('./routes/scrape'));
app.use('/api/config', require('./routes/config'));
app.use('/api/badges', require('./routes/badges'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/chat', require('./routes/chat'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/friends', require('./routes/friends'));
app.use('/api/leaderboard', require('./routes/leaderboard'));
app.use('/api/discover', require('./routes/trending'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'AnimeWch API is running',
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV,
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// Error handler
app.use((err, req, res, next) => {
  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({ success: false, message: 'CORS not allowed' });
  }
  console.error('Server error:', err.stack || err);
  res.status(500).json({ success: false, message: 'Internal server error' });
});

module.exports = app;
