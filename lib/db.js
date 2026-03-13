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
  (process.env.SUPABASE_URL && process.env.SUPABASE_URL.includes('supabase.co')) ||
  (connectionString && connectionString.includes('supabase.co'));

const pool = new Pool({
  connectionString,
  max: 5,
  ssl: isSupabase ? { rejectUnauthorized: false } : undefined
});

async function sql(strings, ...values) {
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
  try {
    const { rows } = await sql('SELECT 1 FROM admins LIMIT 1');
    if (rows.length === 0) {
      const hash = await bcrypt.hash('1234', 10);
      await sql('INSERT INTO admins (usuario, senha_hash) VALUES ($1, $2)', 'admin', hash);
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
      criado_em TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);
}

function json(res, data, status = 200) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.status(status).json(data);
}

module.exports = { sql, ensureTables, json };
