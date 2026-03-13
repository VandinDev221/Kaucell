## Backend da loja KAUCELL

Este diretório é destinado ao **backend PHP** da loja.

### Organização sugerida

- `backend/public/`
  - Ponto de entrada HTTP (ex.: `index.php`) quando usar Apache/Nginx.
  - Arquivos estáticos construídos do frontend (em produção, se desejar).

- `backend/api/`
  - Endpoints PHP da API:
    - `produtos.php`
    - `servicos.php`
    - `blog.php`
    - `auth.php`
    - `upload.php`
    - `common.php` (funções compartilhadas).

- `backend/database/`
  - Arquivos de banco de dados (SQLite) e migrações.

### Situação atual

Neste momento, por simplicidade:

- Os arquivos de API ainda estão em `./api/`
- O banco SQLite está em `./database/data.sqlite`

O próximo passo natural é:

1. Mover `./api` → `./backend/api`
2. Mover `./database` → `./backend/database`
3. Ajustar os `require`/paths em `common.php`
4. Configurar o servidor web para apontar para `backend/public` como document root.

