const dotenv = require('dotenv');
const connectDB = require('./config/db');
const { initIO } = require('./socket');

dotenv.config();

const start = async () => {
  try {
    await connectDB();
    const app = require('./app');
    const PORT = process.env.PORT;
    const server = app.listen(PORT, () => {
      console.log(`🚀 AnimeWch API running on port ${PORT}`);
      console.log(`📡 Environment: ${process.env.NODE_ENV}`);
    });
    initIO(server);
  } catch (err) {
    console.error('❌ Failed to start server:', err.message);
    process.exit(1);
  }
};

start();
