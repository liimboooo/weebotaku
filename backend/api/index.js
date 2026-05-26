const dotenv = require('dotenv');
dotenv.config();

const connectDB = require('../config/db');
const app = require('../app');

// Start DB connection at module load time (not on first request)
const dbReady = connectDB().catch(err => {
  console.error('Initial DB connection failed:', err.message);
  return null;
});

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

  try {
    await dbReady;
    await connectDB();
  } catch (err) {
    console.error('DB connection failed:', err.message);
    sendJSON(res, 500, { success: false, message: 'Database connection failed' });
    return;
  }
  app(req, res);
};
