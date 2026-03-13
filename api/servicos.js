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
      const { rows } = await sql`SELECT id, modelo, nome_servico, preco FROM servicos ORDER BY id DESC`;
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

    const modelo = String(body.modelo || '').trim();
    const nomeServico = String(body.nome_servico || '').trim();
    const preco = parseFloat(body.preco) || 0;

    if (!modelo || !nomeServico || preco <= 0) {
      return json(res, { ok: false, message: 'Dados de serviço inválidos.' }, 422);
    }

    try {
      const { rows } = await sql`
        INSERT INTO servicos (modelo, nome_servico, preco)
        VALUES (${modelo}, ${nomeServico}, ${preco})
        RETURNING id, modelo, nome_servico, preco
      `;
      return json(res, { ok: true, item: rows[0] });
    } catch (e) {
      return json(res, { ok: false, message: 'Erro no servidor.', error: e.message }, 500);
    }
  }

  json(res, { ok: false, message: 'Método não permitido.' }, 405);
};
