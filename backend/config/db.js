const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    // Try connecting to the configured MongoDB URI first
    const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/animewch';
    
    try {
      const conn = await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 3000,
      });
      console.log(`✅ MongoDB connected: ${conn.connection.host}`);
      return;
    } catch (directError) {
      console.log('⚠️  Could not connect to local MongoDB, starting in-memory database...');
    }

    // Fallback: use mongodb-memory-server for zero-config development
    const { MongoMemoryServer } = require('mongodb-memory-server');
    const mongod = await MongoMemoryServer.create({
      instance: {
        launchTimeout: 60000,
      },
    });
    const memUri = mongod.getUri();
    const conn = await mongoose.connect(memUri);
    console.log(`✅ MongoDB Memory Server running at: ${conn.connection.host}`);
    console.log('📌 Note: Data will be lost on server restart. Install MongoDB for persistence.');

    // Cleanup on exit
    process.on('SIGINT', async () => {
      await mongod.stop();
      process.exit(0);
    });
    process.on('SIGTERM', async () => {
      await mongod.stop();
      process.exit(0);
    });
  } catch (error) {
    console.error(`❌ MongoDB connection error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
