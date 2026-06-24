const { sql } = require('./db');
const { normalizarTelefone, enviarWhatsApp } = require('./whatsapp');

function getEnvApiKey() {
  return String(process.env.CALLMEBOT_APIKEY || process.env.CALLMEBOT_API_KEY || '').trim();
}

function mascararApiKey(key) {
  const k = String(key || '').trim();
  if (!k) return '';
  if (k.length <= 4) return '****';
  return '*'.repeat(Math.max(4, k.length - 4)) + k.slice(-4);
}

async function getNotificacaoConfigRaw() {
  const { rows } = await sql`
    SELECT telefone, callmebot_apikey, ativo, atualizado_em
    FROM estoque_notificacoes
    WHERE id = 1
  `;
  return rows[0] || null;
}

function montarNotificacaoConfig(row) {
  const envKey = getEnvApiKey();
  const telefone = row?.telefone || '';
  const dbKey = row?.callmebot_apikey || '';
  const apikey = envKey || dbKey;

  return {
    telefone,
    callmebot_apikey: apikey,
    ativo: row?.ativo ? 1 : 0,
    conectado: !!(telefone && apikey),
    telefone_formatado: telefone,
    apikey_mascarada: mascararApiKey(apikey),
    apikey_env: !!envKey,
    atualizado_em: row?.atualizado_em || null
  };
}

async function getNotificacaoConfig() {
  const row = await getNotificacaoConfigRaw();
  if (!row) {
    const envKey = getEnvApiKey();
    return {
      telefone: '',
      callmebot_apikey: envKey,
      ativo: 0,
      conectado: false,
      telefone_formatado: '',
      apikey_mascarada: mascararApiKey(envKey),
      apikey_env: !!envKey,
      atualizado_em: null
    };
  }
  return montarNotificacaoConfig(row);
}

async function salvarNotificacaoConfig({ telefone, callmebot_apikey, ativo, manter_apikey }) {
  const tel = normalizarTelefone(telefone);
  const ativoFlag = ativo ? 1 : 0;
  const envKey = getEnvApiKey();

  if (envKey) {
    await sql`
      INSERT INTO estoque_notificacoes (id, telefone, callmebot_apikey, ativo, atualizado_em)
      VALUES (1, ${tel || null}, null, ${ativoFlag}, NOW())
      ON CONFLICT (id) DO UPDATE SET
        telefone = EXCLUDED.telefone,
        ativo = EXCLUDED.ativo,
        atualizado_em = NOW()
    `;
    return getNotificacaoConfig();
  }

  let dbApikey = String(callmebot_apikey || '').trim();
  const row = await getNotificacaoConfigRaw();
  const dbCurrent = row?.callmebot_apikey || '';
  if (!dbApikey && manter_apikey && dbCurrent) {
    dbApikey = dbCurrent;
  }

  await sql`
    INSERT INTO estoque_notificacoes (id, telefone, callmebot_apikey, ativo, atualizado_em)
    VALUES (1, ${tel || null}, ${dbApikey || null}, ${ativoFlag}, NOW())
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
  const key =
    getEnvApiKey() ||
    String(apikey || '').trim() ||
    (config && config.callmebot_apikey) ||
    '';
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
  normalizarTelefone,
  getEnvApiKey
};
