const { sql, ensureTables, json } = require('../lib/db');
const { requireAdmin } = require('../lib/auth');

function sendJson(res, data, status = 200) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.status(status).json(data);
}

function classificarItem(item) {
  const qtd = Number(item.quantidade) || 0;
  const min = Number(item.quantidade_minima) || 0;
  if (qtd <= 0) return 'faltando';
  if (qtd <= min) return 'baixo';
  return 'ok';
}

async function listarEstoque() {
  const { rows: secoes } = await sql`
    SELECT id, nome, ordem
    FROM estoque_secoes
    ORDER BY ordem ASC, id ASC
  `;
  const { rows: itens } = await sql`
    SELECT i.id, i.secao_id, i.nome, i.quantidade, i.quantidade_minima, i.unidade, s.nome AS secao_nome
    FROM estoque_itens i
    JOIN estoque_secoes s ON s.id = i.secao_id
    ORDER BY s.ordem ASC, s.id ASC, i.nome ASC
  `;

  const itensPorSecao = {};
  itens.forEach((item) => {
    if (!itensPorSecao[item.secao_id]) itensPorSecao[item.secao_id] = [];
    itensPorSecao[item.secao_id].push({
      id: item.id,
      secao_id: item.secao_id,
      nome: item.nome,
      quantidade: Number(item.quantidade),
      quantidade_minima: Number(item.quantidade_minima),
      unidade: item.unidade || 'un',
      status: classificarItem(item)
    });
  });

  const secoesComItens = secoes.map((s) => ({
    id: s.id,
    nome: s.nome,
    ordem: s.ordem,
    itens: itensPorSecao[s.id] || []
  }));

  const faltando = [];
  const baixo = [];
  itens.forEach((item) => {
    const status = classificarItem(item);
    const entry = {
      id: item.id,
      secao_id: item.secao_id,
      secao_nome: item.secao_nome,
      nome: item.nome,
      quantidade: Number(item.quantidade),
      quantidade_minima: Number(item.quantidade_minima),
      unidade: item.unidade || 'un',
      status
    };
    if (status === 'faltando') faltando.push(entry);
    else if (status === 'baixo') baixo.push(entry);
  });

  return { secoes: secoesComItens, alertas: { faltando, baixo } };
}

