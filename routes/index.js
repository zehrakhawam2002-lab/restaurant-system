const { Pool } = require('pg');

const connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL;
console.log('[DB] Connecting to:', connectionString?.replace(/:([^@]+)@/, ':***@'));

const pool = new Pool({
  connectionString,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

pool.on('connect', () => console.log('[DB] Connected successfully'));
pool.on('error', (err) => console.error('[DB] Error:', err.message));

module.exports = {
  query:     (text, params) => pool.query(text, params),
  getClient: () => pool.connect(),
};
