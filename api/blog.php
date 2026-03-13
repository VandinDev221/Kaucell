<?php
declare(strict_types=1);
require __DIR__ . '/common.php';

try {
    $pdo = api_db();
    api_bootstrap_tables($pdo);

    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        $rows = $pdo->query("SELECT id, titulo, data_publicacao, resumo FROM blog_posts ORDER BY id DESC")->fetchAll();
        api_json(['ok' => true, 'items' => $rows]);
    }

    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        api_require_admin_auth();

        $data = api_read_json();
        $titulo = trim((string)($data['titulo'] ?? ''));
        $dataPublicacao = trim((string)($data['data_publicacao'] ?? ''));
        $resumo = trim((string)($data['resumo'] ?? ''));

        if ($titulo === '' || $dataPublicacao === '' || $resumo === '') {
            api_json(['ok' => false, 'message' => 'Dados do post inválidos.'], 422);
        }

        $stmt = $pdo->prepare("
            INSERT INTO blog_posts (titulo, data_publicacao, resumo)
            VALUES (:titulo, :data_publicacao, :resumo)
        ");
        $stmt->execute([
            ':titulo' => $titulo,
            ':data_publicacao' => $dataPublicacao,
            ':resumo' => $resumo,
        ]);

        $idNovo = (int)$pdo->lastInsertId();
        $stmtSel = $pdo->prepare("SELECT id, titulo, data_publicacao, resumo FROM blog_posts WHERE id = :id");
        $stmtSel->execute([':id' => $idNovo]);
        $item = $stmtSel->fetch();

        api_json(['ok' => true, 'item' => $item]);
    }

    api_json(['ok' => false, 'message' => 'Método não permitido.'], 405);
} catch (Throwable $e) {
    api_json(['ok' => false, 'message' => 'Erro no servidor.', 'error' => $e->getMessage()], 500);
}

