/**
 * Vercel Serverless Function — SnipSage API Entry Point
 *
 * Wraps the existing Express `app` as a Vercel serverless function.
 * MongoDB connection is cached at the module level so warm invocations
 * reuse the same connection without reconnecting.
 *
 * Vercel's @vercel/node builder compiles this file independently — it is NOT
 * part of the main tsconfig.json "include". All src/ imports resolve via
 * relative paths.
 */

import 'dotenv/config';
import connectDB from '../src/lib/mongodb';
import app from '../src/app';

// Module-level: connection promise runs once per cold start, then is cached.
const dbReady = connectDB();

// Vercel invokes this function for every /api/* request.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default async function handler(req: any, res: any): Promise<void> {
  await dbReady;
  app(req, res);
}
