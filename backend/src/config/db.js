const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/campus_lost_found';

let cached = global.mongoose;
if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

async function connectDB() {
  if (cached.conn) return cached.conn;
  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGO_URI);
  }
  try {
    cached.conn = await cached.promise;
  } catch (err) {
    cached.promise = null;
    throw new Error(`[db] connection error: ${err.message}`);
  }
  console.log(`[db] connected ${mongoose.connection.host}/${mongoose.connection.name}`);
  return cached.conn;
}

module.exports = connectDB;