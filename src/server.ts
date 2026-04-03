import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import app from './app';

const PORT = parseInt(process.env.PORT || '3000', 10);
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/snipsage';

async function startServer(): Promise<void> {
  try {
    // Connect to MongoDB
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ MongoDB connected successfully.');

    // Log vector store mode
    const vectorStoreType = process.env.VECTOR_STORE_TYPE || 'memory';
    console.log(`📦 Vector store mode: ${vectorStoreType}`);

    // Start Express server
    app.listen(PORT, () => {
      console.log(`\n🚀 SnipSage server running at http://localhost:${PORT}`);
      console.log(`📊 Dashboard:  http://localhost:${PORT}`);
      console.log(`🔗 API:        http://localhost:${PORT}/api`);
      console.log(`💚 Health:     http://localhost:${PORT}/api/health\n`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down gracefully...');
  await mongoose.connection.close();
  console.log('✅ MongoDB connection closed.');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await mongoose.connection.close();
  process.exit(0);
});

startServer();
