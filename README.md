# KAUCELL — Loja virtual

Frontend estático + API (PHP local / serverless no Vercel).

## Estrutura do projeto

```
├── frontend/          # Interface (HTML, CSS, JS) — única fonte do frontend
│   ├── index.html
│   ├── admin.html, blog.html, produtos.html, servicos.html
│   ├── styles.css
│   ├── script.js, admin.js, servicos.js, servicos-dados.js
│   └── README.md
├── api/               # Endpoints da API
│   ├── *.php          # Versão PHP (desenvolvimento local)
│   ├── *.js           # Versão serverless (Vercel)
│   ├── common.php
│   └── config.local.example.php
├── lib/               # Bibliotecas compartilhadas (db, auth)
├── database/          # Schema e migrações
├── scripts/           # Build e utilitários (ex.: copy-frontend.js)
├── public/            # Saída do build (frontend copiado) — usado no deploy
└── backend/           # Backend PHP opcional (estrutura alternativa)
```

- **Frontend:** todo o código de interface fica em `frontend/`. O build copia para `public/`.
- **API:** em `api/` (PHP para ambiente local, JS para Vercel).
- Não há mais arquivos de frontend nem PHP de produtos/serviços na raiz.

## Desenvolvimento local

1. **Só frontend (estático)**  
   `npm run build` e abrir os arquivos em `public/` ou servir a pasta:
   ```bash
   npm run build
   npx serve public -p 3000
   ```

2. **Com API PHP**  
   Servir a raiz do projeto com PHP (ex.: `php -S localhost:8000`) e acessar `frontend/` ou, após o build, `public/`. As chamadas da interface usam `api/produtos.php`, `api/servicos.php`, etc.

## Deploy no Vercel

1. **Configuração**
   - Framework Preset: **Other**
   - **Root Directory:** raiz do repositório
   - **Build Command:** `npm run build`
   - **Output Directory:** `public`

2. **Variáveis de ambiente**
   - `ADMIN_USER` e `ADMIN_PASS` para o painel admin
   - Vercel Postgres e Vercel Blob conectados ao projeto

3. Após o deploy, a raiz do site exibe a página inicial (conteúdo de `public/`).
