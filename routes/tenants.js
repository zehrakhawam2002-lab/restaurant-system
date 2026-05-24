/**
 * routes/tenants.js
 * Platform superadmin only — manage all restaurants
 */
const router = require('express').Router();
const bcrypt = require('bcryptjs');
const db     = require('../db');
const { verifyToken } = require('../middleware/auth');

router.use(verifyToken);

// Only platform admin can access
function platformAdmin(req, res, next) {
  if(req.user.role !== 'superadmin') return res.status(403).json({ error: 'Platform admin only' });
  next();
}

// List all tenants
router.get('/', platformAdmin, async (req, res, next) => {
  try {
    const { rows } = await db.query(`
      SELECT t.*, COUNT(s.id)::int AS staff_count
      FROM tenants t
      LEFT JOIN staff s ON s.tenant_id = t.id AND s.is_active = true
      GROUP BY t.id ORDER BY t.created_at DESC
    `);
    res.json(rows);
  } catch(err) { next(err); }
});

// Create new tenant + admin user
router.post('/', platformAdmin, async (req, res, next) => {
  try {
    const { name, code, email, phone, address, admin_email, admin_password, admin_name } = req.body;
    if(!name || !code || !admin_email || !admin_password)
      return res.status(400).json({ error: 'name, code, admin_email, admin_password required' });

    // Check code unique
    const { rows: existing } = await db.query('SELECT id FROM tenants WHERE UPPER(code) = UPPER($1)', [code]);
    if(existing.length) return res.status(400).json({ error: 'Restaurant code already exists' });

    // Create tenant
    const { rows: [tenant] } = await db.query(
      'INSERT INTO tenants (code, name, email, phone, address) VALUES (UPPER($1),$2,$3,$4,$5) RETURNING *',
      [code, name, email||null, phone||null, address||null]
    );

    // Create default branch
    const { rows: [branch] } = await db.query(
      'INSERT INTO branches (name, tenant_id) VALUES ($1, $2) RETURNING *',
      ['Main Branch', tenant.id]
    );

    // Create admin user
    const hash = await bcrypt.hash(admin_password, 10);
    const { rows: [admin] } = await db.query(
      'INSERT INTO staff (name, email, password_hash, role, tenant_id, branch_id, is_active) VALUES ($1,$2,$3,$4,$5,$6,true) RETURNING id, name, email, role',
      [admin_name||'Admin', admin_email, hash, 'superadmin', tenant.id, branch.id]
    );

    // Seed default menu categories
    await db.query(
      'INSERT INTO menu_categories (name, sort_order, tenant_id) VALUES ($1,$2,$3),($1,$2,$3),($1,$2,$3),($1,$2,$3)',
      ['Main Dishes', 1, tenant.id]
    );
    await db.query(`
      INSERT INTO menu_categories (name, sort_order, tenant_id) VALUES
      ('Main Dishes',1,$1),('Appetizers',2,$1),('Drinks',3,$1),('Desserts',4,$1)
    `, [tenant.id]);

    res.status(201).json({ tenant, admin, branch });
  } catch(err) { next(err); }
});

// Update tenant
router.put('/:id', platformAdmin, async (req, res, next) => {
  try {
    const { name, email, phone, address, is_active } = req.body;
    const { rows: [t] } = await db.query(
      'UPDATE tenants SET name=$1,email=$2,phone=$3,address=$4,is_active=$5 WHERE id=$6 RETURNING *',
      [name, email, phone, address, is_active, req.params.id]
    );
    res.json(t);
  } catch(err) { next(err); }
});

// Get tenant stats
router.get('/:id/stats', platformAdmin, async (req, res, next) => {
  try {
    const tid = req.params.id;
    const [staff, orders, menu] = await Promise.all([
      db.query('SELECT COUNT(*)::int AS count FROM staff WHERE tenant_id=$1 AND is_active=true', [tid]),
      db.query('SELECT COUNT(*)::int AS count, COALESCE(SUM(total),0) AS revenue FROM orders WHERE tenant_id=$1', [tid]),
      db.query('SELECT COUNT(*)::int AS count FROM menu_items WHERE tenant_id=$1 AND is_deleted=false', [tid]),
    ]);
    res.json({ staff: staff.rows[0].count, orders: orders.rows[0].count, revenue: orders.rows[0].revenue, menu: menu.rows[0].count });
  } catch(err) { next(err); }
});

module.exports = router;
