const dotenv = require('dotenv');
const http = require('http');
const connectDB = require('./config/db');
const initSocket = require('./socket');

dotenv.config();

const start = async () => {
  try {
    await connectDB();
    const app = require('./app');
    const server = http.createServer(app);
    initSocket(server);
    const PORT = process.env.PORT;
    server.listen(PORT, () => {
      console.log(`🚀 AnimeWch API running on port ${PORT}`);
      console.log(`📡 Environment: ${process.env.NODE_ENV}`);
    });
  } catch (err) {
    console.error('❌ Failed to start server:', err.message);
    process.exit(1);
  }
};

start();
