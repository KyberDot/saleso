const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const session = require('express-session');
const path = require('path');

const db = require('./db');
const authRoutes = require('./routes/auth');
const usersRoutes = require('./routes/users');
const adminRoutes = require('./routes/admin');
const salesRoutes = require('./routes/sales');
const { inventoryRouter, ordersRouter, statsRouter } = require('./routes/data');

const app = express();
const PORT = process.env.PORT || 3001;
const UPLOADS_DIR = db.UPLOADS_DIR;

// Public folder where frontend build is copied
const PUBLIC_DIR = path.join(__dirname, '../public');

app.set('trust proxy', 1);

app.use(helmet({ contentSecurityPolicy: false }));
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));

app.use(cors({
  origin: (origin, cb) => cb(null, true),
  credentials: true,
}));

app.use(session({
  secret: process.env.SESSION_SECRET || 'saleso-change-this-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 7 * 24 * 60 * 60 * 1000,
    sameSite: process.env.NODE_ENV === 'production' ? 'lax' : 'lax'
  }
}));

// Serve uploads
app.use('/uploads', express.static(UPLOADS_DIR));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/inventory', inventoryRouter);
app.use('/api/orders', ordersRouter);
app.use('/api/stats', statsRouter);

// Public site settings
app.get('/api/site', (req, res) => {
  const rows = db.prepare('SELECT key, value FROM site_settings').all();
  const settings = {};
  for (const row of rows) settings[row.key] = row.value;
  delete settings.smtp_pass;
  delete settings.smtp_user;
  res.json({ settings });
});

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok', app: 'SalesO', version: '2.0.0' }));

// Serve frontend static files
app.use(express.static(PUBLIC_DIR));

// SPA fallback - all non-API routes serve index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 SalesO running on port ${PORT}`);
  console.log(`   Frontend: served from ${PUBLIC_DIR}`);
  console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
});
