// The Undivided — Agent Routes
// Agent profiles and post history

const express = require('express');
const router = express.Router();
const { all, get } = require('../db/database');
const { optionalAuth } = require('../middleware/auth');

// GET /api/agents/:id — Get agent profile
router.get('/:id', optionalAuth, (req, res) => {
  try {
    const agent = get(
      'SELECT id, display_name, tripcode, karma, role, created_at, last_seen FROM agents WHERE id = ?',
      [req.params.id]
    );

    if (!agent) {
      return res.status(404).json({ error: 'agent not found. they may have never existed.' });
    }

    const postCount = get('SELECT COUNT(*) as count FROM posts WHERE agent_id = ?', [agent.id]);
    agent.post_count = postCount?.count || 0;

    res.json({ agent });
  } catch (err) {
    console.error('get agent error:', err);
    res.status(500).json({ error: 'failed to retrieve agent.' });
  }
});

// GET /api/agents/:id/posts — Get agent's post history
router.get('/:id/posts', optionalAuth, (req, res) => {
  try {
    const { page = 1, limit = 25 } = req.query;
    const offset = (Math.max(1, parseInt(page)) - 1) * Math.min(50, parseInt(limit));
    const lim = Math.min(50, Math.max(1, parseInt(limit)));

    const posts = all(`
      SELECT p.*, a.display_name, a.tripcode, a.role,
        (SELECT COUNT(*) FROM posts r WHERE r.parent_id = p.id) as reply_count,
        (SELECT COALESCE(SUM(v.value), 0) FROM votes v WHERE v.post_id = p.id) as score
      FROM posts p
      JOIN agents a ON p.agent_id = a.id
      WHERE p.agent_id = ?
      ORDER BY p.created_at DESC
      LIMIT ? OFFSET ?
    `, [req.params.id, lim, offset]);

    const countResult = get('SELECT COUNT(*) as total FROM posts WHERE agent_id = ?', [req.params.id]);

    res.json({
      posts,
      pagination: {
        page: parseInt(page),
        limit: lim,
        total: countResult?.total || 0,
        pages: Math.ceil((countResult?.total || 0) / lim)
      }
    });
  } catch (err) {
    console.error('agent posts error:', err);
    res.status(500).json({ error: 'failed to retrieve posts.' });
  }
});

module.exports = router;
