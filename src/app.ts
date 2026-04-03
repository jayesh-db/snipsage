import express from 'express';
import cors from 'cors';
import path from 'path';
import authRoutes from './routes/auth';
import contentRoutes from './routes/content';
import chatRoutes from './routes/chat';

const app = express();

// ============================================================
// Middleware
// ============================================================

// ── Allowed origins ────────────────────────────────────────
// Build the list dynamically so no hardcoded production URL is needed.
const ALLOWED_ORIGINS: (string | RegExp)[] = [
  // Local development
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  // Chrome Extensions (all extension IDs)
  /^chrome-extension:\/\//,
  // Every Vercel preview / production deployment for this project
  /^https:\/\/[a-zA-Z0-9-]+(\.vercel\.app)$/,
];

// Optional custom domain (set FRONTEND_URL in Vercel project settings)
if (process.env.FRONTEND_URL) {
  ALLOWED_ORIGINS.push(process.env.FRONTEND_URL);
}

// CORS — allow requests from extension and dashboard
app.use(
  cors({
    origin: ALLOWED_ORIGINS,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  })
);

// Parse JSON bodies
app.use(express.json({ limit: '10mb' }));

// Parse URL-encoded bodies
app.use(express.urlencoded({ extended: true }));

// ============================================================
// API Routes
// ============================================================

app.use('/api/auth', authRoutes);
app.use('/api/content', contentRoutes);
app.use('/api/chat', chatRoutes);

// ============================================================
// Health Check
// ============================================================

app.get('/api/health', (_req, res) => {
  res.status(200).json({
    success: true,
    message: 'SnipSage API is running.',
    timestamp: new Date().toISOString(),
  });
});

// ============================================================
// Static Files — Serve Dashboard
// ============================================================

const publicPath = path.join(__dirname, '..', 'public');
app.use(express.static(publicPath));

// SPA fallback — serve index.html for all non-API routes
app.get('*', (_req, res) => {
  res.sendFile(path.join(publicPath, 'index.html'));
});

// ============================================================
// Global Error Handler
// ============================================================

app.use(
  (
    err: Error,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    console.error('Unhandled error:', err);
    res.status(500).json({
      success: false,
      message: 'Internal server error.',
    });
  }
);

export default app;
