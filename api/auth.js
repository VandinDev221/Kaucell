const { getAdminFromCookie, setAdminCookie, clearAdminCookie } = require('../lib/auth');
const ADMIN_USER = process.env.ADMIN_USER || 'admin';
const ADMIN_PASS = process.env.ADMIN_PASS || '1234';

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

    // Usa a URL original (com querystring) quando o Vercel faz rewrite
    const forwarded = req.headers['x-vercel-forwarded-path'];
    const raw = (typeof forwarded === 'string' && forwarded.length > 0) ? forwarded : (req.url || '/api/auth');
    const url = new URL(raw.startsWith('http') ? raw : `https://kaucell.vercel.app${raw.startsWith('/') ? '' : '/'}${raw}`);
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
        console.error('Auth login error (db):', e);
        // Fallback: se o banco falhar, ainda permite login com ADMIN_USER/ADMIN_PASS
        if (usuario === ADMIN_USER && senha === ADMIN_PASS) {
          setAdminCookie(res);
          return json(res, { ok: true, logged: true, fallback: true });
        }
        return json(res, { ok: false, logged: false, message: 'Erro no servidor.', error: String(e.message) }, 500);
      }

      // Se não encontrou no banco, tenta credenciais fixas de ambiente
      if (usuario === ADMIN_USER && senha === ADMIN_PASS) {
        setAdminCookie(res);
        return json(res, { ok: true, logged: true });
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
