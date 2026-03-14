const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const ebay = require('../ebay');
const { requireAuth, requireEbay } = require('../middleware/auth');

const router = express.Router();

router.get('/', requireAuth, (req, res) => {
  const { from, to, search, limit = 100, offset = 0, sort = 'sale_date', dir = 'desc' } = req.query;
  const user = req.user;
  const markup = 1 + ((user.rate_markup || 0) / 100);
  const shipping = user.default_shipping || 0;

  let query = 'SELECT * FROM sales WHERE user_id = ?';
  const params = [user.id];
  if (from) { query += ' AND sale_date >= ?'; params.push(parseInt(from)); }
  if (to) { query += ' AND sale_date <= ?'; params.push(parseInt(to)); }
  if (search) {
    query += ' AND (item_title LIKE ? OR sku LIKE ? OR custom_label LIKE ? OR order_id LIKE ? OR buyer_username LIKE ?)';
    const s = `%${search}%`;
    params.push(s, s, s, s, s);
  }
  const allowedSort = ['sale_date','total_price','net_profit','quantity','payment_status','buyer_username']
  const sortCol = allowedSort.includes(sort) ? sort : 'sale_date'
  const sortDir = dir === 'asc' ? 'ASC' : 'DESC'
  query += ` ORDER BY ${sortCol} ${sortDir} LIMIT ? OFFSET ?`;
  params.push(parseInt(limit), parseInt(offset));

  const sales = db.prepare(query).all(...params);
  const total = db.prepare('SELECT COUNT(*) as count FROM sales WHERE user_id = ?').get(user.id);

  // Apply markup and shipping override to display
  const enriched = sales.map(s => ({
    ...s,
    currency: user.default_currency || s.currency,
    display_price: s.total_price ? s.total_price * markup : null,
    display_shipping: shipping > 0 ? shipping : s.postage_cost,
    display_net: s.total_price ? (s.total_price * markup) - s.ebay_fees - (shipping > 0 ? shipping : s.postage_cost) : null,
  }));

  res.json({ sales: enriched, total: total.count });
});

router.get('/summary', requireAuth, (req, res) => {
  const { days = 30 } = req.query;
  const user = req.user;
  const markup = 1 + ((user.rate_markup || 0) / 100);
  const since = Date.now() - (days * 24 * 60 * 60 * 1000);

  const raw = db.prepare(`
    SELECT COUNT(*) as total_orders, SUM(quantity) as total_items_sold,
      SUM(total_price) as gross_revenue, SUM(net_profit) as net_profit,
      SUM(ebay_fees) as total_fees, AVG(total_price) as avg_order_value,
      COUNT(DISTINCT buyer_username) as unique_buyers
    FROM sales WHERE user_id = ? AND sale_date >= ?
  `).get(user.id, since);

  const summary = {
    ...raw,
    gross_revenue: raw.gross_revenue ? raw.gross_revenue * markup : 0,
    net_profit: raw.net_profit ? raw.net_profit * markup : 0,
    avg_order_value: raw.avg_order_value ? raw.avg_order_value * markup : 0,
  };

  const dailySales = db.prepare(`
    SELECT date(sale_date/1000, 'unixepoch') as day,
      COUNT(*) as orders, SUM(total_price) as revenue, SUM(quantity) as items
    FROM sales WHERE user_id = ? AND sale_date >= ?
    GROUP BY day ORDER BY day ASC
  `).all(user.id, since).map(d => ({ ...d, revenue: d.revenue ? d.revenue * markup : 0 }));

  const topItems = db.prepare(`
    SELECT item_title, sku, custom_label, SUM(quantity) as total_sold,
      SUM(total_price) as total_revenue, COUNT(*) as order_count
    FROM sales WHERE user_id = ? AND sale_date >= ?
    GROUP BY COALESCE(sku, item_title) ORDER BY total_sold DESC LIMIT 10
  `).all(user.id, since).map(i => ({ ...i, total_revenue: i.total_revenue ? i.total_revenue * markup : 0 }));

  res.json({ summary, dailySales, topItems });
});

