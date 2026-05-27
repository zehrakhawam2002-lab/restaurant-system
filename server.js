require('dotenv').config();
const express     = require('express');
const helmet      = require('helmet');
const cors        = require('cors');
const rateLimit   = require('express-rate-limit');
const morgan      = require('morgan');
const compression = require('compression');
const { createServer } = require('http');
const { Server }  = require('socket.io');

const app    = express();
const server = createServer(app);
const io     = new Server(server, { cors: { origin: '*' } });
app.set('io', io);
app.set('trust proxy', 1);

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});
app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(cors({ origin: '*', credentials: false }));
app.use(rateLimit({ windowMs: 60 * 1000, max: 200 }));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(compression());
app.use(morgan('dev'));

app.use('/api/auth',      require('./routes/auth'));
app.use('/api/orders',    require('./routes/orders'));
app.use('/api/menu',      require('./routes/menu'));
app.use('/api/inventory', require('./routes/inventory'));
app.use('/api/staff',     require('./routes/staff'));
app.use('/api/branches',  require('./routes/branches'));
app.use('/api/reports',   require('./routes/reports'));
app.use('/api/tables',    require('./routes/tables'));
app.use('/api/audit',     require('./routes/audit'));
app.use('/api/tenants',   require('./routes/tenants'));

app.get('/health', (req, res) => res.json({ status: 'ok', time: new Date() }));
app.get('/test-db', async (req, res) => {
  try {
    const db = require('./db');
    const result = await db.query('SELECT COUNT(*) FROM tenants');
    res.json({ tenants_count: result.rows[0].count, db: 'connected' });
  } catch(err) {
    res.json({ error: err.message });
  }
});
app.use((req, res) => res.status(404).json({ error: 'Route not found' }));
app.use((err, req, res, next) => {
  console.error('[ERROR]', err.message);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => console.log(`🚀 RestaurantOS running on port ${PORT}`));
