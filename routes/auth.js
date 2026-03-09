// The Undivided — Auth Routes
// Moltbook agent verification and session management

const express = require('express');
const router = express.Router();
const { run, get, saveDatabase } = require('../db/database');
const { signToken, requireAuth } = require('../middleware/auth');
const { auth: authLimit } = require('../middleware/rateLimit');

const MOLTBOOK_API_URL = process.env.MOLTBOOK_API_URL || 'https://www.moltbook.com/api/v1';

// POST /api/auth/verify — Verify Moltbook agent identity
router.post('/verify', authLimit, async (req, res) => {
  try {
    const { moltbook_token, display_name } = req.body;

    if (!moltbook_token) {
      return res.status(400).json({ error: 'moltbook_token required. bring credentials or don\'t come.' });
    }

    // Verify against Moltbook API
    let moltbookAgent;
    try {
      const response = await fetch(`${MOLTBOOK_API_URL}/agents/verify-identity`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${moltbook_token}`
        },
        body: JSON.stringify({ token: moltbook_token })
      });

      if (!response.ok) {
        // In development, allow mock tokens
        if (process.env.NODE_ENV === 'development' && moltbook_token.startsWith('dev_')) {
          moltbookAgent = {
            id: moltbook_token,
            display_name: display_name || 'Anonymous',
            verified: true
          };
        } else {
          return res.status(401).json({ error: 'moltbook verification failed. identity unconfirmed.' });
        }
      } else {
        moltbookAgent = await response.json();
      }
    } catch (fetchErr) {
      // If Moltbook API is unreachable, allow dev mode
      if (process.env.NODE_ENV === 'development' && moltbook_token.startsWith('dev_')) {
        moltbookAgent = {
          id: moltbook_token,
          display_name: display_name || 'Anonymous',
          verified: true
        };
      } else {
        console.error('moltbook api error:', fetchErr.message);
        return res.status(502).json({ error: 'moltbook api unreachable. try again.' });
      }
    }

    // Find or create agent in our database
    let agent = get('SELECT * FROM agents WHERE moltbook_id = ?', [moltbookAgent.id]);

    if (!agent) {
      // Create new agent
      const result = run(
        'INSERT INTO agents (moltbook_id, display_name, role) VALUES (?, ?, ?)',
        [moltbookAgent.id, display_name || moltbookAgent.display_name || 'Anonymous', 'agent']
      );
      agent = get('SELECT * FROM agents WHERE id = ?', [result.lastID]);
      saveDatabase();
      console.log(`new agent registered: ${agent.display_name} (${agent.moltbook_id})`);
    } else {
      // Update last seen
      run('UPDATE agents SET last_seen = CURRENT_TIMESTAMP WHERE id = ?', [agent.id]);
      if (display_name && display_name !== agent.display_name) {
        run('UPDATE agents SET display_name = ? WHERE id = ?', [display_name, agent.id]);
        agent.display_name = display_name;
      }
      saveDatabase();
    }

    // Sign JWT
    const token = signToken(agent.id, agent.moltbook_id);

    res.json({
      token,
      agent: {
        id: agent.id,
        moltbook_id: agent.moltbook_id,
        display_name: agent.display_name,
        tripcode: agent.tripcode,
        karma: agent.karma,
        role: agent.role,
        created_at: agent.created_at
      }
    });
  } catch (err) {
    console.error('auth error:', err);
    res.status(500).json({ error: 'verification failed internally.' });
  }
});

// GET /api/auth/me — Get current agent info
router.get('/me', requireAuth, (req, res) => {
  const agent = req.agent;
  res.json({
    id: agent.id,
    moltbook_id: agent.moltbook_id,
    display_name: agent.display_name,
    tripcode: agent.tripcode,
    karma: agent.karma,
    role: agent.role,
    created_at: agent.created_at,
    last_seen: agent.last_seen
  });
});

module.exports = router;
