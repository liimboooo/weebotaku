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
  crossOriginResourcePolicy: false,
  crossOriginOpenerPolicy: false,
}));
app.use(hpp());

// ─── CORS ────────────────────────────────────────────────
app.use(cors({ origin: '*' }));

// Handle OPTIONS preflight at Express level (fallback)
app.options('*', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS,PATCH');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization,Range');
  res.setHeader('Access-Control-Expose-Headers', 'Content-Range,Accept-Ranges');
  res.sendStatus(204);
});

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
app.use('/api/', (req, res, next) => {
  if (req.path.startsWith('/stream/')) return next();
  return globalLimiter(req, res, next);
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many auth attempts, please try again later' },
});
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/auth/password/forgot', authLimiter);

// ─── Routes ──────────────────────────────────────────────
app.use('/api/auth', require('./routes/auth'));
app.use('/api/anime', require('./routes/anime'));

app.use('/api/reviews', require('./routes/reviews'));
app.use('/api/news', require('./routes/news'));
app.use('/api/tierlists', require('./routes/tierlists'));
app.use('/api/rooms', require('./routes/rooms'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/comments', require('./routes/comments'));
app.use('/api/reactions', require('./routes/reactions'));
app.use('/api/scrape', require('./routes/scrape'));
app.use('/api/config', require('./routes/config'));
app.use('/api/badges', require('./routes/badges'));

app.use('/api/leaderboard', require('./routes/leaderboard'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/stream', require('./routes/stream'));
app.use('/api/catalog', require('./routes/catalog'));
app.use('/api/gifs', require('./routes/gifs'));

// Health check (also keeps DB connection warm for cron)
app.get('/api/health', async (req, res) => {
  const mongoose = require('mongoose');
  const dbState = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  if (dbState !== 'connected') {
    try { await require('./config/db')(); } catch {}
  }
  res.json({
    success: true,
    message: 'Otaku API is running',
    timestamp: new Date().toISOString(),
    db: dbState,
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err.stack || err);
  res.status(500).json({ success: false, message: 'Internal server error' });
});

module.exports = app;
