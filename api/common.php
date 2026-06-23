<?php
declare(strict_types=1);

function api_json(array $payload, int $status = 200): void
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($payload, JSON_UNESCAPED_UNICODE);
    exit;
}

function api_read_json(): array
{
    $raw = file_get_contents('php://input');
    if ($raw === false || trim($raw) === '') {
        return [];
    }

    $data = json_decode($raw, true);
    return is_array($data) ? $data : [];
}

function api_start_session(): void
{
    if (session_status() === PHP_SESSION_NONE) {
        session_name('KAUCELL_ADMIN');
        session_start();
    }
}

function api_is_admin(): bool
{
    api_start_session();
    return !empty($_SESSION['is_admin']);
}

function api_require_admin_auth(): void
{
    if (!api_is_admin()) {
        api_json(['ok' => false, 'message' => 'Não autorizado. Faça login no painel admin.'], 401);
    }
}

function api_db(): PDO
{
    static $pdo = null;
    if ($pdo instanceof PDO) {
        return $pdo;
    }

    // Usa um arquivo SQLite dentro da pasta "database"
    $dbPath = __DIR__ . '/../database/data.sqlite';
    $dsn = 'sqlite:' . $dbPath;

    // Garante que a pasta existe
    $dir = dirname($dbPath);
    if (!is_dir($dir)) {
        mkdir($dir, 0777, true);
    }

    $pdo = new PDO($dsn, null, null, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);

    return $pdo;
}

function api_bootstrap_tables(PDO $pdo): void
{
    // Sintaxe adaptada para SQLite
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS admins (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            usuario TEXT NOT NULL UNIQUE,
            senha_hash TEXT NOT NULL,
            criado_em TEXT NOT NULL DEFAULT (datetime('now'))
        );
    ");
    $hash = password_hash('kaua2310#', PASSWORD_DEFAULT);
    $stmt = $pdo->query("SELECT id, usuario FROM admins LIMIT 5");
    $admins = $stmt->fetchAll(PDO::FETCH_ASSOC);
    if (count($admins) === 0) {
        $pdo->prepare("INSERT INTO admins (usuario, senha_hash) VALUES ('kaua123', ?)")->execute([$hash]);
    } else {
        foreach ($admins as $row) {
            if (($row['usuario'] ?? '') === 'admin') {
                $pdo->prepare("UPDATE admins SET usuario = 'kaua123', senha_hash = ? WHERE id = ?")->execute([$hash, $row['id']]);
                break;
            }
        }
    }

    $pdo->exec("
        CREATE TABLE IF NOT EXISTS produtos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome TEXT NOT NULL,
            categoria TEXT NOT NULL,
            preco REAL NOT NULL,
            imagem_url TEXT NULL,
            imagem_arquivo TEXT NULL,
            criado_em TEXT NOT NULL DEFAULT (datetime('now'))
        );
    ");

    // Garante coluna de destaque mesmo em bancos antigos
    try {
        $pdo->exec("ALTER TABLE produtos ADD COLUMN destaque INTEGER NOT NULL DEFAULT 0;");
    } catch (Throwable $e) {
        // coluna já existe, ignora
    }

    $pdo->exec("
        CREATE TABLE IF NOT EXISTS servicos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            modelo TEXT NOT NULL,
            nome_servico TEXT NOT NULL,
            preco REAL NOT NULL,
            criado_em TEXT NOT NULL DEFAULT (datetime('now'))
        );
    ");

    $pdo->exec("
        CREATE TABLE IF NOT EXISTS blog_posts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            titulo TEXT NOT NULL,
            data_publicacao TEXT NOT NULL,
            resumo TEXT NOT NULL,
            imagem_url TEXT,
            criado_em TEXT NOT NULL DEFAULT (datetime('now'))
        );
    ");
    try {
        $pdo->exec('ALTER TABLE blog_posts ADD COLUMN imagem_url TEXT');
    } catch (Throwable $e) {}

    $pdo->exec("
        CREATE TABLE IF NOT EXISTS estoque_secoes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome TEXT NOT NULL,
            ordem INTEGER NOT NULL DEFAULT 0,
            criado_em TEXT NOT NULL DEFAULT (datetime('now'))
        );
    ");

    $pdo->exec("
        CREATE TABLE IF NOT EXISTS estoque_itens (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            secao_id INTEGER NOT NULL,
            nome TEXT NOT NULL,
            quantidade INTEGER NOT NULL DEFAULT 0,
            quantidade_minima INTEGER NOT NULL DEFAULT 0,
            unidade TEXT NOT NULL DEFAULT 'un',
            criado_em TEXT NOT NULL DEFAULT (datetime('now')),
            FOREIGN KEY (secao_id) REFERENCES estoque_secoes(id) ON DELETE CASCADE
        );
    ");

    $pdo->exec("
        CREATE TABLE IF NOT EXISTS estoque_notificacoes (
            id INTEGER PRIMARY KEY CHECK (id = 1),
            telefone TEXT,
            callmebot_apikey TEXT,
            ativo INTEGER NOT NULL DEFAULT 0,
            atualizado_em TEXT NOT NULL DEFAULT (datetime('now'))
        );
    ");
    $pdo->exec('INSERT OR IGNORE INTO estoque_notificacoes (id) VALUES (1)');

    $pdo->exec("
        CREATE TABLE IF NOT EXISTS estoque_alertas_enviados (
            item_id INTEGER NOT NULL,
            status TEXT NOT NULL,
            enviado_em TEXT NOT NULL DEFAULT (datetime('now')),
            PRIMARY KEY (item_id, status)
        );
    ");
}

