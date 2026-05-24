const router = require('express').Router();
const bcrypt = require('bcryptjs');
const db     = require('../db');
const { verifyToken, can, withTenant } = require('../middleware/auth');

router.use(verifyToken);

router.get('/', can('staff.*'), async (req, res, next) => {
  try {
    const tid = withTenant(req);
    const { rows } = await db.query(
      'SELECT s.*, b.name AS branch_name FROM staff s LEFT JOIN branches b ON b.id=s.branch_id WHERE s.tenant_id=$1 AND s.is_active=true ORDER BY s.name',
      [tid]
    );
    res.json(rows);
  } catch(err) { next(err); }
});

router.post('/', can('staff.*'), async (req, res, next) => {
  try {
    const tid = withTenant(req);
    const { name, email, phone, role, branch_id, password } = req.body;
    if(!name || !email || !password) return res.status(400).json({ error: 'name, email, password required' });
    const hash = await bcrypt.hash(password, 10);
    const { rows:[s] } = await db.query(
      'INSERT INTO staff (tenant_id,name,email,phone,role,branch_id,password_hash,is_active) VALUES ($1,$2,$3,$4,$5,$6,$7,true) RETURNING id,name,email,role',
      [tid, name, email, phone||'', role||'cashier', branch_id||null, hash]
    );
    res.status(201).json(s);
  } catch(err) { next(err); }
});

router.put('/:id', can('staff.*'), async (req, res, next) => {
  try {
    const tid = withTenant(req);
    const { name, email, phone, role, branch_id } = req.body;
    const { rows:[s] } = await db.query(
      'UPDATE staff SET name=$1,email=$2,phone=$3,role=$4,branch_id=$5 WHERE id=$6 AND tenant_id=$7 RETURNING id,name,role',
      [name, email, phone||'', role, branch_id||null, req.params.id, tid]
    );
    res.json(s);
  } catch(err) { next(err); }
});

router.patch('/:id/deactivate', can('staff.*'), async (req, res, next) => {
  try {
    const tid = withTenant(req);
    if(req.params.id == req.user.id) return res.status(400).json({ error: 'Cannot deactivate yourself' });
    await db.query('UPDATE staff SET is_active=false WHERE id=$1 AND tenant_id=$2', [req.params.id, tid]);
    res.json({ message: 'Deactivated' });
  } catch(err) { next(err); }
});

module.exports = router;
