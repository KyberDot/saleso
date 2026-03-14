const express = require('express');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const rateLimit = require('express-rate-limit');
const db = require('../db');
const ebay = require('../ebay');
const { requireAuth } = require('../middleware/auth');
const { sendInviteEmail, sendPasswordResetEmail } = require('../email');

const router = express.Router();

const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10, message: { error: 'Too many login attempts' } });

// Auth status
router.get('/status', (req, res) => {
  if (!req.session.userId) return res.json({ authenticated: false });
  const user = db.prepare('SELECT id, username, email, full_name, role, status, avatar_url, default_currency, ebay_username, ebay_user_id, created_at FROM users WHERE id = ? AND status = ?').get(req.session.userId, 'active');
  if (!user) return res.json({ authenticated: false });
  res.json({ authenticated: true, user });
});

// Login
router.post('/login', loginLimiter, async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

  const user = db.prepare('SELECT * FROM users WHERE (email = ? OR username = ?) AND status = ?').get(email, email, 'active');
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

  db.prepare(`UPDATE users SET last_login = strftime('%s', 'now') WHERE id = ?`).run(user.id);
  req.session.userId = user.id;
  req.session.save(() => {
    res.json({
      success: true,
      user: { id: user.id, username: user.username, email: user.email, role: user.role, avatar_url: user.avatar_url, default_currency: user.default_currency }
    });
  });
});

// Register via invite token
router.post('/register', async (req, res) => {
  const { token, username, password, full_name } = req.body;
  if (!token || !username || !password) return res.status(400).json({ error: 'Token, username and password required' });
  if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });

  const invite = db.prepare('SELECT * FROM invitations WHERE token = ? AND status = ?').get(token, 'pending');
  if (!invite) return res.status(400).json({ error: 'Invalid or expired invitation' });
  if (invite.expires_at < Date.now()) {
    db.prepare('UPDATE invitations SET status = ? WHERE id = ?').run('expired', invite.id);
    return res.status(400).json({ error: 'Invitation has expired' });
  }

  const existing = db.prepare('SELECT id FROM users WHERE username = ? OR email = ?').get(username, invite.email);
  if (existing) return res.status(400).json({ error: 'Username or email already taken' });

  const hash = await bcrypt.hash(password, 12);
  const userId = uuidv4();
  db.prepare(`INSERT INTO users (id, username, email, password_hash, full_name, role, status, invited_by) VALUES (?, ?, ?, ?, ?, 'user', 'active', ?)`)
    .run(userId, username, invite.email, hash, full_name || username, invite.invited_by);
  db.prepare(`UPDATE invitations SET status = ?, used_at = strftime('%s', 'now') WHERE id = ?`).run('used', invite.id);

  req.session.userId = userId;
  req.session.save(() => {
    res.json({ success: true });
  });
});

// Validate invite token
router.get('/invite/:token', (req, res) => {
  const invite = db.prepare('SELECT email, status, expires_at FROM invitations WHERE token = ?').get(req.params.token);
  if (!invite) return res.status(404).json({ error: 'Invalid invitation' });
  if (invite.status !== 'pending') return res.status(400).json({ error: 'Invitation already used or expired' });
  if (invite.expires_at < Date.now()) return res.status(400).json({ error: 'Invitation expired' });
  res.json({ email: invite.email, valid: true });
});

// Forgot password
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  const user = db.prepare('SELECT id, email FROM users WHERE email = ? AND status = ?').get(email, 'active');
  // Always return success to prevent email enumeration
  if (!user) return res.json({ success: true });

  const token = uuidv4() + uuidv4();
  const expiry = Date.now() + 60 * 60 * 1000; // 1 hour
  db.prepare('DELETE FROM password_resets WHERE user_id = ?').run(user.id);
  db.prepare('INSERT INTO password_resets (id, user_id, token, expires_at) VALUES (?, ?, ?, ?)').run(uuidv4(), user.id, token, expiry);
  await sendPasswordResetEmail(user.email, token);
  res.json({ success: true });
});

// Reset password
router.post('/reset-password', async (req, res) => {
  const { token, password } = req.body;
  if (!token || !password) return res.status(400).json({ error: 'Token and password required' });
  if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });

  const reset = db.prepare('SELECT * FROM password_resets WHERE token = ? AND used_at IS NULL').get(token);
  if (!reset || reset.expires_at < Date.now()) return res.status(400).json({ error: 'Invalid or expired reset token' });

  const hash = await bcrypt.hash(password, 12);
  db.prepare(`UPDATE users SET password_hash = ?, updated_at = strftime('%s', 'now') WHERE id = ?`).run(hash, reset.user_id);
  db.prepare(`UPDATE password_resets SET used_at = strftime('%s', 'now') WHERE id = ?`).run(reset.id);
  res.json({ success: true });
});

// Logout
router.post('/logout', (req, res) => {
  req.session.destroy(() => res.json({ success: true }));
});

