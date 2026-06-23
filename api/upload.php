<?php
declare(strict_types=1);
require __DIR__ . '/common.php';

try {
    api_require_admin_auth();

    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        api_json(['ok' => false, 'message' => 'Método não permitido.'], 405);
    }

    if (!isset($_FILES['imagem']) || $_FILES['imagem']['error'] !== UPLOAD_ERR_OK) {
        api_json(['ok' => false, 'message' => 'Falha no upload da imagem.'], 400);
    }

    $file = $_FILES['imagem'];
    $nomeOriginal = (string)$file['name'];
    $tmpPath = (string)$file['tmp_name'];

    $ext = strtolower(pathinfo($nomeOriginal, PATHINFO_EXTENSION));
    $permitidas = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
    if (!in_array($ext, $permitidas, true)) {
        api_json(['ok' => false, 'message' => 'Tipo de arquivo não permitido.'], 400);
    }

    $uploadDir = __DIR__ . '/../uploads';
    if (!is_dir($uploadDir)) {
        mkdir($uploadDir, 0777, true);
    }

    $nomeSeguro = bin2hex(random_bytes(8)) . '.' . $ext;
    $destino = $uploadDir . '/' . $nomeSeguro;

    if (!move_uploaded_file($tmpPath, $destino)) {
        api_json(['ok' => false, 'message' => 'Não foi possível salvar a imagem.'], 500);
    }

    $url = 'uploads/' . $nomeSeguro;

    api_json([
        'ok' => true,
        'url' => $url,
        'filename' => $nomeSeguro,
        'original' => $nomeOriginal,
    ]);
} catch (Throwable $e) {
    api_json(['ok' => false, 'message' => 'Erro no servidor.', 'error' => $e->getMessage()], 500);
}

