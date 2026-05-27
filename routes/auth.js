const router  = require('express').Router();
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const db      = require('../db');

function makeToken(user, tenant_id) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role, name: user.name, tenant_id: tenant_id || null },
    process.env.JWT_SECRET,
    { expiresIn: '8h' }
  );
}

router.post('/login', async (req, res, next) => {
  try {
    const { email, password, tenant_code } = req.body;
    if(!email || !password) return res.status(400).json({ error: 'Email and password required' });

    if(tenant_code) {
      const tenantResult = await db.query(
        "SELECT * FROM tenants WHERE UPPER(code) = UPPER($1) AND is_active = true",
        [tenant_code]
      );
      if(!tenantResult.rows.length) return res.status(401).json({ error: 'Restaurant code not found' });
      const tenant = tenantResult.rows[0];

      const staffResult = await db.query(
        "SELECT * FROM staff WHERE email=$1 AND tenant_id=$2 AND is_active=true",
        [email, tenant.id]
      );
      if(!staffResult.rows.length) return res.status(401).json({ error: 'Invalid email or password' });
      const user = staffResult.rows[0];
      const match = await bcrypt.compare(password, user.password_hash);
      if(!match) return res.status(401).json({ error: 'Invalid email or password' });

      const token = makeToken(user, tenant.id);
      return res.json({
        accessToken: token,
        user: { id: user.id, name: user.name, email: user.email, role: user.role,
          tenant_id: tenant.id, tenant_name: tenant.name, tenant_code: tenant.code }
      });
    } else {
      const staffResult = await db.query(
        "SELECT s.*, t.name as tenant_name, t.code as tenant_code FROM staff s LEFT JOIN tenants t ON t.id = s.tenant_id WHERE s.email=$1 AND s.is_active=true LIMIT 1",
        [email]
      );
      if(!staffResult.rows.length) return res.status(401).json({ error: 'Invalid email or password' });
      const user = staffResult.rows[0];
      const match = await bcrypt.compare(password, user.password_hash);
      if(!match) return res.status(401).json({ error: 'Invalid email or password' });

      const token = makeToken(user, user.tenant_id);
      return res.json({
        accessToken: token,
        user: { id: user.id, name: user.name, email: user.email, role: user.role,
          tenant_id: user.tenant_id, tenant_name: user.tenant_name, tenant_code: user.tenant_code }
      });
    }
  } catch(err) { next(err); }
});

router.post('/logout', (req, res) => res.json({ message: 'Logged out' }));

module.exports = router;
