function normalizarTelefone(raw) {
  const digits = String(raw || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('55') && digits.length >= 12) return digits;
  if (digits.length >= 10 && digits.length <= 11) return '55' + digits;
  return digits;
}

function parseCallMeBotErro(body) {
  const text = String(body || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (/apikey is invalid/i.test(text)) {
    return (
      'API Key inválida. Atualize a variável CALLMEBOT_APIKEY na Vercel ou gere uma nova no CallMeBot ' +
      '(+34 694 23 67 31) com o mesmo número cadastrado no estoque.'
    );
  }
  if (/phone.*invalid|invalid phone/i.test(text)) {
    return 'Número de WhatsApp inválido. Use DDD + número (ex: 98991808746).';
  }
  return text || 'Não foi possível enviar a mensagem pelo WhatsApp.';
}

async function enviarWhatsApp(telefone, texto, apikey) {
  const phone = normalizarTelefone(telefone);
  const key = String(apikey || '').trim();
  const msg = String(texto || '').trim();
  if (!phone || !key || !msg) {
    throw new Error('Telefone, API Key e mensagem são obrigatórios.');
  }

  const url =
    'https://api.callmebot.com/whatsapp.php?phone=' +
    encodeURIComponent(phone) +
    '&text=' +
    encodeURIComponent(msg) +
    '&apikey=' +
    encodeURIComponent(key);

  const res = await fetch(url);
  const body = await res.text();
  const falha = !res.ok || /error|invalid|fail/i.test(body);
  if (falha) {
    throw new Error(parseCallMeBotErro(body));
  }
  return { ok: true, resposta: body.trim() };
}

module.exports = { normalizarTelefone, enviarWhatsApp, parseCallMeBotErro };