// eBay connect - from within user account
router.get('/ebay/connect', requireAuth, (req, res) => {
  if (!process.env.EBAY_CLIENT_ID || !process.env.EBAY_CLIENT_SECRET) {
    return res.status(500).json({ error: 'eBay API not configured on server' });
  }
  const state = uuidv4();
  req.session.oauthState = state;
  req.session.oauthUserId = req.user.id;
  const authUrl = ebay.getAuthUrl(state);
  res.json({ authUrl });
});

// eBay OAuth callback
router.get('/ebay/callback', async (req, res) => {
  const { code, error } = req.query;
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

  if (error) return res.redirect(`${frontendUrl}/settings?ebay_error=${encodeURIComponent(error)}`);
  if (!code) return res.redirect(`${frontendUrl}/settings?ebay_error=no_code`);

  const userId = req.session.oauthUserId || req.session.userId;
  if (!userId) return res.redirect(`${frontendUrl}/login?error=session_expired`);

  try {
    const tokenData = await ebay.exchangeCodeForToken(code);
    const expiry = Date.now() + (tokenData.expires_in * 1000);

    let ebayUser = {};
    try { ebayUser = await ebay.getUserProfile(tokenData.access_token); } catch (e) {
      console.log('Could not fetch eBay profile (non-critical):', e.message);
    }

    // Use 'connected' as fallback so ebay_username is never empty string
    const ebayUserId = ebayUser.userId || ebayUser.username || 'ebay_user';
    const ebayUsername = ebayUser.username || ebayUser.userId || 'connected';

    db.prepare(`UPDATE users SET ebay_user_id = ?, ebay_username = ?, ebay_access_token = ?, ebay_refresh_token = ?, ebay_token_expiry = ?, updated_at = strftime('%s','now') WHERE id = ?`)
      .run(ebayUserId, ebayUsername, tokenData.access_token, tokenData.refresh_token, expiry, userId);

    req.session.userId = userId;
    req.session.save(() => res.redirect(`${frontendUrl}/settings?ebay_success=true`));
  } catch (err) {
    res.redirect(`${frontendUrl}/settings?ebay_error=${encodeURIComponent(err.message)}`);
  }
});

// Disconnect eBay
router.post('/ebay/disconnect', requireAuth, (req, res) => {
  db.prepare('UPDATE users SET ebay_user_id = NULL, ebay_username = NULL, ebay_access_token = NULL, ebay_refresh_token = NULL, ebay_token_expiry = NULL WHERE id = ?').run(req.user.id);
  res.json({ success: true });
});

module.exports = router;

// ── eBay Marketplace Account Deletion Notification ──────────────────────────
// Required by eBay developer compliance
// Register this URL in your eBay app settings:
//   https://YOUR_DOMAIN/api/ebay/deletion-notification

const crypto = require('crypto');

// GET - eBay sends a challenge to verify endpoint ownership
router.get('/ebay-deletion', (req, res) => {
  const { challenge_code } = req.query;
  if (!challenge_code) return res.status(400).json({ error: 'No challenge code' });

  const verificationToken = process.env.EBAY_DELETION_TOKEN || 'saleso-deletion-verification-token';
  const endpoint = (process.env.EBAY_DELETION_ENDPOINT || `${process.env.FRONTEND_URL}/api/ebay-deletion`);

  // eBay requires: SHA256(challengeCode + verificationToken + endpoint)
  const hash = crypto.createHash('sha256')
    .update(challenge_code + verificationToken + endpoint)
    .digest('hex');

  res.json({ challengeResponse: hash });
});

// POST - eBay notifies when a user closes their eBay account
router.post('/ebay-deletion', express.json(), (req, res) => {
  const { notification } = req.body || {};
  if (!notification) return res.status(400).json({ error: 'Invalid payload' });

  const ebayUserId = notification?.data?.userId;
  const username = notification?.data?.username;

  if (ebayUserId || username) {
    // Find and anonymise the user - keep sales data for records but remove personal info
    try {
      const user = db.prepare('SELECT id FROM users WHERE ebay_user_id = ? OR ebay_username = ?')
        .get(ebayUserId || '', username || '');

      if (user) {
        // Disconnect eBay tokens and anonymise
        db.prepare(`UPDATE users SET
          ebay_user_id = NULL,
          ebay_username = NULL,
          ebay_access_token = NULL,
          ebay_refresh_token = NULL,
          ebay_token_expiry = NULL,
          status = 'deleted',
          updated_at = strftime('%s','now')
          WHERE id = ?`).run(user.id);

        // Anonymise sales data - remove buyer usernames
        db.prepare(`UPDATE sales SET buyer_username = '[deleted]' WHERE user_id = ?`).run(user.id);

        console.log(`eBay deletion notice processed for user: ${user.id}`);
      }
    } catch (err) {
      console.error('Deletion handler error:', err.message);
    }
  }

  // Always return 200 to acknowledge receipt
  res.status(200).json({ acknowledged: true });
});
