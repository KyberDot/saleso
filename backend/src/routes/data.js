const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const ebay = require('../ebay');
const { requireAuth, requireEbay } = require('../middleware/auth');

// ── INVENTORY ──────────────────────────────────────────────────────────────

const inventoryRouter = express.Router();

inventoryRouter.get('/', requireAuth, (req, res) => {
  const { search, limit = 200, offset = 0, sort = 'updated_at', dir = 'desc' } = req.query;
  const user = req.user;
  const markup = 1 + ((user.rate_markup || 0) / 100);

  let query = 'SELECT * FROM tracked_items WHERE user_id = ?';
  const params = [user.id];
  if (search) {
    query += ' AND (title LIKE ? OR sku LIKE ? OR custom_label LIKE ? OR tags LIKE ?)';
    const s = `%${search}%`;
    params.push(s, s, s, s);
  }
  const allowedSort = ['quantity_available','price','cost_price','sold_30d','revenue_30d','listing_status','updated_at']
  const sortCol = allowedSort.includes(sort) ? sort : 'updated_at'
  const sortDir = dir === 'asc' ? 'ASC' : 'DESC'
  query += ` ORDER BY ${sortCol} ${sortDir} LIMIT ? OFFSET ?`;
  params.push(parseInt(limit), parseInt(offset));

  const items = db.prepare(query).all(...params);
  const total = db.prepare('SELECT COUNT(*) as count FROM tracked_items WHERE user_id = ?').get(user.id);
  const since30 = Date.now() - 30 * 24 * 60 * 60 * 1000;

  const enriched = items.map(item => {
    const rs = db.prepare('SELECT SUM(quantity) as sold_30d, SUM(total_price) as revenue_30d FROM sales WHERE user_id = ? AND (sku = ? OR item_id = ?) AND sale_date >= ?')
      .get(user.id, item.sku || '', item.item_id, since30);
    const itemMarkup = 1 + ((item.rate_markup || 0) / 100)
    return {
      ...item,
      currency: user.default_currency || item.currency,
      display_price: item.price ? item.price * itemMarkup : null,
      sold_30d: rs?.sold_30d || 0,
      revenue_30d: rs?.revenue_30d ? rs.revenue_30d * itemMarkup : 0,
    };
  });

  res.json({ items: enriched, total: total.count });
});

