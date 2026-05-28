const dotenv = require('dotenv');
dotenv.config();

const connectDB = require('../config/db');
const app = require('../app');

connectDB().catch(err => {
  console.error('Initial DB connection failed:', err.message);
});

module.exports = async (req, res) => {
  delete req.headers.cookie;
  delete req.headers['x-vercel-proxy-signature'];
  delete req.headers['x-vercel-forwarded-for'];
  const origin = req.headers.origin;
  res.setHeader('Access-Control-Allow-Origin', origin || '*');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS,PATCH');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    await connectDB();
  } catch (err) {
    console.error('DB connection failed:', err.message);
    res.status(500).json({ success: false, message: 'Database connection failed' });
    return;
  }

  return new Promise((resolve) => {
    res.on('finish', resolve);
    res.on('close', resolve);
    try {
      app(req, res);
    } catch (err) {
      console.error('Express handler error:', err);
      if (!res.headersSent) {
        res.status(500).json({ success: false, message: 'Internal server error' });
      }
      resolve();
    }
  });
};
