const { sql } = require('@vercel/postgres');

async function ensureTables() {
  await sql`
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
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS servicos (
      id SERIAL PRIMARY KEY,
      modelo VARCHAR(150) NOT NULL,
      nome_servico VARCHAR(255) NOT NULL,
      preco NUMERIC(10,2) NOT NULL,
      criado_em TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS blog_posts (
      id SERIAL PRIMARY KEY,
      titulo VARCHAR(255) NOT NULL,
      data_publicacao DATE NOT NULL,
      resumo TEXT NOT NULL,
      criado_em TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `;
}

function json(res, data, status = 200) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.status(status).json(data);
}

module.exports = { sql, ensureTables, json };
