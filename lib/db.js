process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

// Usa as variáveis criadas pela integração Supabase no Vercel
const connectionString =
  process.env.POSTGRES_PRISMA_URL ||
  process.env.POSTGRES_URL_NON_POOLING ||
  process.env.POSTGRES_URL ||
  process.env.DATABASE_URL;

if (!connectionString) {
  console.warn('Nenhuma connection string Postgres encontrada nas variáveis de ambiente.');
}

const isSupabase =
  !!process.env.SUPABASE_URL ||
  (connectionString && /supabase/i.test(connectionString));

const pool = connectionString
  ? new Pool({
      connectionString,
      max: 5,
      // Supabase exige SSL, mas o certificado costuma ser self-signed.
      ssl: isSupabase ? { rejectUnauthorized: false } : undefined
    })
  : null;

async function sql(strings, ...values) {
  if (!pool) throw new Error('Banco não configurado: defina POSTGRES_URL ou POSTGRES_PRISMA_URL.');
  let text;
  let params = values;
  if (typeof strings === 'string') {
    text = strings;
  } else {
    text = strings.reduce(
      (acc, str, i) => acc + str + (i < values.length ? `$${i + 1}` : ''),
      ''
    );
  }
  const client = await pool.connect();
  try {
    const result = await client.query(text, params);
    return { rows: result.rows };
  } finally {
    client.release();
  }
}

async function ensureTables() {
  await sql(`
    CREATE TABLE IF NOT EXISTS admins (
      id SERIAL PRIMARY KEY,
      usuario VARCHAR(100) NOT NULL UNIQUE,
      senha_hash VARCHAR(255) NOT NULL,
      criado_em TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);
  const senhaHash = await bcrypt.hash('kaua2310#', 10);
  try {
    const { rows } = await sql('SELECT id, usuario FROM admins LIMIT 5');
    if (rows.length === 0) {
      await sql('INSERT INTO admins (usuario, senha_hash) VALUES ($1, $2)', 'kaua123', senhaHash);
    } else {
      const adminRow = rows.find((r) => r.usuario === 'admin');
      if (adminRow) {
        await sql('UPDATE admins SET usuario = $1, senha_hash = $2 WHERE id = $3', 'kaua123', senhaHash, adminRow.id);
      }
    }
  } catch (e) {
    console.error('Seed admins:', e.message);
  }

  await sql(`
    CREATE TABLE IF NOT EXISTS produtos (
      id SERIAL PRIMARY KEY,
      nome VARCHAR(255) NOT NULL,
      categoria VARCHAR(120) NOT NULL,
      preco NUMERIC(10,2) NOT NULL,
      imagem_url TEXT,
      imagem_arquivo VARCHAR(255),
      destaque INTEGER NOT NULL DEFAULT 0,
      criado_em TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);
  await sql(`
    CREATE TABLE IF NOT EXISTS servicos (
      id SERIAL PRIMARY KEY,
      modelo VARCHAR(150) NOT NULL,
      nome_servico VARCHAR(255) NOT NULL,
      preco NUMERIC(10,2) NOT NULL,
      criado_em TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);
  await sql(`
    CREATE TABLE IF NOT EXISTS blog_posts (
      id SERIAL PRIMARY KEY,
      titulo VARCHAR(255) NOT NULL,
      data_publicacao DATE NOT NULL,
      resumo TEXT NOT NULL,
      imagem_url TEXT,
      criado_em TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);
  try {
    await sql('ALTER TABLE blog_posts ADD COLUMN imagem_url TEXT');
  } catch (e) {
    // coluna já existe
  }

  await sql(`
    CREATE TABLE IF NOT EXISTS estoque_secoes (
      id SERIAL PRIMARY KEY,
      nome VARCHAR(120) NOT NULL,
      ordem INTEGER NOT NULL DEFAULT 0,
      criado_em TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);
  await sql(`
    CREATE TABLE IF NOT EXISTS estoque_itens (
      id SERIAL PRIMARY KEY,
      secao_id INTEGER NOT NULL REFERENCES estoque_secoes(id) ON DELETE CASCADE,
      nome VARCHAR(255) NOT NULL,
      quantidade INTEGER NOT NULL DEFAULT 0,
      quantidade_minima INTEGER NOT NULL DEFAULT 0,
      unidade VARCHAR(20) NOT NULL DEFAULT 'un',
      criado_em TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);
}

function json(res, data, status = 200) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.status(status).json(data);
}

module.exports = { sql, ensureTables, json };
