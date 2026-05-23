const dotenv = require('dotenv');
const connectDB = require('./config/db');

dotenv.config();

const start = async () => {
  try {
    await connectDB();
    const app = require('./app');
    const PORT = process.env.PORT;
    app.listen(PORT, () => {
      console.log(`🚀 AnimeWch API running on port ${PORT}`);
      console.log(`📡 Environment: ${process.env.NODE_ENV}`);
    });
  } catch (err) {
    console.error('❌ Failed to start server:', err.message);
    process.exit(1);
  }
};

start();
