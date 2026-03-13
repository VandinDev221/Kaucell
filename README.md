## Frontend da loja KAUCELL

Este diretório deve concentrar todo o **código de frontend** da aplicação:

- Páginas HTML (`index.html`, `produtos.html`, `servicos.html`, `blog.html`, `admin.html`);
-,CSS global (`styles.css`);
- JavaScript da interface (`script.js`, `servicos.js`, `admin.js`, etc.).

No momento, os arquivos ainda estão na raiz do projeto (`c:\project\lojavirtual`) para manter compatibilidade com o backend PHP que atende `index.html` diretamente.

### Meta de organização

Conforme o projeto crescer, a ideia é mover:

- De `./index.html` → para `./frontend/index.html`
- De `./styles.css` → para `./frontend/styles.css`
- De `./*.js` → para `./frontend/*.js`

E configurar o servidor web (ou um bundler, como Vite/Webpack) para servir o conteúdo a partir deste diretório.

---

## Deploy no Vercel

1. **Configuração do projeto**
   - Framework Preset: **Other**
   - **Root Directory:** deixe vazio (raiz do repositório)
   - **Build Command:** `npm run build`
   - **Output Directory:** `public` (o build copia o frontend para essa pasta)

2. **Variáveis de ambiente** (Vercel → Project → Settings → Environment Variables):
   - `ADMIN_USER` e `ADMIN_PASS` para o painel admin
   - Conectar **Vercel Postgres** e **Vercel Blob** no projeto (Storage)

3. Após o deploy, acesse `https://seu-projeto.vercel.app` — a raiz deve exibir a página inicial.

