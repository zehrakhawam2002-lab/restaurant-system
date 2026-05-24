const jwt = require('jsonwebtoken');
const db  = require('../db');

const PERMISSIONS = {
  superadmin: ['*'],
  admin:      ['orders.*','menu.*','staff.*','reports.*','inventory.*','tables.*','branches.view'],
  manager:    ['orders.*','orders.delete','menu.view','menu.edit','inventory.*','tables.*','reports.view'],
  cashier:    ['orders.create','orders.view','menu.view','tables.view'],
  kitchen:    ['orders.view','orders.update_status'],
  waiter:     ['orders.create','orders.view','tables.view','menu.view'],
};

function hasPerm(role, perm) {
  const perms = PERMISSIONS[role] || [];
  if(perms.includes('*')) return true;
  if(perms.includes(perm)) return true;
  const [ns] = perm.split('.');
  return perms.includes(ns+'.*');
}

async function verifyToken(req, res, next) {
  const auth = req.headers.authorization;
  if(!auth?.startsWith('Bearer ')) return res.status(401).json({ error: 'No token' });
  try {
    const payload = jwt.verify(auth.slice(7), process.env.JWT_SECRET);
    req.user = payload;
    // platform_admin can access all tenants
    if(payload.platform_admin) return next();
    // Normal users must have a tenant
    if(!payload.tenant_id) return res.status(401).json({ error: 'No tenant' });
    next();
  } catch(e) {
    res.status(401).json({ error: 'Invalid token' });
  }
}

function can(perm) {
  return (req, res, next) => {
    if(!req.user) return res.status(401).json({ error: 'Unauthorized' });
    if(req.user.platform_admin) return next();
    if(!hasPerm(req.user.role, perm)) return res.status(403).json({ error: 'Insufficient permissions' });
    next();
  };
}

// Middleware to ensure tenant isolation on DB queries
function withTenant(req) {
  return req.user?.tenant_id || null;
}

module.exports = { verifyToken, can, hasPerm, withTenant };
