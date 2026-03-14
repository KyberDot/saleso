const express = require('express');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { requireAdmin } = require('../middleware/auth');
const { sendInviteEmail } = require('../email');

const router = express.Router();
const UPLOADS_DIR = db.UPLOADS_DIR;

// Logo upload
const logoStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(UPLOADS_DIR, 'logo');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const variant = req.params.variant || 'dark';
    cb(null, `logo-${variant}${ext}`);
  }
});
const logoUpload = multer({ storage: logoStorage, limits: { fileSize: 5 * 1024 * 1024 } });

// ── Users ──────────────────────────────────────────

// List all users
router.get('/users', requireAdmin, (req, res) => {
  const users = db.prepare('SELECT id, username, email, role, status, avatar_url, default_currency, ebay_username, last_login, created_at, invited_by, plan_id FROM users ORDER BY created_at DESC').all();
  const plans = db.prepare('SELECT id, name, color FROM plans').all();
  const planMap = Object.fromEntries(plans.map(p => [p.id, p]));
  users.forEach(u => { u.plan = u.plan_id ? planMap[u.plan_id] || null : null; });
  res.json({ users });
});

// Update user (role, status)
router.patch('/users/:id', requireAdmin, async (req, res) => {
  const { role, status, password, plan_id } = req.body;
  if (req.params.id === req.user.id && status === 'inactive') {
    return res.status(400).json({ error: 'Cannot deactivate your own account' });
  }

  let hash = undefined;
  if (password) {
    if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });
    hash = await bcrypt.hash(password, 12);
  }

  db.prepare(`UPDATE users SET
    role = COALESCE(?, role),
    status = COALESCE(?, status),
    password_hash = COALESCE(?, password_hash),
    updated_at = strftime('%s','now')
    WHERE id = ?
  `).run(role || null, status || null, hash || null, req.params.id);

  res.json({ success: true });
});

// Delete user
router.delete('/users/:id', requireAdmin, (req, res) => {
  if (req.params.id === req.user.id) return res.status(400).json({ error: 'Cannot delete your own account' });
  db.prepare('UPDATE users SET status = ? WHERE id = ?').run('deleted', req.params.id);
  res.json({ success: true });
});

// ── Invitations ─────────────────────────────────────

// List invitations
router.get('/invitations', requireAdmin, (req, res) => {
  const invites = db.prepare(`
    SELECT i.*, u.username as invited_by_username
    FROM invitations i
    LEFT JOIN users u ON i.invited_by = u.id
    ORDER BY i.created_at DESC
  `).all();
  res.json({ invites });
});

// Create invitation
router.post('/invitations', requireAdmin, async (req, res) => {
  const { email, send_email, plan_id } = req.body;
  if (!email) return res.status(400).json({ error: 'Email required' });

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) return res.status(400).json({ error: 'User with this email already exists' });

  const pendingInvite = db.prepare('SELECT id FROM invitations WHERE email = ? AND status = ?').get(email, 'pending');
  if (pendingInvite) {
    db.prepare('UPDATE invitations SET status = ? WHERE id = ?').run('cancelled', pendingInvite.id);
  }

  const token = uuidv4() + uuidv4();
  const expiry = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 days
  const id = uuidv4();

  db.prepare('INSERT INTO invitations (id, token, email, invited_by, expires_at) VALUES (?, ?, ?, ?, ?)').run(id, token, email, req.user.id, expiry);

  let emailResult = { success: false, reason: 'Email not requested' };
  if (send_email) {
    emailResult = await sendInviteEmail(email, token, req.user.username);
  }

  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  res.json({
    success: true,
    token,
    invite_url: `${frontendUrl}/register?token=${token}`,
    email_sent: emailResult.success,
    email_error: emailResult.reason
  });
});

// Revoke invitation
router.delete('/invitations/:id', requireAdmin, (req, res) => {
  db.prepare('UPDATE invitations SET status = ? WHERE id = ?').run('cancelled', req.params.id);
  res.json({ success: true });
});

// ── Site Settings ────────────────────────────────────

// Get all settings
router.get('/settings', requireAdmin, (req, res) => {
  const rows = db.prepare('SELECT key, value FROM site_settings').all();
  const settings = {};
  for (const row of rows) settings[row.key] = row.value;
  // Don't return SMTP password
  delete settings.smtp_pass;
  res.json({ settings });
});

