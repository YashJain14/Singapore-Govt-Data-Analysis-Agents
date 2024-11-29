// lib/db/connect.ts
import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI;
const DB_CONNECTION_TIMEOUT = 15000; // 15 seconds

if (!MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable');
}

interface GlobalWithMongoose {
  mongoose: {
    conn: typeof mongoose | null;
    promise: Promise<typeof mongoose> | null;
  };
}

declare const global: GlobalWithMongoose;

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

export async function connectToDatabase() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: true,
      serverSelectionTimeoutMS: DB_CONNECTION_TIMEOUT,
      socketTimeoutMS: DB_CONNECTION_TIMEOUT,
      connectTimeoutMS: DB_CONNECTION_TIMEOUT,
    };

    cached.promise = mongoose.connect(MONGODB_URI!, opts);
  }

  try {
    cached.conn = await cached.promise;
    return cached.conn;
  } catch (e) {
    cached.promise = null;
    throw e;
  }
}