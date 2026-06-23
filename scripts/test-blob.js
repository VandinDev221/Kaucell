const { put } = require('@vercel/blob');

async function main() {
  try {
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      console.error('BLOB_READ_WRITE_TOKEN não definido no ambiente.');
      process.exit(1);
    }
    console.log('Usando BLOB_READ_WRITE_TOKEN (prefixo):', process.env.BLOB_READ_WRITE_TOKEN.slice(0, 32) + '...');

    const path = 'teste-kaucell-' + Date.now() + '.txt';
    const { url } = await put(path, 'hello from test', { access: 'public' });
    console.log('UPLOAD_OK', url);
  } catch (e) {
    console.error('UPLOAD_ERROR', e.message || e);
    process.exit(1);
  }
}

main();

