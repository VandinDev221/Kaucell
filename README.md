## Loja virtual KAUCELL

Projeto de exemplo de loja virtual simples, organizado em **frontend** e **backend PHP** com banco **SQLite**.

### Visão geral da arquitetura

- **frontend/**
  - HTML, CSS e JS estáticos.
  - Páginas:
    - `index.html` — home com produtos em destaque.
    - `produtos.html` — catálogo.
    - `servicos.html` — consulta de serviços por modelo.
    - `blog.html` — listagem de posts.
    - `admin.html` — painel administrativo (acesso restrito).
  - `styles.css` — estilos globais.
  - `script.js`, `servicos.js`, `admin.js` — scripts da UI.

- **backend/**
  - `public/index.php` — ponto de entrada quando usar servidor web (Apache/Nginx).
  - `api/` — endpoints REST em PHP:
    - `api/produtos.php`
    - `api/servicos.php`
    - `api/blog.php`
    - `api/auth.php` — login/logout admin.
    - `api/upload.php` — upload de imagens.
    - `api/common.php` — utilitários (JSON, DB, sessão, auth).
  - `database/data.sqlite` — banco de dados SQLite.

> Observação: hoje os arquivos ainda estão todos na raiz do projeto por simplicidade. A estrutura acima é a **meta** de organização. Conforme o projeto crescer, os arquivos podem ser movidos para esses diretórios mantendo as mesmas rotas.

### Requisitos

- PHP 8+ com extensões:
  - `pdo_sqlite`
  - `sqlite3`
- Nenhuma dependência externa é obrigatória (sem Composer).

### Como rodar em desenvolvimento

1. Ative as extensões no `php.ini` se necessário:

   ```ini
   extension=pdo_sqlite
   extension=sqlite3
   ```

2. No diretório do projeto, usando o front controller do backend:

   ```bash
   php -S localhost:8000 -t backend/public
   ```

3. Acesse no navegador:

   - `http://localhost:8000/` — loja (home)
   - `http://localhost:8000/admin.html` — painel admin

### Credenciais do painel admin

Login padrão (definido em `api/auth.php`):

- **Usuário**: `admin`
- **Senha**: `1234`

Para mudar, altere as variáveis em `api/auth.php`:

```php
$adminUser = getenv('ADMIN_USER') ?: 'admin';
$adminPass = getenv('ADMIN_PASS') ?: '1234';
```

Você pode configurar variáveis de ambiente `ADMIN_USER` e `ADMIN_PASS` em produção.

### Estrutura de banco de dados

O banco SQLite é criado automaticamente em `database/data.sqlite` na primeira chamada da API.

Tabelas:

- `produtos (id, nome, categoria, preco, imagem_url, imagem_arquivo, criado_em)`
- `servicos (id, modelo, nome_servico, preco, criado_em)`
- `blog_posts (id, titulo, data_publicacao, resumo, criado_em)`

---

## Deploy no Vercel

O projeto está pronto para subir no **Vercel**. No Vercel a API roda em **Node.js (serverless)**, não em PHP.

### Passo a passo

1. **Instale as dependências** (para o Vercel fazer o build):
   ```bash
   npm install
   ```

2. **Conecte o repositório ao Vercel**
   - Acesse [vercel.com](https://vercel.com), faça login e **Add New Project**.
   - Importe o repositório Git do projeto (GitHub, GitLab ou Bitbucket).
   - O Vercel detecta a raiz do projeto; não é necessário configurar **Root Directory**.

3. **Adicione o banco Postgres no Vercel**
   - No projeto no Vercel, vá em **Storage** → **Create Database** → **Postgres** (Vercel Postgres).
   - Conecte o storage ao projeto. As variáveis de ambiente (`POSTGRES_URL`, etc.) são preenchidas automaticamente.

4. **Adicione o Blob Storage (para upload de imagens)**
   - Em **Storage** → **Create Database** → **Blob** (Vercel Blob).
   - Conecte ao projeto para que as imagens enviadas pelo admin sejam salvas na nuvem.

5. **Variáveis de ambiente (opcional)**
   - Em **Settings** → **Environment Variables** do projeto, você pode definir:
     - `ADMIN_USER` — usuário do painel admin (padrão: `admin`).
     - `ADMIN_PASS` — senha do admin (padrão: `1234`).
     - `ADMIN_SECRET` — segredo para assinatura do cookie de login (recomendado em produção).

6. **Deploy**
   - Clique em **Deploy**. O Vercel vai publicar o frontend (pasta `frontend/`) e as funções em `api/*.js`.
   - As URLs `api/produtos.php`, `api/servicos.php`, etc. são reescritas para `api/produtos`, `api/servicos`, etc., então o frontend continua funcionando sem alteração.

### O que roda no Vercel

- **Estático**: tudo em `frontend/` (HTML, CSS, JS) é servido com as rotas configuradas em `vercel.json`.
- **API**: os arquivos `api/produtos.js`, `api/servicos.js`, `api/blog.js`, `api/auth.js`, `api/upload.js` viram **Serverless Functions**.
- **Banco**: **Vercel Postgres** (tabelas `produtos`, `servicos`, `blog_posts` são criadas na primeira requisição).
- **Upload de imagens**: **Vercel Blob**; a URL retornada é usada direto nos produtos.

### Desenvolvimento local

- **Com PHP** (banco SQLite): `php -S localhost:8000 -t backend/public`.
- **Com Node (simulando Vercel)**: use `vercel dev` após instalar a [CLI do Vercel](https://vercel.com/docs/cli) (`npm i -g vercel`). Assim você testa as funções e o Postgres localmente.

---

### Próximos passos para escalar

- Separar fisicamente em:
  - `frontend/` (HTML/CSS/JS).
  - `backend/` (API PHP com roteador único `public/index.php`).
- Adicionar:
  - `docker-compose.yml` com:
    - `app` (PHP + servidor web).
    - (Opcional) migração futura de SQLite para PostgreSQL.
  - Testes automatizados de API em PHP.
  - Pipeline de build/deploy (CI/CD).

