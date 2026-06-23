CREATE TABLE IF NOT EXISTS produtos (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    categoria VARCHAR(120) NOT NULL,
    preco NUMERIC(10,2) NOT NULL,
    imagem_url TEXT NULL,
    imagem_arquivo VARCHAR(255) NULL,
    criado_em TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS servicos (
    id SERIAL PRIMARY KEY,
    modelo VARCHAR(150) NOT NULL,
    nome_servico VARCHAR(255) NOT NULL,
    preco NUMERIC(10,2) NOT NULL,
    criado_em TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS blog_posts (
    id SERIAL PRIMARY KEY,
    titulo VARCHAR(255) NOT NULL,
    data_publicacao DATE NOT NULL,
    resumo TEXT NOT NULL,
    criado_em TIMESTAMP NOT NULL DEFAULT NOW()
);

