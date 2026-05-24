const router = require('express').Router();
const db     = require('../db');
const { verifyToken, can } = require('../middleware/auth');

router.use(verifyToken);

router.get('/', can('admin'), async (req, res, next) => {
  try {
    const { user_id, action, page = 1 } = req.query;
    const limit  = 50;
    const offset = (page - 1) * limit;
    const conditions = [];
    const params = [];
    let p = 1;
    if (user_id) { conditions.push(`user_id = $${p++}`); params.push(user_id); }
    if (action)  { conditions.push(`action ILIKE $${p++}`); params.push(`%${action}%`); }
    const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
    const { rows } = await db.query(
      `SELECT id, user_id, user_name, role, action, details, ip, created_at FROM audit_logs ${where} ORDER BY created_at DESC LIMIT $${p++} OFFSET $${p++}`,
      [...params, limit, offset]
    );
    res.json({ logs: rows, page: Number(page) });
  } catch (err) { next(err); }
});

module.exports = router;