module.exports = async function handler(req, res) {
  try {
    if (req.method === 'OPTIONS') {
      res.status(200).end();
      return;
    }

    try {
      await ensureTables();
    } catch (e) {
      return json(res, { ok: false, message: 'Erro no servidor.', error: e.message }, 500);
    }

    const raw = req.url || req.headers['x-vercel-forwarded-path'] || '/api/estoque';
    const url = new URL(raw, 'https://kaucell.vercel.app');
    const id = parseInt(url.searchParams.get('id') || '0', 10);
    const acao = url.searchParams.get('acao') || '';
    const relatorio = url.searchParams.get('relatorio') === '1';

    if (req.method === 'GET') {
      try {
        const dados = await listarEstoque();
        if (relatorio) {
          return json(res, {
            ok: true,
            gerado_em: new Date().toISOString(),
            faltando: dados.alertas.faltando,
            baixo: dados.alertas.baixo
          });
        }
        return json(res, { ok: true, ...dados });
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

      if (acao === 'secao_criar') {
        const nome = String(body.nome || '').trim();
        if (!nome) return json(res, { ok: false, message: 'Nome da seção é obrigatório.' }, 422);
        try {
          const { rows: maxRows } = await sql`SELECT COALESCE(MAX(ordem), 0) + 1 AS prox FROM estoque_secoes`;
          const ordem = maxRows[0]?.prox || 1;
          const { rows } = await sql`
            INSERT INTO estoque_secoes (nome, ordem)
            VALUES (${nome}, ${ordem})
            RETURNING id, nome, ordem
          `;
          return json(res, { ok: true, secao: { ...rows[0], itens: [] } });
        } catch (e) {
          return json(res, { ok: false, message: 'Erro no servidor.', error: e.message }, 500);
        }
      }

      if (acao === 'secao_editar') {
        if (id <= 0) return json(res, { ok: false, message: 'ID da seção é obrigatório.' }, 422);
        const nome = String(body.nome || '').trim();
        if (!nome) return json(res, { ok: false, message: 'Nome da seção é obrigatório.' }, 422);
        try {
          const { rows } = await sql`
            UPDATE estoque_secoes SET nome = ${nome} WHERE id = ${id}
            RETURNING id, nome, ordem
          `;
          if (!rows.length) return json(res, { ok: false, message: 'Seção não encontrada.' }, 404);
          return json(res, { ok: true, secao: rows[0] });
        } catch (e) {
          return json(res, { ok: false, message: 'Erro no servidor.', error: e.message }, 500);
        }
      }

      if (acao === 'secao_excluir') {
        if (id <= 0) return json(res, { ok: false, message: 'ID da seção é obrigatório.' }, 422);
        try {
          await sql`DELETE FROM estoque_itens WHERE secao_id = ${id}`;
          const { rows } = await sql`DELETE FROM estoque_secoes WHERE id = ${id} RETURNING id`;
          if (!rows.length) return json(res, { ok: false, message: 'Seção não encontrada.' }, 404);
          return json(res, { ok: true });
        } catch (e) {
          return json(res, { ok: false, message: 'Erro no servidor.', error: e.message }, 500);
        }
      }

      if (acao === 'item_criar') {
        const secaoId = parseInt(body.secao_id, 10) || 0;
        const nome = String(body.nome || '').trim();
        const quantidade = parseInt(body.quantidade, 10);
        const quantidadeMinima = parseInt(body.quantidade_minima, 10);
        const unidade = String(body.unidade || 'un').trim() || 'un';
        if (secaoId <= 0 || !nome) return json(res, { ok: false, message: 'Seção e nome da peça são obrigatórios.' }, 422);
        if (Number.isNaN(quantidade) || quantidade < 0) return json(res, { ok: false, message: 'Quantidade inválida.' }, 422);
        if (Number.isNaN(quantidadeMinima) || quantidadeMinima < 0) return json(res, { ok: false, message: 'Quantidade mínima inválida.' }, 422);
        try {
          const { rows: secaoRows } = await sql`SELECT id FROM estoque_secoes WHERE id = ${secaoId}`;
          if (!secaoRows.length) return json(res, { ok: false, message: 'Seção não encontrada.' }, 404);
          const { rows } = await sql`
            INSERT INTO estoque_itens (secao_id, nome, quantidade, quantidade_minima, unidade)
            VALUES (${secaoId}, ${nome}, ${quantidade}, ${quantidadeMinima}, ${unidade})
            RETURNING id, secao_id, nome, quantidade, quantidade_minima, unidade
          `;
          const item = { ...rows[0], quantidade: Number(rows[0].quantidade), quantidade_minima: Number(rows[0].quantidade_minima), status: classificarItem(rows[0]) };
          return json(res, { ok: true, item });
        } catch (e) {
          return json(res, { ok: false, message: 'Erro no servidor.', error: e.message }, 500);
        }
      }

      if (acao === 'item_editar') {
        if (id <= 0) return json(res, { ok: false, message: 'ID da peça é obrigatório.' }, 422);
        const secaoId = parseInt(body.secao_id, 10) || 0;
        const nome = String(body.nome || '').trim();
        const quantidade = parseInt(body.quantidade, 10);
        const quantidadeMinima = parseInt(body.quantidade_minima, 10);
        const unidade = String(body.unidade || 'un').trim() || 'un';
        if (secaoId <= 0 || !nome) return json(res, { ok: false, message: 'Seção e nome da peça são obrigatórios.' }, 422);
        if (Number.isNaN(quantidade) || quantidade < 0) return json(res, { ok: false, message: 'Quantidade inválida.' }, 422);
        if (Number.isNaN(quantidadeMinima) || quantidadeMinima < 0) return json(res, { ok: false, message: 'Quantidade mínima inválida.' }, 422);
        try {
          const { rows } = await sql`
            UPDATE estoque_itens
            SET secao_id = ${secaoId}, nome = ${nome}, quantidade = ${quantidade},
                quantidade_minima = ${quantidadeMinima}, unidade = ${unidade}
            WHERE id = ${id}
            RETURNING id, secao_id, nome, quantidade, quantidade_minima, unidade
          `;
          if (!rows.length) return json(res, { ok: false, message: 'Peça não encontrada.' }, 404);
          const item = { ...rows[0], quantidade: Number(rows[0].quantidade), quantidade_minima: Number(rows[0].quantidade_minima), status: classificarItem(rows[0]) };
          return json(res, { ok: true, item });
        } catch (e) {
          return json(res, { ok: false, message: 'Erro no servidor.', error: e.message }, 500);
        }
      }

      if (acao === 'item_ajustar') {
        if (id <= 0) return json(res, { ok: false, message: 'ID da peça é obrigatório.' }, 422);
        const delta = parseInt(body.delta, 10);
        const novaQuantidade = body.quantidade !== undefined ? parseInt(body.quantidade, 10) : null;
        try {
          const { rows: atual } = await sql`SELECT id, quantidade FROM estoque_itens WHERE id = ${id}`;
          if (!atual.length) return json(res, { ok: false, message: 'Peça não encontrada.' }, 404);
          let qtdFinal;
          if (novaQuantidade !== null && !Number.isNaN(novaQuantidade)) {
            qtdFinal = Math.max(0, novaQuantidade);
          } else if (!Number.isNaN(delta)) {
            qtdFinal = Math.max(0, Number(atual[0].quantidade) + delta);
          } else {
            return json(res, { ok: false, message: 'Informe delta ou quantidade.' }, 422);
          }
          const { rows } = await sql`
            UPDATE estoque_itens SET quantidade = ${qtdFinal} WHERE id = ${id}
            RETURNING id, secao_id, nome, quantidade, quantidade_minima, unidade
          `;
          const item = { ...rows[0], quantidade: Number(rows[0].quantidade), quantidade_minima: Number(rows[0].quantidade_minima), status: classificarItem(rows[0]) };
          return json(res, { ok: true, item });
        } catch (e) {
          return json(res, { ok: false, message: 'Erro no servidor.', error: e.message }, 500);
        }
      }

      if (acao === 'item_excluir') {
        if (id <= 0) return json(res, { ok: false, message: 'ID da peça é obrigatório.' }, 422);
        try {
          const { rows } = await sql`DELETE FROM estoque_itens WHERE id = ${id} RETURNING id`;
          if (!rows.length) return json(res, { ok: false, message: 'Peça não encontrada.' }, 404);
          return json(res, { ok: true });
        } catch (e) {
          return json(res, { ok: false, message: 'Erro no servidor.', error: e.message }, 500);
        }
      }

      return json(res, { ok: false, message: 'Ação inválida.' }, 400);
    }

    json(res, { ok: false, message: 'Método não permitido.' }, 405);
  } catch (err) {
    console.error('estoque handler:', err);
    sendJson(res, { ok: false, message: 'Erro no servidor.', error: String(err && err.message) }, 500);
  }
};
