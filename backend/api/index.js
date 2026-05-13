const dotenv = require('dotenv');
dotenv.config();

const connectDB = require('../config/db');
const app = require('../app');

const rawOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map(s => s.trim()).filter(Boolean)
  : [];

const setCorsHeaders = (req, res) => {
  const origin = req.headers.origin;
  if (!origin) return;

  const isAllowed = rawOrigins.length === 0
    ? ['http://localhost:3000', 'http://127.0.0.1:3000', 'https://liimboooo-animewch.vercel.app'].includes(origin)
    : rawOrigins.includes('*') || rawOrigins.includes(origin);

  if (isAllowed) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS,PATCH');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  }
};

const sendJSON = (res, status, data) => {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
};

let serverReady = false;

module.exports = async (req, res) => {
  setCorsHeaders(req, res);

  if (req.method === 'OPTIONS') {
    sendJSON(res, 200, {});
    return;
  }

  if (!serverReady) {
    try {
      await connectDB();
      serverReady = true;
    } catch (err) {
      console.error('DB connection failed:', err.message);
      sendJSON(res, 500, { success: false, message: 'Database connection failed' });
      return;
    }
  }
  app(req, res);
};
