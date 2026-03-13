const { getAdminFromCookie, setAdminCookie, clearAdminCookie } = require('../lib/auth');

const ADMIN_USER = process.env.ADMIN_USER || 'admin';
const ADMIN_PASS = process.env.ADMIN_PASS || '1234';

function json(res, data, status = 200) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.status(status).json(data);
}

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const url = new URL(req.url || `http://x${req.headers.host || ''}${req.headers['x-vercel-forwarded-path'] || '/api/auth'}`);
  const acao = url.searchParams.get('acao') || 'status';

  if (acao === 'status') {
    const logged = getAdminFromCookie(req.headers.cookie);
    return json(res, { ok: true, logged });
  }

  if (acao === 'login' && req.method === 'POST') {
    let body = {};
    try {
      body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    } catch (_) {}
    const usuario = String(body.usuario || '').trim();
    const senha = String(body.senha || '').trim();

    if (usuario === ADMIN_USER && senha === ADMIN_PASS) {
      setAdminCookie(res);
      return json(res, { ok: true, logged: true });
    }
    return json(res, { ok: false, logged: false, message: 'Credenciais inválidas.' }, 401);
  }

  if (acao === 'logout') {
    clearAdminCookie(res);
    return json(res, { ok: true, logged: false });
  }

  json(res, { ok: false, message: 'Ação inválida.' }, 400);
};
