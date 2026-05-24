const router = require('express').Router();
const db     = require('../db');
const { verifyToken, can, withTenant } = require('../middleware/auth');
const { logAudit } = require('../middleware/audit');

router.use(verifyToken);

router.get('/', async (req, res, next) => {
  try {
    const tid = withTenant(req);
    const { rows } = await db.query(`
      SELECT o.*, t.number AS table_number,
        json_agg(json_build_object('name',mi.name,'name_en',mi.name_en,'name_ar',mi.name_ar,'name_ku',mi.name_ku,'quantity',oi.quantity,'price',oi.unit_price)) AS items
      FROM orders o
      LEFT JOIN tables t ON t.id=o.table_id
      LEFT JOIN order_items oi ON oi.order_id=o.id
      LEFT JOIN menu_items mi ON mi.id=oi.menu_item_id
      WHERE o.tenant_id=$1
      GROUP BY o.id,t.number ORDER BY o.created_at DESC LIMIT 100
    `, [tid]);
    res.json(rows);
  } catch(err) { next(err); }
});

router.post('/', can('orders.create'), async (req, res, next) => {
  try {
    const tid = withTenant(req);
    const { branch_id, table_id, order_type, items, notes, customer_name, customer_phone } = req.body;
    if(!items?.length) return res.status(400).json({ error: 'Items required' });
    let total = 0;
    const resolved = [];
    for(const item of items) {
      const { rows } = await db.query('SELECT price, name FROM menu_items WHERE id=$1 AND tenant_id=$2', [item.menu_item_id, tid]);
      if(!rows.length) return res.status(400).json({ error: `Item ${item.menu_item_id} not found` });
      total += rows[0].price * item.quantity;
      resolved.push({ ...item, unit_price: rows[0].price });
    }
    const { rows:[order] } = await db.query(
      'INSERT INTO orders (tenant_id,branch_id,table_id,created_by,order_type,status,total,notes,customer_name,customer_phone) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *',
      [tid, branch_id, table_id||null, req.user.id, order_type, 'new', total, notes||'', customer_name||'', customer_phone||'']
    );
    for(const item of resolved) {
      await db.query('INSERT INTO order_items (order_id,menu_item_id,quantity,unit_price) VALUES ($1,$2,$3,$4)', [order.id, item.menu_item_id, item.quantity, item.unit_price]);
    }
    const io = req.app.get('io');
    if(io) io.emit('new_order', order);
    logAudit(req, 'ORDER_CREATED', { orderId: order.id });
    res.status(201).json(order);
  } catch(err) { next(err); }
});

router.patch('/:id/status', can('orders.update_status'), async (req, res, next) => {
  try {
    const tid = withTenant(req);
    const { rows:[order] } = await db.query(
      'UPDATE orders SET status=$1,updated_at=NOW() WHERE id=$2 AND tenant_id=$3 RETURNING *',
      [req.body.status, req.params.id, tid]
    );
    if(!order) return res.status(404).json({ error: 'Order not found' });
    const io = req.app.get('io');
    if(io) io.emit('order_updated', order);
    logAudit(req, 'ORDER_STATUS_CHANGED', { orderId: order.id, status: req.body.status });
    res.json(order);
  } catch(err) { next(err); }
});

router.delete('/:id', can('orders.delete'), async (req, res, next) => {
  try {
    const tid = withTenant(req);
    await db.query('DELETE FROM order_items WHERE order_id=$1', [req.params.id]);
    await db.query('DELETE FROM orders WHERE id=$1 AND tenant_id=$2', [req.params.id, tid]);
    logAudit(req, 'ORDER_DELETED', { orderId: req.params.id });
    res.json({ message: 'Deleted' });
  } catch(err) { next(err); }
});

module.exports = router;
