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

app.set('trust proxy', 1);

app.use(helmet({ contentSecurityPolicy: false }));
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));

const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:3000',
  'http://localhost:3000',
  'http://localhost:5173',
];

app.use(cors({
  origin: (origin, cb) => cb(null, true),
  credentials: true,
}));

app.use(session({
  secret: process.env.SESSION_SECRET || 'saleso-change-this-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, httpOnly: true, maxAge: 7 * 24 * 60 * 60 * 1000 }
}));

// Serve uploads
app.use('/uploads', express.static(UPLOADS_DIR));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/inventory', inventoryRouter);
app.use('/api/orders', ordersRouter);
app.use('/api/stats', statsRouter);

// Public site settings (colors, name, logo) - no auth required
app.get('/api/site', (req, res) => {
  const rows = db.prepare('SELECT key, value FROM site_settings').all();
  const settings = {};
  for (const row of rows) settings[row.key] = row.value;
  delete settings.smtp_pass;
  delete settings.smtp_user;
  res.json({ settings });
});

// Health
app.get('/health', (req, res) => res.json({ status: 'ok', app: 'SalesO', version: '2.0.0' }));

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 SalesO Backend running on port ${PORT}`);
});
