import mongoose, { Mongoose } from "mongoose";

const MONGODB_URL = process.env.MONGODB_URL;

interface MongooseConnection {
  conn: Mongoose | null;
  promise: Promise<Mongoose> | null;
}

// Define the type for global mongoose cache without using 'var'
type GlobalMongoose = {
  mongoose?: MongooseConnection;
}

// Extend the NodeJS.Global interface
declare global {
  // eslint-disable-next-line no-unused-vars
  interface Global extends GlobalMongoose {}
}

// Initialize cached with proper typing
let cached: MongooseConnection = (global as GlobalMongoose).mongoose || {
  conn: null,
  promise: null,
};

if (!cached) {
  cached = (global as GlobalMongoose).mongoose = {
    conn: null,
    promise: null,
  };
}

export const connectToDatabase = async () => {
  if (cached.conn) return cached.conn;

  if (!MONGODB_URL) throw new Error("Missing MONGODB_URL");

  cached.promise =
    cached.promise ||
    mongoose.connect(MONGODB_URL, {
      dbName: "ServerlessInstance",
      bufferCommands: false,
    });
  
  console.log("connected to mongo");
  cached.conn = await cached.promise;

  return cached.conn;
};