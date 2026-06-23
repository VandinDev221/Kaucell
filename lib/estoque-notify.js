const { sql } = require('./db');
const { normalizarTelefone, enviarWhatsApp } = require('./whatsapp');

function mascararApiKey(key) {
  const k = String(key || '').trim();
  if (!k) return '';
  if (k.length <= 4) return '****';
  return '*'.repeat(Math.max(4, k.length - 4)) + k.slice(-4);
}

async function getNotificacaoConfig() {
  const { rows } = await sql`
    SELECT telefone, callmebot_apikey, ativo, atualizado_em
    FROM estoque_notificacoes
    WHERE id = 1
  `;
  if (!rows.length) {
    return {
      telefone: '',
      callmebot_apikey: '',
      ativo: 0,
      conectado: false,
      telefone_formatado: '',
      apikey_mascarada: ''
    };
  }
  const row = rows[0];
  const telefone = row.telefone || '';
  const apikey = row.callmebot_apikey || '';
  return {
    telefone,
    callmebot_apikey: apikey,
    ativo: row.ativo ? 1 : 0,
    conectado: !!(telefone && apikey),
    telefone_formatado: telefone,
    apikey_mascarada: mascararApiKey(apikey),
    atualizado_em: row.atualizado_em
  };
}

async function salvarNotificacaoConfig({ telefone, callmebot_apikey, ativo, manter_apikey }) {
  const tel = normalizarTelefone(telefone);
  const ativoFlag = ativo ? 1 : 0;
  let apikey = String(callmebot_apikey || '').trim();

  const atual = await getNotificacaoConfig();
  if (!apikey && manter_apikey && atual.callmebot_apikey) {
    apikey = atual.callmebot_apikey;
  }

  await sql`
    INSERT INTO estoque_notificacoes (id, telefone, callmebot_apikey, ativo, atualizado_em)
    VALUES (1, ${tel || null}, ${apikey || null}, ${ativoFlag}, NOW())
    ON CONFLICT (id) DO UPDATE SET
      telefone = EXCLUDED.telefone,
      callmebot_apikey = EXCLUDED.callmebot_apikey,
      ativo = EXCLUDED.ativo,
      atualizado_em = NOW()
  `;

  return getNotificacaoConfig();
}

async function limparAlertasItem(itemId, statusAtual) {
  if (statusAtual === 'ok') {
    await sql`DELETE FROM estoque_alertas_enviados WHERE item_id = ${itemId}`;
    return;
  }
  await sql`
    DELETE FROM estoque_alertas_enviados
    WHERE item_id = ${itemId} AND status <> ${statusAtual}
  `;
}

async function removerAlertasItem(itemId) {
  await sql`DELETE FROM estoque_alertas_enviados WHERE item_id = ${itemId}`;
}

function montarMensagemAlerta(item) {
  if (item.status === 'faltando') {
    return (
      '⚠️ KAUCELL Estoque — EM FALTA\n' +
      item.secao_nome +
      ': ' +
      item.nome +
      ' (0 ' +
      (item.unidade || 'un') +
      ')'
    );
  }
  return (
    '📦 KAUCELL Estoque — BAIXO\n' +
    item.secao_nome +
    ': ' +
    item.nome +
    ' (' +
    item.quantidade +
    ' ' +
    (item.unidade || 'un') +
    ', mín. ' +
    item.quantidade_minima +
    ')'
  );
}

async function processarNotificacoesEstoque(alertas) {
  const config = await getNotificacaoConfig();
  if (!config.ativo || !config.telefone || !config.callmebot_apikey) {
    return { enviados: 0, ignorados: 0 };
  }

  const pendentes = [...(alertas.faltando || []), ...(alertas.baixo || [])];
  let enviados = 0;
  let ignorados = 0;

  for (const item of pendentes) {
    const { rows } = await sql`
      SELECT 1 FROM estoque_alertas_enviados
      WHERE item_id = ${item.id} AND status = ${item.status}
      LIMIT 1
    `;
    if (rows.length) {
      ignorados += 1;
      continue;
    }

    try {
      await enviarWhatsApp(config.telefone, montarMensagemAlerta(item), config.callmebot_apikey);
      await sql`
        INSERT INTO estoque_alertas_enviados (item_id, status, enviado_em)
        VALUES (${item.id}, ${item.status}, NOW())
        ON CONFLICT (item_id, status) DO NOTHING
      `;
      enviados += 1;
    } catch (e) {
      console.error('WhatsApp alerta item', item.id, e.message);
    }
  }

  return { enviados, ignorados };
}

async function enviarTesteNotificacao(telefone, apikey, manterConfig) {
  const config = manterConfig ? await getNotificacaoConfig() : null;
  const tel = normalizarTelefone(telefone || (config && config.telefone));
  const key = String(apikey || '').trim() || (config && config.callmebot_apikey) || '';
  const msg = '✅ KAUCELL: WhatsApp conectado! Você receberá alertas de estoque baixo ou em falta.';
  await enviarWhatsApp(tel, msg, key);
  return { ok: true };
}

module.exports = {
  getNotificacaoConfig,
  salvarNotificacaoConfig,
  limparAlertasItem,
  removerAlertasItem,
  processarNotificacoesEstoque,
  enviarTesteNotificacao,
  mascararApiKey,
  normalizarTelefone
};
