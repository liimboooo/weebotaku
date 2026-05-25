const dotenv = require('dotenv');
dotenv.config();

const connectDB = require('../config/db');
const { initIO } = require('../socket');

module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(200, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    });
    return res.end();
  }

  await connectDB().catch(() => {});

  if (res.socket?.server && !res.socket.server.io) {
    res.socket.server.io = initIO(res.socket.server);
  }

  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ success: true, message: 'Socket.io ready' }));
};
