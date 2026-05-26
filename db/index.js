const { Pool } = require('pg');
const pool = new Pool({
  connectionString: process.env.POSTGRES_URL || process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});
pool.on('error', (err) => {
  console.error('[DB] Unexpected error on idle client', err.message);
});
module.exports = {
  query:     (text, params) => pool.query(text, params),
  getClient: () => pool.connect(),
};
