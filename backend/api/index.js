const dotenv = require('dotenv');
dotenv.config();

const connectDB = require('../config/db');
const app = require('../app');

connectDB().catch(err => {
  console.error('Initial DB connection failed:', err.message);
});

module.exports = async (req, res) => {
  const origin = req.headers.origin;
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS,PATCH');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization,Range');
  res.setHeader('Access-Control-Expose-Headers', 'Content-Range,Accept-Ranges');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
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
