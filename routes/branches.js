const router = require('express').Router();
const db     = require('../db');
const { verifyToken, withTenant } = require('../middleware/auth');

router.use(verifyToken);

router.get('/', async (req, res, next) => {
  try {
    const { rows } = await db.query('SELECT * FROM branches WHERE tenant_id=$1 AND is_active=true ORDER BY id', [withTenant(req)]);
    res.json(rows);
  } catch(err) { next(err); }
});

router.post('/', async (req, res, next) => {
  try {
    const { name, address, phone } = req.body;
    const { rows:[b] } = await db.query(
      'INSERT INTO branches (tenant_id,name,address,phone) VALUES ($1,$2,$3,$4) RETURNING *',
      [withTenant(req), name, address||'', phone||'']
    );
    res.status(201).json(b);
  } catch(err) { next(err); }
});

module.exports = router;
