<?php
declare(strict_types=1);
require __DIR__ . '/common.php';

try {
    $acao = isset($_GET['acao']) ? (string)$_GET['acao'] : 'status';

    if ($acao === 'status') {
        $logged = api_is_admin();
        api_json(['ok' => true, 'logged' => $logged]);
    }

    if ($acao === 'login' && $_SERVER['REQUEST_METHOD'] === 'POST') {
        $data = api_read_json();
        $usuario = trim((string)($data['usuario'] ?? ''));
        $senha = trim((string)($data['senha'] ?? ''));

        $adminUser = getenv('ADMIN_USER') ?: 'admin';
        $adminPass = getenv('ADMIN_PASS') ?: '1234';

        if ($usuario === $adminUser && $senha === $adminPass) {
            api_start_session();
            $_SESSION['is_admin'] = true;
            api_json(['ok' => true, 'logged' => true]);
        }

        api_json(['ok' => false, 'logged' => false, 'message' => 'Credenciais inválidas.'], 401);
    }

    if ($acao === 'logout') {
        api_start_session();
        $_SESSION = [];
        if (ini_get('session.use_cookies')) {
            $params = session_get_cookie_params();
            setcookie(session_name(), '', time() - 42000,
                $params['path'], $params['domain'],
                $params['secure'], $params['httponly']
            );
        }
        session_destroy();
        api_json(['ok' => true, 'logged' => false]);
    }

    api_json(['ok' => false, 'message' => 'Ação inválida.'], 400);
} catch (Throwable $e) {
    api_json(['ok' => false, 'message' => 'Erro no servidor.', 'error' => $e->getMessage()], 500);
}

