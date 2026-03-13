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

  const url = new URL(req.url || `http://x${req.headers.host || ''}${req.headers['x-vercel-forwarded-path'] || '/api/produtos'}`);
  const id = parseInt(url.searchParams.get('id') || '0', 10);
  const acao = url.searchParams.get('acao') || '';

  if (req.method === 'GET') {
    try {
      const { rows } = await sql`SELECT id, nome, categoria, preco, imagem_url, imagem_arquivo, destaque FROM produtos ORDER BY id DESC`;
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

    const nome = String(body.nome || '').trim();
    const categoria = String(body.categoria || '').trim();
    const preco = parseFloat(body.preco) || 0;
    const imagemUrl = String(body.imagem_url || '').trim();
    const imagemArquivo = String(body.imagem_arquivo || '').trim();
    const destaque = body.destaque ? 1 : 0;

    if (acao === '' || acao === 'criar') {
      if (!nome || !categoria || preco <= 0) {
        return json(res, { ok: false, message: 'Dados de produto inválidos.' }, 422);
      }
      try {
        const { rows } = await sql`
          INSERT INTO produtos (nome, categoria, preco, imagem_url, imagem_arquivo, destaque)
          VALUES (${nome}, ${categoria}, ${preco}, ${imagemUrl || null}, ${imagemArquivo || null}, ${destaque})
          RETURNING id, nome, categoria, preco, imagem_url, imagem_arquivo, destaque
        `;
        return json(res, { ok: true, item: rows[0] });
      } catch (e) {
        return json(res, { ok: false, message: 'Erro no servidor.', error: e.message }, 500);
      }
    }

    if (acao === 'editar') {
      if (id <= 0) return json(res, { ok: false, message: 'ID do produto é obrigatório.' }, 422);
      if (!nome || !categoria || preco <= 0) return json(res, { ok: false, message: 'Dados de produto inválidos.' }, 422);
      try {
        const { rows } = await sql`
          UPDATE produtos
          SET nome = ${nome}, categoria = ${categoria}, preco = ${preco}, imagem_url = ${imagemUrl || null}, imagem_arquivo = ${imagemArquivo || null}, destaque = ${destaque}
          WHERE id = ${id}
          RETURNING id, nome, categoria, preco, imagem_url, imagem_arquivo, destaque
        `;
        if (!rows || !rows.length) return json(res, { ok: false, message: 'Produto não encontrado.' }, 404);
        return json(res, { ok: true, item: rows[0] });
      } catch (e) {
        return json(res, { ok: false, message: 'Erro no servidor.', error: e.message }, 500);
      }
    }

    if (acao === 'excluir') {
      if (id <= 0) return json(res, { ok: false, message: 'ID do produto é obrigatório.' }, 422);
      try {
        const { rows } = await sql`DELETE FROM produtos WHERE id = ${id} RETURNING id`;
        if (!rows || !rows.length) return json(res, { ok: false, message: 'Produto não encontrado.' }, 404);
        return json(res, { ok: true });
      } catch (e) {
        return json(res, { ok: false, message: 'Erro no servidor.', error: e.message }, 500);
      }
    }

    return json(res, { ok: false, message: 'Ação inválida.' }, 400);
  }

  json(res, { ok: false, message: 'Método não permitido.' }, 405);
};
