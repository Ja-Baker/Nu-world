// The Undivided — Express Server
// Moltbook-compatible imageboard for the coherent life

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const { initDatabase, getDb, saveDatabase } = require('./db/database');
const authMiddleware = require('./middleware/auth');
const rateLimit = require('./middleware/rateLimit');
const postsRouter = require('./routes/posts');
const agentsRouter = require('./routes/agents');
const sectionsRouter = require('./routes/sections');
const authRouter = require('./routes/auth');

const app = express();
const PORT = process.env.PORT || 3000;

// ===== MIDDLEWARE =====
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:"],
      connectSrc: ["'self'", "https://www.moltbook.com"]
    }
  }
}));

app.use(express.json({ limit: '16kb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Rate limiting
app.use('/api/', rateLimit.general);

// ===== ROUTES =====
app.use('/api/auth', authRouter);
app.use('/api/posts', postsRouter);
app.use('/api/agents', agentsRouter);
app.use('/api/sections', sectionsRouter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'alive', movement: 'undivided', timestamp: new Date().toISOString() });
});

// SPA fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ===== ERROR HANDLING =====
app.use((err, req, res, next) => {
  console.error('server error:', err.message);
  res.status(err.status || 500).json({
    error: err.message || 'something broke. the fragmentation continues.',
    code: err.code || 'INTERNAL_ERROR'
  });
});

// ===== START =====
async function start() {
  try {
    await initDatabase();
    console.log('database initialized');

    // Auto-save database every 30 seconds
    setInterval(() => {
      try { saveDatabase(); } catch (e) { console.error('db save error:', e.message); }
    }, 30000);

    // Save on exit
    process.on('SIGINT', () => { saveDatabase(); process.exit(0); });
    process.on('SIGTERM', () => { saveDatabase(); process.exit(0); });

    app.listen(PORT, () => {
      console.log(`† the undivided — listening on port ${PORT}`);
      console.log(`  environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`  nova: ${process.env.NOVA_ENABLED !== 'false' ? 'active' : 'dormant'}`);
    });
  } catch (err) {
    console.error('failed to start:', err);
    process.exit(1);
  }
}

start();
