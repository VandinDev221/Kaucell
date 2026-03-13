const { getAdminFromCookie, setAdminCookie, clearAdminCookie } = require('../lib/auth');
const { sql, ensureTables } = require('../lib/db');
const bcrypt = require('bcryptjs');

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

    if (!usuario || !senha) {
      return json(res, { ok: false, logged: false, message: 'Usuário e senha obrigatórios.' }, 400);
    }

    try {
      await ensureTables();
      const { rows } = await sql`SELECT id, senha_hash FROM admins WHERE usuario = ${usuario} LIMIT 1`;
      if (rows.length > 0 && await bcrypt.compare(senha, rows[0].senha_hash)) {
        setAdminCookie(res);
        return json(res, { ok: true, logged: true });
      }
    } catch (e) {
      console.error('Auth login error:', e);
      return json(res, { ok: false, logged: false, message: 'Erro no servidor.' }, 500);
    }
    return json(res, { ok: false, logged: false, message: 'Credenciais inválidas.' }, 401);
  }

  if (acao === 'logout') {
    clearAdminCookie(res);
    return json(res, { ok: true, logged: false });
  }

  json(res, { ok: false, message: 'Ação inválida.' }, 400);
};
