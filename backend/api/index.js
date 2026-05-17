const dotenv = require('dotenv');
dotenv.config();

const connectDB = require('../config/db');
const app = require('../app');

const STATIC_ORIGINS = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'https://liimboooo-animewch.vercel.app',
  'https://frontend-beryl-theta-14.vercel.app',
];

const rawOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map(s => s.trim()).filter(Boolean)
  : [];

const allowedOrigins = rawOrigins.length > 0
  ? [...new Set([...rawOrigins, ...STATIC_ORIGINS])]
  : STATIC_ORIGINS;

const setCorsHeaders = (req, res) => {
  const origin = req.headers.origin;
  res.setHeader('Access-Control-Allow-Origin', origin || '*');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS,PATCH');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
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

  if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
    const ctype = (req.headers['content-type'] || '').toLowerCase();
    if (ctype.includes('application/json') || ctype.includes('application/x-www-form-urlencoded')) {
      try {
        const data = await new Promise((resolve) => {
          let raw = '';
          req.on('data', (chunk) => { raw += chunk; });
          req.on('end', () => resolve(raw));
        });
        if (data) {
          if (ctype.includes('application/json')) {
            req.body = JSON.parse(data);
          } else {
            req.body = Object.fromEntries(new URLSearchParams(data));
          }
          req._body = true;
        }
      } catch (e) {
        console.error('Body parse error:', e.message);
      }
    }
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
