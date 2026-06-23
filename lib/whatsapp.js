function normalizarTelefone(raw) {
  const digits = String(raw || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('55') && digits.length >= 12) return digits;
  if (digits.length >= 10 && digits.length <= 11) return '55' + digits;
  return digits;
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
    throw new Error(body.trim() || 'Não foi possível enviar a mensagem pelo WhatsApp.');
  }
  return { ok: true, resposta: body.trim() };
}

module.exports = { normalizarTelefone, enviarWhatsApp };
