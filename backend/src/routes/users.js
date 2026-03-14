const express = require('express');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
const UPLOADS_DIR = db.UPLOADS_DIR;

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(UPLOADS_DIR, 'avatars');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `avatar-${req.user.id}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, allowed.includes(ext));
  }
});

// Get own profile
router.get('/me', requireAuth, (req, res) => {
  const user = db.prepare('SELECT id, username, email, role, status, avatar_url, default_currency, rate_markup, default_shipping, ebay_username, ebay_user_id, last_login, created_at FROM users WHERE id = ?').get(req.user.id);
  res.json({ user });
});

// Update profile
router.patch('/me', requireAuth, async (req, res) => {
  const { username, email, default_currency, rate_markup, default_shipping } = req.body;

  if (username) {
    const existing = db.prepare('SELECT id FROM users WHERE username = ? AND id != ?').get(username, req.user.id);
    if (existing) return res.status(400).json({ error: 'Username already taken' });
  }
  if (email) {
    const existing = db.prepare('SELECT id FROM users WHERE email = ? AND id != ?').get(email, req.user.id);
    if (existing) return res.status(400).json({ error: 'Email already in use' });
  }

  db.prepare(`UPDATE users SET
    username = COALESCE(?, username),
    email = COALESCE(?, email),
    default_currency = COALESCE(?, default_currency),
    rate_markup = COALESCE(?, rate_markup),
    default_shipping = COALESCE(?, default_shipping),
    updated_at = strftime('%s','now')
    WHERE id = ?
  `).run(username || null, email || null, default_currency || null,
    rate_markup != null ? parseFloat(rate_markup) : null,
    default_shipping != null ? parseFloat(default_shipping) : null,
    req.user.id);

  const updated = db.prepare('SELECT id, username, email, role, avatar_url, default_currency, rate_markup, default_shipping, ebay_username FROM users WHERE id = ?').get(req.user.id);
  res.json({ success: true, user: updated });
});

// Change password
router.post('/me/password', requireAuth, async (req, res) => {
  const { current_password, new_password } = req.body;
  if (!current_password || !new_password) return res.status(400).json({ error: 'Both passwords required' });
  if (new_password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });

  const user = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(req.user.id);
  const valid = await bcrypt.compare(current_password, user.password_hash);
  if (!valid) return res.status(400).json({ error: 'Current password incorrect' });

  const hash = await bcrypt.hash(new_password, 12);
  db.prepare('UPDATE users SET password_hash = ?, updated_at = strftime(%s, now) WHERE id = ?').run(hash, req.user.id);
  res.json({ success: true });
});

// Upload avatar
router.post('/me/avatar', requireAuth, upload.single('avatar'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const avatarUrl = `/uploads/avatars/${req.file.filename}`;
  db.prepare('UPDATE users SET avatar_url = ?, updated_at = strftime(%s, now) WHERE id = ?').run(avatarUrl, req.user.id);
  res.json({ success: true, avatar_url: avatarUrl });
});

// Delete avatar
router.delete('/me/avatar', requireAuth, (req, res) => {
  db.prepare('UPDATE users SET avatar_url = NULL WHERE id = ?').run(req.user.id);
  res.json({ success: true });
});

module.exports = router;
