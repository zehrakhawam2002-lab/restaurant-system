const router = require('express').Router();
const db     = require('../db');
const { verifyToken, withTenant } = require('../middleware/auth');

router.use(verifyToken);

router.get('/', async (req, res, next) => {
  try {
    const { rows } = await db.query('SELECT * FROM inventory WHERE tenant_id=$1 ORDER BY name', [withTenant(req)]);
    res.json(rows);
  } catch(err) { next(err); }
});

router.post('/', async (req, res, next) => {
  try {
    const tid = withTenant(req);
    const { name, unit, quantity, min_quantity, cost_per_unit, supplier, branch_id } = req.body;
    const { rows:[i] } = await db.query(
      'INSERT INTO inventory (tenant_id,branch_id,name,unit,quantity,min_quantity,cost_per_unit,supplier) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *',
      [tid, branch_id||1, name, unit||'', quantity||0, min_quantity||0, cost_per_unit||null, supplier||'']
    );
    res.status(201).json(i);
  } catch(err) { next(err); }
});

router.patch('/:id', async (req, res, next) => {
  try {
    const { rows:[i] } = await db.query(
      'UPDATE inventory SET quantity=$1,updated_at=NOW() WHERE id=$2 AND tenant_id=$3 RETURNING *',
      [req.body.quantity, req.params.id, withTenant(req)]
    );
    res.json(i);
  } catch(err) { next(err); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    await db.query('DELETE FROM inventory WHERE id=$1 AND tenant_id=$2', [req.params.id, withTenant(req)]);
    res.json({ message: 'Deleted' });
  } catch(err) { next(err); }
});

module.exports = router;
