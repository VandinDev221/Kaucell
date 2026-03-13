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
            criado_em TEXT NOT NULL DEFAULT (datetime('now'))
        );
    ");
}

