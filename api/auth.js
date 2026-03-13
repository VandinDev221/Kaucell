const { getAdminFromCookie, setAdminCookie, clearAdminCookie } = require('../lib/auth');

function json(res, data, status = 200) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.status(status).json(data);
}

module.exports = async function handler(req, res) {
  try {
    if (req.method === 'OPTIONS') {
      res.status(200).end();
      return;
    }

    const raw = req.url || '/api/auth';
    const url = new URL(raw, 'https://kaucell.vercel.app');
    const acao = url.searchParams.get('acao') || 'status';

    if (acao === 'status') {
      const logged = getAdminFromCookie(req.headers.cookie);
      return json(res, { ok: true, logged });
    }

    if (acao === 'logout') {
      clearAdminCookie(res);
      return json(res, { ok: true, logged: false });
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
        const { sql, ensureTables } = require('../lib/db');
        const bcrypt = require('bcryptjs');
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

    json(res, { ok: false, message: 'Ação inválida.' }, 400);
  } catch (err) {
    console.error('Auth handler error:', err);
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.status(500).json({ ok: false, message: 'Erro no servidor.', error: String(err.message) });
  }
};
