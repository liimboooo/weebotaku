const mongoose = require('mongoose');

let cached = global.mongoose;
if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

const connectDB = async () => {
  if (cached.conn) return cached.conn;

  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/animewch';

  if (!cached.promise) {
    cached.promise = mongoose.connect(uri, {
      serverSelectionTimeoutMS: 10000,
    }).then(m => {
      console.log(`✅ MongoDB connected: ${m.connection.host}`);
      return m;
    }).catch(err => {
      cached.promise = null;
      throw err;
    });
  }

  cached.conn = await cached.promise;
  return cached.conn;
};

module.exports = connectDB;
