const router = require('express').Router();
const db     = require('../db');
const { verifyToken, withTenant } = require('../middleware/auth');

router.use(verifyToken);

router.get('/', async (req, res, next) => {
  try {
    const tid = withTenant(req);
    const { rows } = await db.query(
      'SELECT * FROM audit_logs WHERE tenant_id=$1 ORDER BY created_at DESC LIMIT 100',
      [tid]
    );
    res.json({ logs: rows });
  } catch(err) { next(err); }
});

module.exports = router;