// Update settings
router.patch('/settings', requireAdmin, (req, res) => {
  const { settings } = req.body;
  if (!settings || typeof settings !== 'object') return res.status(400).json({ error: 'Settings object required' });

  const allowedKeys = [
    'site_name', 'primary_color', 'secondary_color', 'accent_color',
    'background_color', 'card_color', 'text_color',
    'allow_registration', 'require_invite',
    'smtp_host', 'smtp_port', 'smtp_user', 'smtp_pass', 'smtp_from', 'smtp_secure',
    'logo_width', 'logo_height', 'username_color',
    'sidebar_show_text', 'login_show_text', 'dark_mode_default',
    'login_logo_width', 'login_logo_height', 'site_url', 'support_email'
  ];

  const update = db.prepare(`INSERT OR REPLACE INTO site_settings (key, value, updated_at) VALUES (?, ?, strftime('%s', 'now'))`);
  for (const [key, value] of Object.entries(settings)) {
    if (allowedKeys.includes(key) && value !== undefined) {
      update.run(key, String(value));
    }
  }
  res.json({ success: true });
});

// Upload logo (variant = dark or light)
router.post('/settings/logo/:variant', requireAdmin, logoUpload.single('logo'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const variant = req.params.variant === 'light' ? 'light' : 'dark';
  const logoUrl = `/uploads/logo/${req.file.filename}`;
  const key = variant === 'light' ? 'site_logo_light' : 'site_logo_dark';
  db.prepare('INSERT OR REPLACE INTO site_settings (key, value) VALUES (?, ?)').run(key, logoUrl);
  // Keep site_logo as the dark version for backwards compat
  if (variant === 'dark') {
    db.prepare('INSERT OR REPLACE INTO site_settings (key, value) VALUES (?, ?)').run('site_logo', logoUrl);
  }
  res.json({ success: true, logo_url: logoUrl, variant });
});

// Upload favicon
const faviconStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(UPLOADS_DIR, 'logo');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `favicon${ext}`);
  }
});
const faviconUpload = multer({ storage: faviconStorage, limits: { fileSize: 1 * 1024 * 1024 } });

router.post('/settings/favicon', requireAdmin, faviconUpload.single('logo'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const url = `/uploads/logo/${req.file.filename}`;
  db.prepare('INSERT OR REPLACE INTO site_settings (key, value) VALUES (?, ?)').run('site_favicon', url);
  res.json({ success: true, favicon_url: url });
});

router.delete('/settings/favicon', requireAdmin, (req, res) => {
  db.prepare('INSERT OR REPLACE INTO site_settings (key, value) VALUES (?, ?)').run('site_favicon', '');
  res.json({ success: true });
});

// Upload eBay sync logo
const ebayLogoStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(UPLOADS_DIR, 'logo');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `ebay-sync${ext}`);
  }
});
const ebayLogoUpload = multer({ storage: ebayLogoStorage, limits: { fileSize: 2 * 1024 * 1024 } });

router.post('/settings/ebay-logo', requireAdmin, ebayLogoUpload.single('logo'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const logoUrl = `/uploads/logo/${req.file.filename}`;
  db.prepare('INSERT OR REPLACE INTO site_settings (key, value) VALUES (?, ?)').run('ebay_sync_logo', logoUrl);
  res.json({ success: true, logo_url: logoUrl });
});

router.delete('/settings/ebay-logo', requireAdmin, (req, res) => {
  db.prepare('INSERT OR REPLACE INTO site_settings (key, value) VALUES (?, ?)').run('ebay_sync_logo', '');
  res.json({ success: true });
});

// Delete logo
router.delete('/settings/logo/:variant', requireAdmin, (req, res) => {
  const variant = req.params.variant === 'light' ? 'light' : 'dark';
  const key = variant === 'light' ? 'site_logo_light' : 'site_logo_dark';
  db.prepare('INSERT OR REPLACE INTO site_settings (key, value) VALUES (?, ?)').run(key, '');
  if (variant === 'dark') {
    db.prepare('INSERT OR REPLACE INTO site_settings (key, value) VALUES (?, ?)').run('site_logo', '');
  }
  res.json({ success: true });
});

// Test SMTP
router.post('/settings/test-smtp', requireAdmin, async (req, res) => {
  const { sendInviteEmail: testEmail } = require('../email');
  const result = await testEmail(req.user.email, 'test-token-000', req.user.username);
  res.json({ success: result.success, error: result.reason });
});

// Stats overview for admin
router.get('/stats', requireAdmin, (req, res) => {
  const totalUsers = db.prepare('SELECT COUNT(*) as c FROM users WHERE status = ?').get('active').c;
  const totalSales = db.prepare('SELECT COUNT(*) as c FROM sales').get().c;
  const totalRevenue = db.prepare('SELECT SUM(total_price) as s FROM sales').get().s || 0;
  const pendingInvites = db.prepare('SELECT COUNT(*) as c FROM invitations WHERE status = ?').get('pending').c;
  res.json({ totalUsers, totalSales, totalRevenue, pendingInvites });
});

module.exports = router;
