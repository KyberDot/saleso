const db = require('../db');

function requireAuth(req, res, next) {
  if (!req.session.userId) return res.status(401).json({ error: 'Not authenticated' });
  const user = db.prepare('SELECT * FROM users WHERE id = ? AND status = ?').get(req.session.userId, 'active');
  if (!user) return res.status(401).json({ error: 'User not found or inactive' });
  req.user = user;
  next();
}

function requireAdmin(req, res, next) {
  if (!req.session.userId) return res.status(401).json({ error: 'Not authenticated' });
  const user = db.prepare('SELECT * FROM users WHERE id = ? AND status = ?').get(req.session.userId, 'active');
  if (!user) return res.status(401).json({ error: 'User not found' });
  if (user.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });
  req.user = user;
  next();
}

function requireEbay(req, res, next) {
  if (!req.user.ebay_access_token) {
    return res.status(403).json({ error: 'eBay account not connected', code: 'EBAY_NOT_CONNECTED' });
  }
  next();
}

module.exports = { requireAuth, requireAdmin, requireEbay };
