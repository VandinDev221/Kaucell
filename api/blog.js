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
      const { rows } = await sql`SELECT id, titulo, data_publicacao, resumo, imagem_url FROM blog_posts ORDER BY id DESC`;
      return json(res, { ok: true, items: rows });
    } catch (e) {
      return json(res, { ok: false, message: 'Erro no servidor.', error: e.message }, 500);
    }
  }

  if (req.method === 'POST') {
    if (!requireAdmin(req, res)) return;

    const id = parseInt(req.query.id, 10) || 0;
    const acao = String(req.query.acao || '').trim();

    if (acao === 'excluir') {
      if (id <= 0) return json(res, { ok: false, message: 'ID do post é obrigatório.' }, 422);
      try {
        const { rows } = await sql`DELETE FROM blog_posts WHERE id = ${id} RETURNING id`;
        if (!rows || !rows.length) return json(res, { ok: false, message: 'Post não encontrado.' }, 404);
        return json(res, { ok: true });
      } catch (e) {
        return json(res, { ok: false, message: 'Erro no servidor.', error: e.message }, 500);
      }
    }

    let body = {};
    try {
      body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    } catch (_) {}

    const titulo = String(body.titulo || '').trim();
    const dataPublicacao = String(body.data_publicacao || '').trim();
    const resumo = String(body.resumo || '').trim();
    const imagemUrl = String(body.imagem_url || '').trim() || null;

    if (!titulo || !dataPublicacao || !resumo) {
      return json(res, { ok: false, message: 'Dados do post inválidos.' }, 422);
    }

    if (acao === 'editar' && id > 0) {
      try {
        const { rows } = await sql`
          UPDATE blog_posts
             SET titulo = ${titulo},
                 data_publicacao = ${dataPublicacao},
                 resumo = ${resumo},
                 imagem_url = ${imagemUrl}
           WHERE id = ${id}
          RETURNING id, titulo, data_publicacao, resumo, imagem_url
        `;
        if (rows && rows.length) return json(res, { ok: true, item: rows[0] });
        return json(res, { ok: false, message: 'Post não encontrado.' }, 404);
      } catch (e) {
        return json(res, { ok: false, message: 'Erro no servidor.', error: e.message }, 500);
      }
    }

    try {
      const { rows } = await sql`
        INSERT INTO blog_posts (titulo, data_publicacao, resumo, imagem_url)
        VALUES (${titulo}, ${dataPublicacao}, ${resumo}, ${imagemUrl})
        RETURNING id, titulo, data_publicacao, resumo, imagem_url
      `;
      return json(res, { ok: true, item: rows[0] });
    } catch (e) {
      return json(res, { ok: false, message: 'Erro no servidor.', error: e.message }, 500);
    }
  }

  json(res, { ok: false, message: 'Método não permitido.' }, 405);
};
