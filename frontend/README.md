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

