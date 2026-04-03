/**
 * MongoDB connection utility with serverless-safe caching.
 *
 * In a serverless environment (Vercel), each warm invocation reuses the same
 * Node.js module context, so a cached connection avoids the overhead of
 * re-connecting on every request. The `global._mongooseCache` object persists
 * across warm invocations within the same function instance.
 */

import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error(
    'Please define the MONGODB_URI environment variable in .env or Vercel project settings.'
  );
}

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

// Extend the global object so TypeScript knows about our cache
declare global {
  // eslint-disable-next-line no-var
  var _mongooseCache: MongooseCache | undefined;
}

// Reuse the cached connection if it already exists (warm invocation)
const cached: MongooseCache = global._mongooseCache ?? { conn: null, promise: null };
global._mongooseCache = cached;

/**
 * Connect to MongoDB, returning the cached connection if already open.
 */
export default async function connectDB(): Promise<typeof mongoose> {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    cached.promise = mongoose
      .connect(MONGODB_URI as string, {
        // Disable Mongoose's internal buffering — fail fast if not connected
        bufferCommands: false,
      })
      .then((m) => m);
  }

  try {
    cached.conn = await cached.promise;
  } catch (err) {
    // Reset so the next invocation retries
    cached.promise = null;
    throw err;
  }

  return cached.conn;
}
