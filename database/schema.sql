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

CREATE TABLE IF NOT EXISTS estoque_secoes (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(120) NOT NULL,
    ordem INTEGER NOT NULL DEFAULT 0,
    criado_em TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS estoque_itens (
    id SERIAL PRIMARY KEY,
    secao_id INTEGER NOT NULL REFERENCES estoque_secoes(id) ON DELETE CASCADE,
    nome VARCHAR(255) NOT NULL,
    quantidade INTEGER NOT NULL DEFAULT 0,
    quantidade_minima INTEGER NOT NULL DEFAULT 0,
    unidade VARCHAR(20) NOT NULL DEFAULT 'un',
    criado_em TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS estoque_notificacoes (
    id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    telefone VARCHAR(20),
    callmebot_apikey VARCHAR(120),
    ativo INTEGER NOT NULL DEFAULT 0,
    atualizado_em TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS estoque_alertas_enviados (
    item_id INTEGER NOT NULL,
    status VARCHAR(20) NOT NULL,
    enviado_em TIMESTAMP NOT NULL DEFAULT NOW(),
    PRIMARY KEY (item_id, status)
);

