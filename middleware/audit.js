const db = require('../db');

const logAudit = async (req, action, details = {}) => {
  try {
    await db.query(`
      INSERT INTO audit_logs (user_id, user_name, role, action, details, ip, user_agent)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [
      req.user?.id    || null,
      req.user?.name  || 'anonymous',
      req.user?.role  || null,
      action,
      JSON.stringify(details),
      req.ip,
      req.headers['user-agent']?.substring(0, 200) || '',
    ]);
  } catch (err) {
    console.error('[AUDIT ERROR]', err.message);
  }
};

module.exports = { logAudit };
