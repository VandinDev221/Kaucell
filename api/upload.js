const { put } = require('@vercel/blob');
const { requireAdmin } = require('../lib/auth');

function json(res, data, status = 200) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.status(status).json(data);
}

const ALLOWED_EXT = ['jpg', 'jpeg', 'png', 'gif', 'webp'];

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return json(res, { ok: false, message: 'Método não permitido.' }, 405);
  }

  if (!requireAdmin(req, res, () => {})) return;

  try {
    const contentType = req.headers['content-type'] || '';
    if (!contentType.includes('multipart/form-data')) {
      return json(res, { ok: false, message: 'Envie o arquivo como multipart/form-data (campo imagem).' }, 400);
    }

    const boundary = contentType.split('boundary=')[1]?.trim()?.replace(/["']/g, '');
    if (!boundary) {
      return json(res, { ok: false, message: 'Falha no upload da imagem.' }, 400);
    }

    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const raw = Buffer.concat(chunks);
    const parts = raw.toString('binary').split('--' + boundary);

    let fileBuffer = null;
    let filename = '';

    for (const part of parts) {
      if (part.includes('Content-Disposition') && part.includes('name="imagem"')) {
        const match = part.match(/filename="([^"]+)"/);
        if (match) filename = match[1];
        const endOfHeaders = part.indexOf('\r\n\r\n');
        if (endOfHeaders !== -1) {
          const body = part.slice(endOfHeaders + 4);
          const end = body.indexOf('\r\n--');
          fileBuffer = Buffer.from(end === -1 ? body : body.slice(0, end), 'binary');
        }
        break;
      }
    }

    if (!fileBuffer || !filename) {
      return json(res, { ok: false, message: 'Falha no upload da imagem.' }, 400);
    }

    const ext = filename.split('.').pop().toLowerCase();
    if (!ALLOWED_EXT.includes(ext)) {
      return json(res, { ok: false, message: 'Tipo de arquivo não permitido.' }, 400);
    }

    const safeName = require('crypto').randomBytes(8).toString('hex') + '.' + ext;
    const blob = await put(safeName, fileBuffer, {
      access: 'public',
      contentType: `image/${ext === 'jpg' ? 'jpeg' : ext}`
    });

    return json(res, {
      ok: true,
      url: blob.url,
      filename: safeName,
      original: filename
    });
  } catch (e) {
    return json(res, { ok: false, message: 'Erro no servidor.', error: e.message }, 500);
  }
};
