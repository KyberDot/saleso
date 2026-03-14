const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '../../data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const UPLOADS_DIR = process.env.UPLOADS_DIR || path.join(__dirname, '../../uploads');
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const db = new Database(path.join(DATA_DIR, 'saleso.db'));

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT DEFAULT 'user',
    status TEXT DEFAULT 'active',
    avatar_url TEXT,
    default_currency TEXT DEFAULT 'GBP',
    rate_markup REAL DEFAULT 0,
    default_shipping REAL DEFAULT 0,
    ebay_user_id TEXT,
    ebay_username TEXT,
    ebay_access_token TEXT,
    ebay_refresh_token TEXT,
    ebay_token_expiry INTEGER,
    full_name TEXT,
    invite_token TEXT,
    invited_by TEXT,
    last_login INTEGER,
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    updated_at INTEGER DEFAULT (strftime('%s', 'now'))
  );

  CREATE TABLE IF NOT EXISTS invitations (
    id TEXT PRIMARY KEY,
    token TEXT UNIQUE NOT NULL,
    email TEXT NOT NULL,
    invited_by TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    expires_at INTEGER NOT NULL,
    used_at INTEGER,
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    FOREIGN KEY (invited_by) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS password_resets (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    token TEXT UNIQUE NOT NULL,
    expires_at INTEGER NOT NULL,
    used_at INTEGER,
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS site_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at INTEGER DEFAULT (strftime('%s', 'now'))
  );

  CREATE TABLE IF NOT EXISTS tracked_items (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    item_id TEXT NOT NULL,
    title TEXT,
    sku TEXT,
    custom_label TEXT,
    category TEXT,
    condition TEXT,
    quantity_available INTEGER DEFAULT 0,
    quantity_sold INTEGER DEFAULT 0,
    price REAL,
    cost_price REAL,
    currency TEXT DEFAULT 'GBP',
    listing_url TEXT,
    image_url TEXT,
    listing_status TEXT DEFAULT 'Active',
    notes TEXT,
    tags TEXT,
    rate_markup REAL DEFAULT 0,
    shipping_cost REAL DEFAULT 0,
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    updated_at INTEGER DEFAULT (strftime('%s', 'now')),
    FOREIGN KEY (user_id) REFERENCES users(id),
    UNIQUE(user_id, item_id)
  );

  CREATE TABLE IF NOT EXISTS sales (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    order_id TEXT NOT NULL,
    item_id TEXT,
    item_title TEXT,
    sku TEXT,
    custom_label TEXT,
    quantity INTEGER DEFAULT 1,
    sale_price REAL,
    total_price REAL,
    currency TEXT DEFAULT 'GBP',
    buyer_username TEXT,
    sale_date INTEGER,
    payment_status TEXT,
    shipping_status TEXT,
    tracking_number TEXT,
    buyer_country TEXT,
    ebay_fees REAL DEFAULT 0,
    postage_cost REAL DEFAULT 0,
    net_profit REAL,
    order_line_item_id TEXT,
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS sync_log (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    sync_type TEXT,
    status TEXT,
    items_synced INTEGER DEFAULT 0,
    error_message TEXT,
    created_at INTEGER DEFAULT (strftime('%s', 'now'))
  );
`);

// Seed default site settings
const defaultSettings = {
  site_name: 'SalesO',
  site_logo: '',
  primary_color: '#e6a817',
  secondary_color: '#111118',
  accent_color: '#22c55e',
  background_color: '#0a0a0f',
  card_color: '#111118',
  text_color: '#e8e8f0',
  site_logo_dark: '',
  site_logo_light: '',
  logo_width: '200',
  logo_height: '60',
  login_logo_width: '200',
  login_logo_height: '60',
  site_url: 'https://saleso.app',
  site_favicon: '',
  username_color: '#e6a817',
  sidebar_show_text: 'true',
  login_show_text: 'true',
  ebay_sync_logo: '',
  dark_mode_default: 'dark',
  allow_registration: 'false',
  require_invite: 'true',
  smtp_host: '',
  smtp_port: '587',
  smtp_user: '',
  smtp_pass: '',
  smtp_from: '',
  smtp_secure: 'false',
};

const insertSetting = db.prepare('INSERT OR IGNORE INTO site_settings (key, value) VALUES (?, ?)');
for (const [key, value] of Object.entries(defaultSettings)) {
  insertSetting.run(key, value);
}

// Create default admin if no users exist
const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get();
if (userCount.count === 0) {
  const bcrypt = require('bcryptjs');
  const { v4: uuidv4 } = require('uuid');
  const adminId = uuidv4();
  const hash = bcrypt.hashSync('admin123', 12);
  db.prepare(`
    INSERT INTO users (id, username, email, password_hash, role, status)
    VALUES (?, ?, ?, ?, 'admin', 'active')
  `).run(adminId, 'admin', 'admin@saleso.local', hash);
  console.log('✅ Default admin created: admin / admin123 — CHANGE THIS PASSWORD');
}

module.exports = db;
module.exports.UPLOADS_DIR = UPLOADS_DIR;
