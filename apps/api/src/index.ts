import express from 'express';
import cors from 'cors';
import { config } from './config';
import { authRouter } from './routes/auth.routes';
import { adminRouter } from './routes/admin.routes';
import { restaurantRouter } from './routes/restaurant.routes';
import { errorHandler } from './middleware/errorHandler';
import { scheduler } from './services/schedulerService';
import { runSeed } from './db/seed';

const app = express();

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'Daily Drop Restaurant Partner API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

// Versioned API Routes
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/admin', adminRouter);
app.use('/api/v1/restaurant', restaurantRouter);

// Centralized Error Handler
app.use(errorHandler);

// Initialize database and start server
async function startServer() {
  try {
    // Run initial seed if database is fresh
    await runSeed();

    // Start background task scheduler
    scheduler.start(30000);

    app.listen(config.port, () => {
      console.log(`====================================================`);
      console.log(` Daily Drop Restaurant Partner API Server Started`);
      console.log(` URL: http://localhost:${config.port}`);
      console.log(` Health: http://localhost:${config.port}/api/health`);
      console.log(` Database: SQLite (${config.dbPath})`);
      console.log(` Uploads: ${config.uploadDir}`);
      console.log(`====================================================`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

startServer();
