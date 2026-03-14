const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Get all plans
router.get('/', requireAdmin, (req, res) => {
  const plans = db.prepare('SELECT * FROM plans ORDER BY name ASC').all();
  const withCounts = plans.map(p => ({
    ...p,
    user_count: db.prepare('SELECT COUNT(*) as c FROM users WHERE plan_id = ? AND status = ?').get(p.id, 'active').c
  }));
  res.json({ plans: withCounts });
});

// Create plan
router.post('/', requireAdmin, (req, res) => {
  const { name, color, max_users, max_sales, max_inventory, description, features } = req.body;
  if (!name) return res.status(400).json({ error: 'Name required' });
  const id = uuidv4();
  db.prepare(`INSERT INTO plans (id, name, color, max_users, max_sales, max_inventory, description, features)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(id, name, color || '#e6a817',
    max_users || 0, max_sales || 0, max_inventory || 0,
    description || '', JSON.stringify(features || {}));
  res.json({ id, success: true });
});

// Update plan
router.patch('/:id', requireAdmin, (req, res) => {
  const { name, color, max_users, max_sales, max_inventory, description, features } = req.body;
  db.prepare(`UPDATE plans SET
    name = COALESCE(?, name),
    color = COALESCE(?, color),
    max_users = COALESCE(?, max_users),
    max_sales = COALESCE(?, max_sales),
    max_inventory = COALESCE(?, max_inventory),
    description = COALESCE(?, description),
    features = COALESCE(?, features),
    updated_at = strftime('%s', 'now')
    WHERE id = ?`).run(
    name || null, color || null,
    max_users != null ? parseInt(max_users) : null,
    max_sales != null ? parseInt(max_sales) : null,
    max_inventory != null ? parseInt(max_inventory) : null,
    description || null,
    features ? JSON.stringify(features) : null,
    req.params.id
  );
  res.json({ success: true });
});

// Delete plan
router.delete('/:id', requireAdmin, (req, res) => {
  // Remove plan from users first
  db.prepare('UPDATE users SET plan_id = NULL WHERE plan_id = ?').run(req.params.id);
  db.prepare('DELETE FROM plans WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// Assign plan to user
router.post('/assign', requireAdmin, (req, res) => {
  const { user_id, plan_id } = req.body;
  db.prepare("UPDATE users SET plan_id = ?, updated_at = strftime('%s','now') WHERE id = ?")
    .run(plan_id || null, user_id);
  res.json({ success: true });
});

module.exports = router;
