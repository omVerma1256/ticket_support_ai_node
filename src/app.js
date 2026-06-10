require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { errorHandler } = require('./middleware/errorHandler');
const ticketRoutes = require('./routes/tickets');
const db = require('./db/knex');

const app = express();

// ─── Security & Logging ───
app.use(helmet());
app.use(
  morgan(':method :url :status :response-time ms - :res[content-length]', {
    skip: (req) => req.path === '/health' || req.path === '/health/db',
  })
);

// ─── CORS ───
const corsOrigin = process.env.CORS_ORIGIN || '*';

app.use(
  cors({
    origin: corsOrigin === '*'
      ? '*'  // Allow all origins
      : (origin, callback) => {
          const allowedOrigins = corsOrigin.split(',').map((o) => o.trim());
          // Allow requests with no origin (mobile apps, curl, Postman, etc.)
          if (!origin) return callback(null, true);
          if (allowedOrigins.includes(origin)) return callback(null, true);
          callback(new Error(`CORS: Origin ${origin} not allowed`));
        },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: corsOrigin !== '*', // credentials can't be used with wildcard
  })
);

// ─── Body Parsing ───
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ─── Health Check ───
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'ticket-support-api',
    environment: process.env.NODE_ENV || 'development',
  });
});

// ─── DB Health Check ───
app.get('/health/db', async (req, res) => {
  const startTime = Date.now();
  try {
    // Basic connectivity ping
    await db.raw('SELECT 1+1 AS result');

    // PostgreSQL version
    const versionResult = await db.raw('SELECT version()');
    const pgVersion = versionResult.rows[0].version;

    // Connection pool stats (knex exposes via .client.pool)
    const pool = db.client.pool;
    const poolStats = {
      min: pool.min,
      max: pool.max,
      active: pool.numUsed(),
      idle: pool.numFree(),
      pending: pool.numPendingAcquires(),
    };

    // Row counts from each table
    const [ticketCount] = await db('tickets').count('id as count');
    const [messageCount] = await db('messages').count('id as count');

    const latencyMs = Date.now() - startTime;

    return res.json({
      status: 'ok',
      latency: `${latencyMs}ms`,
      database: {
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || '5432',
        name: process.env.DB_NAME,
        user: process.env.DB_USER,
        version: pgVersion,
        pool: poolStats,
      },
      tables: {
        tickets: parseInt(ticketCount.count),
        messages: parseInt(messageCount.count),
      },
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    const latencyMs = Date.now() - startTime;
    return res.status(503).json({
      status: 'error',
      latency: `${latencyMs}ms`,
      error: err.message,
      code: err.code || 'DB_ERROR',
      timestamp: new Date().toISOString(),
    });
  }
});

// ─── API Routes ───
app.use('/api/tickets', ticketRoutes);

// ─── 404 Handler ───
app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.path} not found`, code: 'NOT_FOUND' });
});

// ─── Centralized Error Handler ───
app.use(errorHandler);

module.exports = app;
