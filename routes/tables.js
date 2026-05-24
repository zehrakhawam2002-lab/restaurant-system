const router = require('express').Router();
const db     = require('../db');
const { verifyToken, withTenant } = require('../middleware/auth');

router.use(verifyToken);

router.get('/', async (req, res, next) => {
  try {
    const { rows } = await db.query('SELECT * FROM tables WHERE tenant_id=$1 ORDER BY number', [withTenant(req)]);
    res.json(rows);
  } catch(err) { next(err); }
});

router.post('/', async (req, res, next) => {
  try {
    const tid = withTenant(req);
    const { number, capacity, branch_id } = req.body;
    const { rows:[t] } = await db.query(
      'INSERT INTO tables (tenant_id,branch_id,number,capacity) VALUES ($1,$2,$3,$4) RETURNING *',
      [tid, branch_id||1, number, capacity||4]
    );
    res.status(201).json(t);
  } catch(err) { next(err); }
});

router.patch('/:id/status', async (req, res, next) => {
  try {
    const { rows:[t] } = await db.query(
      'UPDATE tables SET status=$1 WHERE id=$2 AND tenant_id=$3 RETURNING *',
      [req.body.status, req.params.id, withTenant(req)]
    );
    res.json(t);
  } catch(err) { next(err); }
});

module.exports = router;