inventoryRouter.get('/:id', requireAuth, (req, res) => {
  const item = db.prepare('SELECT * FROM tracked_items WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!item) return res.status(404).json({ error: 'Item not found' });
  const sales = db.prepare('SELECT * FROM sales WHERE user_id = ? AND (sku = ? OR item_id = ?) ORDER BY sale_date DESC LIMIT 50')
    .all(req.user.id, item.sku || '', item.item_id);
  res.json({ item, sales });
});

inventoryRouter.patch('/:id', requireAuth, (req, res) => {
  const { notes, tags, cost_price, quantity_available, custom_label, rate_markup, shipping_cost } = req.body;
  db.prepare(`UPDATE tracked_items SET notes=COALESCE(?,notes), tags=COALESCE(?,tags), cost_price=COALESCE(?,cost_price), quantity_available=COALESCE(?,quantity_available), custom_label=COALESCE(?,custom_label), rate_markup=COALESCE(?,rate_markup), shipping_cost=COALESCE(?,shipping_cost), updated_at=strftime('%s','now') WHERE id=? AND user_id=?`)
    .run(notes, tags, cost_price != null ? parseFloat(cost_price) : null, quantity_available != null ? parseInt(quantity_available) : null, custom_label, rate_markup != null ? parseFloat(rate_markup) : null, shipping_cost != null ? parseFloat(shipping_cost) : null, req.params.id, req.user.id);
  res.json({ success: true });
});

inventoryRouter.delete('/:id', requireAuth, (req, res) => {
  db.prepare('DELETE FROM tracked_items WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
  res.json({ success: true });
});

inventoryRouter.post('/sync', requireAuth, requireEbay, async (req, res) => {
  try {
    const token = await ebay.getValidToken(req.user, db);
    let allItems = [], offset = 0, hasMore = true;
    while (hasMore) {
      const response = await ebay.ebayGet('/sell/inventory/v1/inventory_item', token, { limit: 200, offset });
      const items = response.inventoryItems || [];
      allItems = allItems.concat(items);
      if (items.length < 200) hasMore = false; else offset += 200;
    }

    let synced = 0;
    for (const item of allItems) {
      const { sku } = item;
      const product = item.product || {};
      const qty = item.availability?.shipToLocationAvailability?.quantity || 0;
      const existing = db.prepare('SELECT id FROM tracked_items WHERE user_id = ? AND sku = ?').get(req.user.id, sku);
      if (existing) {
        db.prepare("UPDATE tracked_items SET title=?, quantity_available=?, image_url=?, condition=?, updated_at=strftime('%s','now') WHERE id=?")
          .run(product.title || '', qty, product.imageUrls?.[0] || '', item.condition || '', existing.id);
      } else {
        db.prepare("INSERT OR IGNORE INTO tracked_items (id,user_id,item_id,sku,title,quantity_available,image_url,condition,currency) VALUES (?,?,?,?,?,?,?,?,'GBP')")
          .run(uuidv4(), req.user.id, sku, sku, product.title || '', qty, product.imageUrls?.[0] || '', item.condition || '');
      }
      synced++;
    }

    // Also extract items from order history
    const orderItems = db.prepare('SELECT DISTINCT item_id, item_title, sku, custom_label FROM sales WHERE user_id = ?').all(req.user.id);
    for (const oi of orderItems) {
      if (!oi.item_id) continue;
      const exists = db.prepare('SELECT id FROM tracked_items WHERE user_id = ? AND item_id = ?').get(req.user.id, oi.item_id);
      if (!exists) {
        db.prepare("INSERT OR IGNORE INTO tracked_items (id,user_id,item_id,sku,custom_label,title,currency) VALUES (?,?,?,?,?,?,'GBP')")
          .run(uuidv4(), req.user.id, oi.item_id, oi.sku || '', oi.custom_label || '', oi.item_title || '');
        synced++;
      }
    }
    res.json({ success: true, synced });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── ORDERS ─────────────────────────────────────────────────────────────────

const ordersRouter = express.Router();

ordersRouter.get('/', requireAuth, (req, res) => {
  const { search, from, to, limit = 50, offset = 0 } = req.query;
  const user = req.user;
  const markup = 1 + ((user.rate_markup || 0) / 100);

  let query = `SELECT order_id, MAX(buyer_username) as buyer_username, MAX(sale_date) as sale_date,
    MAX(payment_status) as payment_status, MAX(shipping_status) as shipping_status,
    MAX(tracking_number) as tracking_number, MAX(buyer_country) as buyer_country,
    MAX(currency) as currency, SUM(total_price) as total_price,
    SUM(quantity) as total_items, COUNT(*) as line_items,
    SUM(ebay_fees) as ebay_fees, SUM(postage_cost) as postage_cost, SUM(net_profit) as net_profit
    FROM sales WHERE user_id = ?`;
  const params = [user.id];
  if (from) { query += ' AND sale_date >= ?'; params.push(parseInt(from)); }
  if (to) { query += ' AND sale_date <= ?'; params.push(parseInt(to)); }
  if (search) {
    query += ' AND (order_id LIKE ? OR buyer_username LIKE ? OR item_title LIKE ? OR sku LIKE ?)';
    const s = `%${search}%`;
    params.push(s, s, s, s);
  }
  query += ' GROUP BY order_id ORDER BY sale_date DESC LIMIT ? OFFSET ?';
  params.push(parseInt(limit), parseInt(offset));

  const orders = db.prepare(query).all(...params);
  const enriched = orders.map(o => {
    const lineItems = db.prepare('SELECT item_id, item_title, sku, custom_label, quantity, sale_price, total_price FROM sales WHERE user_id = ? AND order_id = ?')
      .all(user.id, o.order_id);
    return {
      ...o,
      currency: user.default_currency || o.currency,
      total_price: o.total_price ? o.total_price * markup : 0,
      net_profit: o.net_profit ? o.net_profit * markup : 0,
      lineItems,
    };
  });

  const totalCount = db.prepare('SELECT COUNT(DISTINCT order_id) as count FROM sales WHERE user_id = ?').get(user.id);
  res.json({ orders: enriched, total: totalCount.count });
});

// ── STATS ──────────────────────────────────────────────────────────────────

const statsRouter = express.Router();

statsRouter.get('/monthly', requireAuth, (req, res) => {
  const user = req.user;
  const markup = 1 + ((user.rate_markup || 0) / 100);
  const monthly = db.prepare(`
    SELECT strftime('%Y-%m', sale_date/1000, 'unixepoch') as month,
      COUNT(DISTINCT order_id) as orders, SUM(quantity) as items_sold,
      SUM(total_price) as gross_revenue, SUM(net_profit) as net_profit, SUM(ebay_fees) as fees
    FROM sales WHERE user_id = ?
    GROUP BY month ORDER BY month DESC LIMIT 24
  `).all(user.id).map(m => ({
    ...m,
    gross_revenue: m.gross_revenue ? m.gross_revenue * markup : 0,
    net_profit: m.net_profit ? m.net_profit * markup : 0,
  }));
  res.json({ monthly });
});

statsRouter.get('/sync-log', requireAuth, (req, res) => {
  const logs = db.prepare('SELECT * FROM sync_log WHERE user_id = ? ORDER BY created_at DESC LIMIT 20').all(req.user.id);
  res.json({ logs });
});

module.exports = { inventoryRouter, ordersRouter, statsRouter };
