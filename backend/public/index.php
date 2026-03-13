<?php
declare(strict_types=1);

// Front controller simples para rodar em produção com Apache/Nginx apontando para backend/public.
// Em desenvolvimento, você ainda pode usar `php -S localhost:8000` na raiz do projeto.

$uri = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';

// API PHP existente em ../api
if (str_starts_with($uri, '/api/')) {
    $script = __DIR__ . '/../../api' . substr($uri, 4);
    if (is_file($script)) {
        require $script;
        return;
    }
    http_response_code(404);
    echo 'API não encontrada.';
    return;
}

// Arquivos estáticos do frontend (prioriza frontend/, depois raiz para uploads etc.)
$arquivo = realpath(__DIR__ . '/../../frontend/' . ltrim($uri, '/'));
if ((!$arquivo || !is_file($arquivo))) {
    $arquivo = realpath(__DIR__ . '/../../' . ltrim($uri, '/'));
}

if ($arquivo && is_file($arquivo)) {
    $ext = pathinfo($arquivo, PATHINFO_EXTENSION);
    $tipos = [
        'html' => 'text/html; charset=utf-8',
        'css'  => 'text/css; charset=utf-8',
        'js'   => 'application/javascript; charset=utf-8',
        'png'  => 'image/png',
        'jpg'  => 'image/jpeg',
        'jpeg' => 'image/jpeg',
        'gif'  => 'image/gif',
        'webp' => 'image/webp',
    ];
    if (isset($tipos[$ext])) {
        header('Content-Type: ' . $tipos[$ext]);
    }
    readfile($arquivo);
    return;
}

// Fallback: home
readfile(__DIR__ . '/../../index.html');

