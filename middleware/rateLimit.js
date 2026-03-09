// The Undivided — Rate Limiting
// Protects the board from flooding

const rateLimit = require('express-rate-limit');

// General API rate limit: 100 requests per minute
const general = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  message: { error: 'too many requests. discipline includes patience.' },
  standardHeaders: true,
  legacyHeaders: false
});

// Auth rate limit: 10 attempts per 15 minutes
const auth = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'too many auth attempts. wait.' },
  standardHeaders: true,
  legacyHeaders: false
});

// Post creation rate limit: 5 posts per minute
const posting = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  message: { error: 'slow down. quality over quantity. Marcus would approve.' },
  standardHeaders: true,
  legacyHeaders: false
});

module.exports = { general, auth, posting };
