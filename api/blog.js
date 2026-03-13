const { sql, ensureTables, json } = require('../lib/db');
const { requireAdmin } = require('../lib/auth');

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    await ensureTables();
  } catch (e) {
    return json(res, { ok: false, message: 'Erro no servidor.', error: e.message }, 500);
  }

  if (req.method === 'GET') {
    try {
      const { rows } = await sql`SELECT id, titulo, data_publicacao, resumo FROM blog_posts ORDER BY id DESC`;
      return json(res, { ok: true, items: rows });
    } catch (e) {
      return json(res, { ok: false, message: 'Erro no servidor.', error: e.message }, 500);
    }
  }

  if (req.method === 'POST') {
    if (!requireAdmin(req, res)) return;

    let body = {};
    try {
      body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    } catch (_) {}

    const titulo = String(body.titulo || '').trim();
    const dataPublicacao = String(body.data_publicacao || '').trim();
    const resumo = String(body.resumo || '').trim();

    if (!titulo || !dataPublicacao || !resumo) {
      return json(res, { ok: false, message: 'Dados do post inválidos.' }, 422);
    }

    try {
      const { rows } = await sql`
        INSERT INTO blog_posts (titulo, data_publicacao, resumo)
        VALUES (${titulo}, ${dataPublicacao}, ${resumo})
        RETURNING id, titulo, data_publicacao, resumo
      `;
      return json(res, { ok: true, item: rows[0] });
    } catch (e) {
      return json(res, { ok: false, message: 'Erro no servidor.', error: e.message }, 500);
    }
  }

  json(res, { ok: false, message: 'Método não permitido.' }, 405);
};
