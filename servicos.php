<?php
declare(strict_types=1);
require __DIR__ . '/common.php';

try {
    $pdo = api_db();
    api_bootstrap_tables($pdo);

    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        $rows = $pdo->query("SELECT id, modelo, nome_servico, preco FROM servicos ORDER BY id DESC")->fetchAll();
        api_json(['ok' => true, 'items' => $rows]);
    }

    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        api_require_admin_auth();

        $data = api_read_json();
        $modelo = trim((string)($data['modelo'] ?? ''));
        $nomeServico = trim((string)($data['nome_servico'] ?? ''));
        $preco = (float)($data['preco'] ?? 0);

        if ($modelo === '' || $nomeServico === '' || $preco <= 0) {
            api_json(['ok' => false, 'message' => 'Dados de serviço inválidos.'], 422);
        }

        $stmt = $pdo->prepare("
            INSERT INTO servicos (modelo, nome_servico, preco)
            VALUES (:modelo, :nome_servico, :preco)
            RETURNING id, modelo, nome_servico, preco
        ");
        $stmt->execute([
            ':modelo' => $modelo,
            ':nome_servico' => $nomeServico,
            ':preco' => $preco,
        ]);

        api_json(['ok' => true, 'item' => $stmt->fetch()]);
    }

    api_json(['ok' => false, 'message' => 'Método não permitido.'], 405);
} catch (Throwable $e) {
    api_json(['ok' => false, 'message' => 'Erro no servidor.', 'error' => $e->getMessage()], 500);
}

