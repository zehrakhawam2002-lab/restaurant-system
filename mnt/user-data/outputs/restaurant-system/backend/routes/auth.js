const router    = require('express').Router();
const bcrypt    = require('bcryptjs');
const jwt       = require('jsonwebtoken');
const speakeasy = require('speakeasy');
const qrcode    = require('qrcode');
const db        = require('../db');
const { verifyToken } = require('../middleware/auth');
const { logAudit }    = require('../middleware/audit');

const signAccess = (user) => jwt.sign(
  { sub: user.id, role: user.role, branch_id: user.branch_id, twofa_verified: false },
  process.env.JWT_SECRET,
  { expiresIn: '15m', issuer: 'restaurant-os', audience: 'restaurant-api', algorithm: 'HS256' }
);
const signRefresh = (user) => jwt.sign(
  { sub: user.id, type: 'refresh' },
  process.env.JWT_REFRESH_SECRET,
  { expiresIn: '7d', issuer: 'restaurant-os', algorithm: 'HS256' }
);

router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
    const { rows } = await db.query('SELECT * FROM staff WHERE email = $1 AND is_active = true', [email.toLowerCase()]);
    const dummy = '$2b$12$dummyhashfortimingxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';
    const user  = rows[0];
    const valid = await bcrypt.compare(password, user?.password_hash || dummy);
    if (!user || !valid) {
      logAudit(req, 'LOGIN_FAILED', { email });
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    const accessToken  = signAccess(user);
    const refreshToken = signRefresh(user);
    const rtHash = await bcrypt.hash(refreshToken, 10);
    await db.query(
      "INSERT INTO refresh_tokens (user_id, token_hash, ip, expires_at) VALUES ($1,$2,$3, NOW() + INTERVAL '7 days')",
      [user.id, rtHash, req.ip]
    );
    logAudit(req, 'LOGIN_SUCCESS', { userId: user.id });
    res.json({
      step: user.totp_secret ? '2fa_required' : 'done',
      user: { id: user.id, name: user.name, role: user.role, branch_id: user.branch_id },
      accessToken,
      refreshToken,
    });
  } catch (err) { next(err); }
});

router.post('/2fa/verify', verifyToken, async (req, res, next) => {
  try {
    const { code } = req.body;
    const { rows } = await db.query('SELECT totp_secret FROM staff WHERE id = $1', [req.user.id]);
    const verified = speakeasy.totp.verify({ secret: rows[0]?.totp_secret, encoding: 'base32', token: code, window: 1 });
    if (!verified) return res.status(401).json({ error: 'Invalid 2FA code' });
    res.json({ accessToken: signAccess(req.user) });
  } catch (err) { next(err); }
});

router.post('/2fa/setup', verifyToken, async (req, res, next) => {
  try {
    const secret = speakeasy.generateSecret({ name: 'RestaurantOS', length: 32 });
    await db.query('UPDATE staff SET totp_secret = $1 WHERE id = $2', [secret.base32, req.user.id]);
    const qrCode = await qrcode.toDataURL(secret.otpauth_url);
    res.json({ qrCode, secret: secret.base32 });
  } catch (err) { next(err); }
});

router.post('/refresh', async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(400).json({ error: 'Refresh token required' });
    let decoded;
    try {
      decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET, { algorithms: ['HS256'], issuer: 'restaurant-os' });
    } catch { return res.status(401).json({ error: 'Invalid refresh token' }); }
    const { rows } = await db.query(
      "SELECT rt.*, s.role, s.branch_id, s.is_active FROM refresh_tokens rt JOIN staff s ON s.id = rt.user_id WHERE rt.user_id = $1 AND rt.expires_at > NOW()",
      [decoded.sub]
    );
    if (!rows.length || !rows[0].is_active) return res.status(401).json({ error: 'Token revoked' });
    const valid = await bcrypt.compare(refreshToken, rows[0].token_hash);
    if (!valid) return res.status(401).json({ error: 'Token mismatch' });
    const newAccess  = signAccess({ id: decoded.sub, ...rows[0] });
    const newRefresh = signRefresh({ id: decoded.sub });
    const newHash    = await bcrypt.hash(newRefresh, 10);
    await db.query('DELETE FROM refresh_tokens WHERE id = $1', [rows[0].id]);
    await db.query(
      "INSERT INTO refresh_tokens (user_id, token_hash, ip, expires_at) VALUES ($1,$2,$3, NOW() + INTERVAL '7 days')",
      [decoded.sub, newHash, req.ip]
    );
    res.json({ accessToken: newAccess, refreshToken: newRefresh });
  } catch (err) { next(err); }
});

router.post('/logout', verifyToken, async (req, res, next) => {
  try {
    await db.query('DELETE FROM refresh_tokens WHERE user_id = $1', [req.user.id]);
    logAudit(req, 'LOGOUT', { userId: req.user.id });
    res.json({ message: 'Logged out' });
  } catch (err) { next(err); }
});

module.exports = router;
