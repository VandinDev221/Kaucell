<?php
declare(strict_types=1);
require __DIR__ . '/common.php';

try {
    $pdo = api_db();
    api_bootstrap_tables($pdo);

    $id = isset($_GET['id']) ? (int)$_GET['id'] : 0;
    $acao = isset($_GET['acao']) ? (string)$_GET['acao'] : '';

    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        $rows = $pdo->query("SELECT id, nome, categoria, preco, imagem_url, imagem_arquivo, destaque FROM produtos ORDER BY id DESC")->fetchAll();
        api_json(['ok' => true, 'items' => $rows]);
    }

    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        api_require_admin_auth();

        $data = api_read_json();
        $nome = trim((string)($data['nome'] ?? ''));
        $categoria = trim((string)($data['categoria'] ?? ''));
        $preco = (float)($data['preco'] ?? 0);
        $imagemUrl = trim((string)($data['imagem_url'] ?? ''));
        $imagemArquivo = trim((string)($data['imagem_arquivo'] ?? ''));
        $destaque = !empty($data['destaque']) ? 1 : 0;

        if ($acao === '' || $acao === 'criar') {
            if ($nome === '' || $categoria === '' || $preco <= 0) {
                api_json(['ok' => false, 'message' => 'Dados de produto inválidos.'], 422);
            }

            $stmt = $pdo->prepare("
                INSERT INTO produtos (nome, categoria, preco, imagem_url, imagem_arquivo, destaque)
                VALUES (:nome, :categoria, :preco, :imagem_url, :imagem_arquivo, :destaque)
            ");
            $stmt->execute([
                ':nome' => $nome,
                ':categoria' => $categoria,
                ':preco' => $preco,
                ':imagem_url' => $imagemUrl !== '' ? $imagemUrl : null,
                ':imagem_arquivo' => $imagemArquivo !== '' ? $imagemArquivo : null,
                ':destaque' => $destaque,
            ]);

            $idNovo = (int)$pdo->lastInsertId();
            $stmtSel = $pdo->prepare("SELECT id, nome, categoria, preco, imagem_url, imagem_arquivo, destaque FROM produtos WHERE id = :id");
            $stmtSel->execute([':id' => $idNovo]);
            $item = $stmtSel->fetch();
            api_json(['ok' => true, 'item' => $item]);
        }

        if ($acao === 'editar') {
            if ($id <= 0) {
                api_json(['ok' => false, 'message' => 'ID do produto é obrigatório.'], 422);
            }
            if ($nome === '' || $categoria === '' || $preco <= 0) {
                api_json(['ok' => false, 'message' => 'Dados de produto inválidos.'], 422);
            }

            $stmt = $pdo->prepare("
                UPDATE produtos
                   SET nome = :nome,
                       categoria = :categoria,
                       preco = :preco,
                       imagem_url = :imagem_url,
                       imagem_arquivo = :imagem_arquivo,
                       destaque = :destaque
                 WHERE id = :id
            ");
            $stmt->execute([
                ':id' => $id,
                ':nome' => $nome,
                ':categoria' => $categoria,
                ':preco' => $preco,
                ':imagem_url' => $imagemUrl !== '' ? $imagemUrl : null,
                ':imagem_arquivo' => $imagemArquivo !== '' ? $imagemArquivo : null,
                ':destaque' => $destaque,
            ]);

            if ($stmt->rowCount() === 0) {
                api_json(['ok' => false, 'message' => 'Produto não encontrado.'], 404);
            }

            $stmtSel = $pdo->prepare("SELECT id, nome, categoria, preco, imagem_url, imagem_arquivo, destaque FROM produtos WHERE id = :id");
            $stmtSel->execute([':id' => $id]);
            $item = $stmtSel->fetch();
            api_json(['ok' => true, 'item' => $item]);
        }

        if ($acao === 'excluir') {
            if ($id <= 0) {
                api_json(['ok' => false, 'message' => 'ID do produto é obrigatório.'], 422);
            }

            $stmt = $pdo->prepare("DELETE FROM produtos WHERE id = :id");
            $stmt->execute([':id' => $id]);

            if ($stmt->rowCount() === 0) {
                api_json(['ok' => false, 'message' => 'Produto não encontrado.'], 404);
            }

            api_json(['ok' => true]);
        }

        api_json(['ok' => false, 'message' => 'Ação inválida.'], 400);
    }

    api_json(['ok' => false, 'message' => 'Método não permitido.'], 405);
} catch (Throwable $e) {
    api_json(['ok' => false, 'message' => 'Erro no servidor.', 'error' => $e->getMessage()], 500);
}

