require('dotenv').config();

const app = require('./app');
const db = require('./db/knex');
const OpenAI = require('openai');

const PORT = parseInt(process.env.PORT || '3001');

// ── OpenAI Key Validator ────────────────────────────────────
async function checkOpenAI() {
  const key = process.env.OPENAI_API_KEY;

  // No key set at all
  if (!key || key.trim() === '' || key === 'your_openai_api_key_here') {
    return { ok: false, reason: 'NOT_SET', message: 'OPENAI_API_KEY is not set in .env' };
  }

  // Looks like a valid key format (sk-...)
  if (!key.startsWith('sk-')) {
    return { ok: false, reason: 'INVALID_FORMAT', message: `Key doesn't start with "sk-" — check your .env` };
  }

  // Live ping — list models (lightest possible OpenAI API call)
  try {
    const openai = new OpenAI({ apiKey: key });
    await openai.models.list();
    const masked = key.slice(0, 7) + '...' + key.slice(-4);
    return { ok: true, masked };
  } catch (err) {
    if (err.status === 401) {
      return { ok: false, reason: 'INVALID_KEY', message: 'API key is invalid or revoked (401 Unauthorized)' };
    }
    if (err.status === 429) {
      return { ok: false, reason: 'RATE_LIMITED', message: 'API key is valid but rate-limited (429) — you may have quota issues' };
    }
    if (err.code === 'ENOTFOUND' || err.code === 'ECONNREFUSED') {
      return { ok: false, reason: 'NO_INTERNET', message: 'Cannot reach OpenAI — check your internet connection' };
    }
    return { ok: false, reason: 'UNKNOWN', message: err.message };
  }
}

// ── Main ────────────────────────────────────────────────────
async function startServer() {
  try {
    // 1. PostgreSQL ───────────────────────────────────────────
    console.log('\n🔌 Connecting to PostgreSQL...');
    console.log(`   Host     : ${process.env.DB_HOST || 'localhost'}`);
    console.log(`   Port     : ${process.env.DB_PORT || '5432'}`);
    console.log(`   Database : ${process.env.DB_NAME}`);
    console.log(`   User     : ${process.env.DB_USER}`);

    await db.raw('SELECT 1+1 AS result');

    const versionRow = await db.raw('SELECT version()');
    const pgVersion = versionRow.rows[0].version.split(' ').slice(0, 2).join(' ');
    console.log(`\n✅ PostgreSQL connected  →  ${pgVersion}`);

    // 2. OpenAI ──────────────────────────────────────────────
    console.log('\n🤖 Checking OpenAI API key...');
    const aiStatus = await checkOpenAI();

    if (aiStatus.ok) {
      console.log(`✅ OpenAI connected      →  Key: ${aiStatus.masked}`);
    } else {
      console.warn(`⚠️  OpenAI NOT connected  →  ${aiStatus.message}`);
      if (aiStatus.reason === 'NOT_SET') {
        console.warn('   → Set OPENAI_API_KEY in your .env file');
      } else if (aiStatus.reason === 'INVALID_KEY') {
        console.warn('   → Generate a new key at: https://platform.openai.com/api-keys');
      } else if (aiStatus.reason === 'RATE_LIMITED') {
        console.warn('   → Check usage limits at: https://platform.openai.com/usage');
      }
      console.warn('   ℹ️  Server will start but AI features (ticket creation, chat) will not work.\n');
    }

    // 3. HTTP Server ─────────────────────────────────────────
    const server = app.listen(PORT);

    // Handle port-in-use gracefully before the listen callback fires
    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.error(`\n❌ Port ${PORT} is already in use!`);
        console.error(`   → Another process is running on port ${PORT}.`);
        console.error(`   → Fix: Run this command to free it:\n`);
        console.error(`     Windows:  netstat -ano | findstr :${PORT}  then  taskkill /PID <pid> /F`);
        console.error(`     Mac/Linux: lsof -ti:${PORT} | xargs kill -9\n`);
        process.exit(1);
      } else {
        console.error('\n❌ Server error:', err.message);
        process.exit(1);
      }
    });

    server.on('listening', () => {
      console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('  🚀  Server is running');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`  HTTP      →  http://localhost:${PORT}`);
      console.log(`  Health    →  http://localhost:${PORT}/health`);
      console.log(`  DB Check  →  http://localhost:${PORT}/health/db`);
      console.log(`  Tickets   →  http://localhost:${PORT}/api/tickets`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`  Env       →  ${process.env.NODE_ENV || 'development'}`);
      console.log(`  CORS      →  ${process.env.CORS_ORIGIN || '*'}`);
      console.log(`  Database  →  ${aiStatus.ok ? '✅ PostgreSQL' : '✅ PostgreSQL'}  |  OpenAI: ${aiStatus.ok ? '✅ Connected' : '⚠️  Not connected'}`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    });

    // 4. Graceful Shutdown ────────────────────────────────────
    const shutdown = async (signal) => {
      console.log(`\n⚡ ${signal} received — shutting down gracefully...`);
      server.close(async () => {
        await db.destroy();
        console.log('👋 DB pool closed. Server stopped. Goodbye!\n');
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT',  () => shutdown('SIGINT'));

  } catch (err) {
    console.error('\n❌ Failed to start server:');
    console.error(`   ${err.message}\n`);

    if (err.code === 'ECONNREFUSED') {
      console.error('   → Is PostgreSQL running? Check DB_HOST and DB_PORT in .env');
    } else if (err.code === '3D000') {
      console.error(`   → Database "${process.env.DB_NAME}" does not exist. Run: CREATE DATABASE ${process.env.DB_NAME}`);
    } else if (err.code === '28P01') {
      console.error('   → Invalid PostgreSQL credentials. Check DB_USER and DB_PASSWORD in .env');
    }

    process.exit(1);
  }
}

startServer();
