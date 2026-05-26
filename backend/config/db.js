const mongoose = require('mongoose');

let cached = global.mongoose;
if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

mongoose.set('bufferCommands', false);

const connectDB = async () => {
  if (cached.conn) {
    if (mongoose.connection.readyState === 1) return cached.conn;
    cached.conn = null;
    cached.promise = null;
  }

  const uri = process.env.MONGODB_URI;

  if (!cached.promise) {
    cached.promise = mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 5000,
      maxPoolSize: 5,
      minPoolSize: 1,
      socketTimeoutMS: 20000,
      maxIdleTimeMS: 30000,
      family: 4,
      autoIndex: process.env.NODE_ENV !== 'production',
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
