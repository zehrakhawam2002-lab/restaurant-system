const router = require('express').Router();
const db     = require('../db');
const { verifyToken, can, withTenant } = require('../middleware/auth');
const { logAudit } = require('../middleware/audit');

router.use(verifyToken);

router.get('/categories', async (req, res, next) => {
  try {
    const tid = withTenant(req);
    const { rows } = await db.query(
      'SELECT * FROM menu_categories WHERE tenant_id=$1 ORDER BY sort_order', [tid]
    );
    res.json(rows);
  } catch(err) { next(err); }
});

router.get('/', async (req, res, next) => {
  try {
    const tid = withTenant(req);
    const { rows } = await db.query(`
      SELECT mi.*, mc.name AS category_name FROM menu_items mi
      LEFT JOIN menu_categories mc ON mc.id = mi.category_id
      WHERE mi.tenant_id=$1 AND mi.is_deleted=false
      ORDER BY mc.sort_order, mi.name
    `, [tid]);
    res.json(rows);
  } catch(err) { next(err); }
});

router.post('/', can('menu.edit'), async (req, res, next) => {
  try {
    const tid = withTenant(req);
    const { category_id, name, name_en, name_ar, name_ku, description, price, is_available=true } = req.body;
    if(!name && !name_en) return res.status(400).json({ error: 'name is required' });
    const finalName = name || name_en;
    const { rows:[item] } = await db.query(
      'INSERT INTO menu_items (tenant_id,category_id,name,name_en,name_ar,name_ku,description,price,is_available) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *',
      [tid, category_id||null, finalName, name_en||finalName, name_ar||null, name_ku||null, description||'', price, is_available]
    );
    res.status(201).json(item);
  } catch(err) { next(err); }
});

router.put('/:id', can('menu.edit'), async (req, res, next) => {
  try {
    const tid = withTenant(req);
    const { category_id, name, name_en, name_ar, name_ku, description, price, is_available } = req.body;
    const finalName = name || name_en;
    const { rows:[item] } = await db.query(
      'UPDATE menu_items SET category_id=$1,name=$2,name_en=$3,name_ar=$4,name_ku=$5,description=$6,price=$7,is_available=$8,updated_at=NOW() WHERE id=$9 AND tenant_id=$10 AND is_deleted=false RETURNING *',
      [category_id||null, finalName, name_en||finalName, name_ar||null, name_ku||null, description||'', price, is_available, req.params.id, tid]
    );
    if(!item) return res.status(404).json({ error: 'Item not found' });
    res.json(item);
  } catch(err) { next(err); }
});

router.delete('/:id', can('menu.edit'), async (req, res, next) => {
  try {
    const tid = withTenant(req);
    await db.query('UPDATE menu_items SET is_deleted=true WHERE id=$1 AND tenant_id=$2', [req.params.id, tid]);
    res.json({ message: 'Deleted' });
  } catch(err) { next(err); }
});

module.exports = router;
