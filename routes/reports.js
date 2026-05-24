const router = require('express').Router();
const db     = require('../db');
const { verifyToken, can, withTenant } = require('../middleware/auth');

router.use(verifyToken);

router.get('/summary', can('reports.view'), async (req, res, next) => {
  try {
    const tid = withTenant(req);
    const { rows } = await db.query(`
      SELECT COUNT(*)::int AS total_orders,
        COALESCE(SUM(total),0)::numeric AS total_revenue,
        COALESCE(AVG(total),0)::numeric AS avg_order_value,
        COUNT(DISTINCT DATE(created_at))::int AS days
      FROM orders WHERE tenant_id=$1 AND status != 'cancelled'
    `, [tid]);
    res.json(rows[0]);
  } catch(err) { next(err); }
});

router.get('/daily', can('reports.view'), async (req, res, next) => {
  try {
    const tid = withTenant(req);
    const days = parseInt(req.query.days) || 7;
    const { rows } = await db.query(`
      SELECT DATE(created_at) AS date, COUNT(*)::int AS orders, SUM(total) AS revenue
      FROM orders WHERE tenant_id=$1 AND status != 'cancelled'
        AND created_at >= NOW() - INTERVAL '${days} days'
      GROUP BY DATE(created_at) ORDER BY date DESC
    `, [tid]);
    res.json(rows);
  } catch(err) { next(err); }
});

router.get('/orders', can('reports.view'), async (req, res, next) => {
  try {
    const tid = withTenant(req);
    const { from, to, status } = req.query;
    const conditions = ['o.tenant_id=$1'];
    const params = [tid];
    let p = 2;
    if(from)   { conditions.push(`o.created_at >= $${p++}`); params.push(from); }
    if(to)     { conditions.push(`o.created_at <= $${p++}`); params.push(to+' 23:59:59'); }
    if(status) { conditions.push(`o.status = $${p++}`); params.push(status); }
    const { rows } = await db.query(`
      SELECT o.id, o.order_type, o.status, o.total, o.created_at, o.customer_name, o.notes,
        t.number AS table_number, s.name AS staff_name, b.name AS branch_name,
        COUNT(oi.id)::int AS item_count
      FROM orders o
      LEFT JOIN tables t ON t.id=o.table_id
      LEFT JOIN staff s ON s.id=o.created_by
      LEFT JOIN branches b ON b.id=o.branch_id
      LEFT JOIN order_items oi ON oi.order_id=o.id
      WHERE ${conditions.join(' AND ')}
      GROUP BY o.id,t.number,s.name,b.name ORDER BY o.created_at DESC
    `, params);
    res.json(rows);
  } catch(err) { next(err); }
});

router.get('/order/:id', can('reports.view'), async (req, res, next) => {
  try {
    const tid = withTenant(req);
    const { rows:[order] } = await db.query(`
      SELECT o.*, t.number AS table_number, s.name AS staff_name,
        b.name AS branch_name, b.address AS branch_address, b.phone AS branch_phone,
        json_agg(json_build_object('name',mi.name,'name_en',mi.name_en,'name_ar',mi.name_ar,'quantity',oi.quantity,'unit_price',oi.unit_price,'subtotal',oi.quantity*oi.unit_price) ORDER BY oi.id) AS items
      FROM orders o
      LEFT JOIN tables t ON t.id=o.table_id
      LEFT JOIN staff s ON s.id=o.created_by
      LEFT JOIN branches b ON b.id=o.branch_id
      LEFT JOIN order_items oi ON oi.order_id=o.id
      LEFT JOIN menu_items mi ON mi.id=oi.menu_item_id
      WHERE o.id=$1 AND o.tenant_id=$2
      GROUP BY o.id,t.number,s.name,b.name,b.address,b.phone
    `, [req.params.id, tid]);
    if(!order) return res.status(404).json({ error: 'Not found' });
    res.json(order);
  } catch(err) { next(err); }
});

module.exports = router;
