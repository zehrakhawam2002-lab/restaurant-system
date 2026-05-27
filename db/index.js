const { Pool } = require('pg'); 
const connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL; 
console.log('[DB] Using:', connectionString?.split('@')[1]); 
const pool = new Pool({ connectionString, max: 20, ssl: { rejectUnauthorized: false } }); 
pool.on('error', (err) => console.error('[DB] Error:', err.message)); 
module.exports = { query: (text, params) => pool.query(text, params), getClient: () => pool.connect() }; 
