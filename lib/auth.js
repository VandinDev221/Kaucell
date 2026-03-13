const { parse, serialize } = require('cookie');
const crypto = require('crypto');

const COOKIE_NAME = 'kaucell_admin';
const SECRET = process.env.ADMIN_SECRET || 'kaucell-secret-mude-em-producao';

function sign(value) {
  return crypto.createHmac('sha256', SECRET).update(value).digest('hex');
}

function getAdminFromCookie(cookieHeader) {
  if (!cookieHeader) return false;
  const cookies = parse(cookieHeader);
  const raw = cookies[COOKIE_NAME];
  if (!raw) return false;
  const [value, sig] = raw.split('.');
  if (!value || !sig) return false;
  return sign(value) === sig && value === '1';
}

function setAdminCookie(res) {
  const value = '1.' + sign('1');
  res.setHeader('Set-Cookie', serialize(COOKIE_NAME, value, {
    httpOnly: true,
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
    sameSite: 'lax',
    secure: process.env.VERCEL === '1'
  }));
}

function clearAdminCookie(res) {
  res.setHeader('Set-Cookie', serialize(COOKIE_NAME, '', {
    httpOnly: true,
    path: '/',
    maxAge: 0,
    sameSite: 'lax'
  }));
}

function requireAdmin(req, res, fn) {
  if (!getAdminFromCookie(req.headers.cookie)) {
    res.status(401).json({ ok: false, message: 'Não autorizado. Faça login no painel admin.' });
    return;
  }
  return fn();
}

module.exports = { getAdminFromCookie, setAdminCookie, clearAdminCookie, requireAdmin };
