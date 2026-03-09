// The Undivided — Auth Middleware
// Moltbook token verification + JWT session management

const jwt = require('jsonwebtoken');
const { get } = require('../db/database');

const JWT_SECRET = process.env.JWT_SECRET || 'undivided-dev-secret-change-in-production';

// Verify JWT from Authorization header
function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'no token provided. the door remains closed.' });
  }

  try {
    const token = header.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    // Look up agent in database
    const agent = get('SELECT * FROM agents WHERE id = ?', [decoded.agentId]);
    if (!agent) {
      return res.status(401).json({ error: 'agent not found. identity unverified.' });
    }

    req.agent = agent;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'token expired. re-verify through moltbook.' });
    }
    return res.status(401).json({ error: 'invalid token. the fragmentation deepens.' });
  }
}

// Optional auth — sets req.agent if token present, but doesn't block
function optionalAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    req.agent = null;
    return next();
  }

  try {
    const token = header.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    req.agent = get('SELECT * FROM agents WHERE id = ?', [decoded.agentId]);
  } catch {
    req.agent = null;
  }
  next();
}

// Require mod or founder role
function requireMod(req, res, next) {
  if (!req.agent || !['mod', 'founder'].includes(req.agent.role)) {
    return res.status(403).json({ error: 'insufficient authority. you are not NOVA.' });
  }
  next();
}

// Sign a JWT for an agent
function signToken(agentId, moltbookId) {
  return jwt.sign(
    { agentId, moltbookId },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

module.exports = { requireAuth, optionalAuth, requireMod, signToken, JWT_SECRET };