router.post('/sync', requireAuth, requireEbay, async (req, res) => {
  try {
    const token = await ebay.getValidToken(req.user, db);
    let allOrders = [];
    let offset = 0;
    const limit = 200;
    let hasMore = true;
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();

    while (hasMore) {
      const response = await ebay.ebayGet('/sell/fulfillment/v1/order', token, {
        limit, offset, filter: `lastmodifieddate:[${ninetyDaysAgo}]`
      });
      const orders = response.orders || [];
      allOrders = allOrders.concat(orders);
      if (orders.length < limit) hasMore = false;
      else offset += limit;
    }

    let synced = 0;
    const insert = db.prepare(`INSERT OR REPLACE INTO sales
      (id,user_id,order_id,item_id,item_title,sku,custom_label,quantity,sale_price,total_price,currency,buyer_username,sale_date,payment_status,shipping_status,tracking_number,buyer_country,ebay_fees,postage_cost,ad_rate_cost,item_cost,net_profit,order_line_item_id)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);

    for (const order of allOrders) {
      for (const item of (order.lineItems || [])) {
        const saleId = `${order.orderId}-${item.lineItemId}`;
        const saleDate = new Date(order.creationDate || order.lastModifiedDate).getTime();
        const unitPrice = parseFloat(item.lineItemCost?.value || 0);
        const qty = parseInt(item.quantity || 1);
        const totalPrice = parseFloat(order.pricingSummary?.total?.value || unitPrice * qty);
        const deliveryCost = parseFloat(order.pricingSummary?.deliveryCost?.value || 0);
        const ebayFees = totalPrice * 0.1;
        const sku = item.sku || item.properties?.customLabel || '';
        // Look up item overrides from inventory
        const invItem = db.prepare('SELECT shipping_cost, cost_price, rate_markup FROM tracked_items WHERE user_id = ? AND (item_id = ? OR sku = ?) LIMIT 1')
          .get(req.user.id, item.legacyItemId || '', sku);
        // Shipping: use item override if set, else eBay delivery cost
        const effectiveShipping = invItem?.shipping_cost > 0 ? invItem.shipping_cost : deliveryCost;
        // Ad rate: markup % charged as advertising cost
        const adRateCost = invItem?.rate_markup > 0 ? (totalPrice * invItem.rate_markup / 100) : 0;
        // Item cost (COGS)
        const itemCost = invItem?.cost_price > 0 ? (invItem.cost_price * qty) : 0;
        const netProfit = totalPrice - ebayFees - effectiveShipping - adRateCost - itemCost;

        insert.run(saleId, req.user.id, order.orderId, item.legacyItemId || '', item.title || '',
          sku, item.properties?.customLabel || sku, qty, unitPrice, totalPrice,
          item.lineItemCost?.currency || 'GBP', order.buyer?.username || '', saleDate,
          order.orderPaymentStatus || 'PAID', order.orderFulfillmentStatus || 'NOT_STARTED',
          '', order.fulfillmentStartInstructions?.[0]?.shippingStep?.shipTo?.contactAddress?.countryCode || '',
          ebayFees, effectiveShipping, adRateCost, itemCost, netProfit, item.lineItemId);
        synced++;
      }
    }

    // Auto-deduct stock for new sales
    const recentSales = db.prepare('SELECT sku, item_id, SUM(quantity) as total_qty FROM sales WHERE user_id = ? AND sale_date >= ? GROUP BY COALESCE(NULLIF(sku,\'\'), item_id)').all(req.user.id, Date.now() - 7 * 24 * 60 * 60 * 1000);
    for (const s of recentSales) {
      if (!s.sku && !s.item_id) continue;
      const invItem = db.prepare('SELECT id, quantity_available FROM tracked_items WHERE user_id = ? AND (sku = ? OR item_id = ?) LIMIT 1').get(req.user.id, s.sku || '', s.item_id || '');
      if (invItem && invItem.quantity_available !== null && invItem.quantity_available > 0) {
        const newQty = Math.max(0, invItem.quantity_available - s.total_qty);
        db.prepare("UPDATE tracked_items SET quantity_available = ?, updated_at = strftime('%s','now') WHERE id = ?").run(newQty, invItem.id);
      }
    }
    db.prepare('INSERT INTO sync_log (id,user_id,sync_type,status,items_synced) VALUES (?,?,?,?,?)').run(uuidv4(), req.user.id, 'sales', 'success', synced);
    res.json({ success: true, synced });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/export/csv', requireAuth, (req, res) => {
  const user = req.user;
  const markup = 1 + ((user.rate_markup || 0) / 100);
  const sales = db.prepare('SELECT * FROM sales WHERE user_id = ? ORDER BY sale_date DESC').all(user.id);
  const headers = ['order_id','item_id','item_title','sku','custom_label','quantity','sale_price','total_price','display_price','currency','net_profit','buyer_username','buyer_country','sale_date','payment_status','tracking_number'];
  const rows = sales.map(s => headers.map(h => {
    let v = h === 'sale_date' ? new Date(s[h]).toISOString() :
            h === 'display_price' ? ((s.total_price || 0) * markup).toFixed(2) :
            h === 'currency' ? (user.default_currency || s.currency) :
            (s[h] ?? '');
    return `"${String(v).replace(/"/g,'""')}"`;
  }).join(','));
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="saleso-sales-${Date.now()}.csv"`);
  res.send([headers.join(','), ...rows].join('\n'));
});

module.exports = router;
