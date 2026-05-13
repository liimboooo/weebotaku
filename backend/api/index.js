const dotenv = require('dotenv');
dotenv.config();

const connectDB = require('../config/db');
const app = require('../app');

let serverReady = false;

// Vercel serverless entry point
module.exports = async (req, res) => {
  if (!serverReady) {
    try {
      await connectDB();
      serverReady = true;
    } catch (err) {
      console.error('DB connection failed:', err.message);
      res.status(500).json({ success: false, message: 'Database connection failed' });
      return;
    }
  }
  app(req, res);
};
