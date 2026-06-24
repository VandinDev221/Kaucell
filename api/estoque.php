<?php
declare(strict_types=1);
require __DIR__ . '/common.php';

function estoque_classificar_item(array $item): string
{
    $qtd = (int)($item['quantidade'] ?? 0);
    $min = (int)($item['quantidade_minima'] ?? 0);
    if ($qtd <= 0) {
        return 'faltando';
    }
    if ($qtd <= $min) {
        return 'baixo';
    }
    return 'ok';
}

function estoque_listar(PDO $pdo): array
{
    $secoes = $pdo->query('SELECT id, nome, ordem FROM estoque_secoes ORDER BY ordem ASC, id ASC')->fetchAll();
    $itens = $pdo->query('
        SELECT i.id, i.secao_id, i.nome, i.quantidade, i.quantidade_minima, i.unidade, s.nome AS secao_nome
        FROM estoque_itens i
        JOIN estoque_secoes s ON s.id = i.secao_id
        ORDER BY s.ordem ASC, s.id ASC, i.nome ASC
    ')->fetchAll();

    $itensPorSecao = [];
    foreach ($itens as $item) {
        $sid = (int)$item['secao_id'];
        if (!isset($itensPorSecao[$sid])) {
            $itensPorSecao[$sid] = [];
        }
        $itensPorSecao[$sid][] = [
            'id' => (int)$item['id'],
            'secao_id' => $sid,
            'nome' => $item['nome'],
            'quantidade' => (int)$item['quantidade'],
            'quantidade_minima' => (int)$item['quantidade_minima'],
            'unidade' => $item['unidade'] ?: 'un',
            'status' => estoque_classificar_item($item),
        ];
    }

    $secoesComItens = [];
    foreach ($secoes as $s) {
        $sid = (int)$s['id'];
        $secoesComItens[] = [
            'id' => $sid,
            'nome' => $s['nome'],
            'ordem' => (int)$s['ordem'],
            'itens' => $itensPorSecao[$sid] ?? [],
        ];
    }

    $faltando = [];
    $baixo = [];
    foreach ($itens as $item) {
        $status = estoque_classificar_item($item);
        $entry = [
            'id' => (int)$item['id'],
            'secao_id' => (int)$item['secao_id'],
            'secao_nome' => $item['secao_nome'],
            'nome' => $item['nome'],
            'quantidade' => (int)$item['quantidade'],
            'quantidade_minima' => (int)$item['quantidade_minima'],
            'unidade' => $item['unidade'] ?: 'un',
            'status' => $status,
        ];
        if ($status === 'faltando') {
            $faltando[] = $entry;
        } elseif ($status === 'baixo') {
            $baixo[] = $entry;
        }
    }

    return ['secoes' => $secoesComItens, 'alertas' => ['faltando' => $faltando, 'baixo' => $baixo]];
}

function estoque_normalizar_telefone(string $raw): string
{
    $digits = preg_replace('/\D+/', '', $raw) ?? '';
    if ($digits === '') {
        return '';
    }
    if (str_starts_with($digits, '55') && strlen($digits) >= 12) {
        return $digits;
    }
    if (strlen($digits) >= 10 && strlen($digits) <= 11) {
        return '55' . $digits;
    }
    return $digits;
}

function estoque_mascarar_apikey(string $key): string
{
    $k = trim($key);
    if ($k === '') {
        return '';
    }
    if (strlen($k) <= 4) {
        return '****';
    }
    return str_repeat('*', max(4, strlen($k) - 4)) . substr($k, -4);
}

function estoque_env_apikey(): string
{
    return trim((string)(getenv('CALLMEBOT_APIKEY') ?: getenv('CALLMEBOT_API_KEY') ?: ''));
}

function estoque_get_notificacao_config(PDO $pdo): array
{
    $stmt = $pdo->query('SELECT telefone, callmebot_apikey, ativo, atualizado_em FROM estoque_notificacoes WHERE id = 1');
    $row = $stmt ? $stmt->fetch() : false;
    $envKey = estoque_env_apikey();
    if (!$row) {
        return [
            'telefone' => '',
            'callmebot_apikey' => $envKey,
            'ativo' => 0,
            'conectado' => false,
            'telefone_formatado' => '',
            'apikey_mascarada' => estoque_mascarar_apikey($envKey),
            'apikey_env' => $envKey !== '',
        ];
    }
    $telefone = (string)($row['telefone'] ?? '');
    $dbKey = (string)($row['callmebot_apikey'] ?? '');
    $apikey = $envKey !== '' ? $envKey : $dbKey;
    return [
        'telefone' => $telefone,
        'callmebot_apikey' => $apikey,
        'ativo' => !empty($row['ativo']) ? 1 : 0,
        'conectado' => $telefone !== '' && $apikey !== '',
        'telefone_formatado' => $telefone,
        'apikey_mascarada' => estoque_mascarar_apikey($apikey),
        'apikey_env' => $envKey !== '',
        'atualizado_em' => $row['atualizado_em'] ?? null,
    ];
}

function estoque_notificacoes_publicas(array $config): array
{
    return [
        'telefone' => $config['telefone_formatado'] ?? $config['telefone'] ?? '',
        'ativo' => !empty($config['ativo']) ? 1 : 0,
        'conectado' => !empty($config['conectado']),
        'apikey_mascarada' => $config['apikey_mascarada'] ?? '',
        'apikey_env' => !empty($config['apikey_env']),
        'atualizado_em' => $config['atualizado_em'] ?? null,
    ];
}

function estoque_parse_callmebot_erro(string $body): string
{
    $text = trim(preg_replace('/\s+/', ' ', strip_tags($body)));
    if (preg_match('/apikey is invalid/i', $text)) {
        return 'API Key inválida. Atualize a variável CALLMEBOT_APIKEY na Vercel ou gere uma nova no CallMeBot '
            . '(+34 694 23 67 31) com o mesmo número cadastrado no estoque.';
    }
    if (preg_match('/phone.*invalid|invalid phone/i', $text)) {
        return 'Número de WhatsApp inválido. Use DDD + número (ex: 98991808746).';
    }
    return $text !== '' ? $text : 'Não foi possível enviar a mensagem pelo WhatsApp.';
}

function estoque_enviar_whatsapp(string $telefone, string $texto, string $apikey): void
{
    $phone = estoque_normalizar_telefone($telefone);
    $key = trim($apikey);
    $msg = trim($texto);
    if ($phone === '' || $key === '' || $msg === '') {
        throw new RuntimeException('Telefone, API Key e mensagem são obrigatórios.');
    }
    $url = 'https://api.callmebot.com/whatsapp.php?phone=' . rawurlencode($phone)
        . '&text=' . rawurlencode($msg)
        . '&apikey=' . rawurlencode($key);
    $ctx = stream_context_create(['http' => ['timeout' => 15]]);
    $body = @file_get_contents($url, false, $ctx);
    if ($body === false || preg_match('/error|invalid|fail/i', $body)) {
        throw new RuntimeException(estoque_parse_callmebot_erro((string)$body));
    }
}

function estoque_salvar_notificacao_config(PDO $pdo, array $data): array
{
    $tel = estoque_normalizar_telefone((string)($data['telefone'] ?? ''));
    $ativo = !empty($data['ativo']) ? 1 : 0;
    $envKey = estoque_env_apikey();

    if ($envKey !== '') {
        $stmt = $pdo->prepare('
            INSERT INTO estoque_notificacoes (id, telefone, callmebot_apikey, ativo, atualizado_em)
            VALUES (1, :telefone, NULL, :ativo, datetime(\'now\'))
            ON CONFLICT(id) DO UPDATE SET
                telefone = excluded.telefone,
                ativo = excluded.ativo,
                atualizado_em = datetime(\'now\')
        ');
        $stmt->execute([
            ':telefone' => $tel !== '' ? $tel : null,
            ':ativo' => $ativo,
        ]);
        return estoque_get_notificacao_config($pdo);
    }

    $apikey = trim((string)($data['callmebot_apikey'] ?? ''));
    $stmtDb = $pdo->query('SELECT callmebot_apikey FROM estoque_notificacoes WHERE id = 1');
    $dbRow = $stmtDb ? $stmtDb->fetch() : false;
    $dbCurrent = (string)($dbRow['callmebot_apikey'] ?? '');
    if ($apikey === '' && !empty($data['manter_apikey']) && $dbCurrent !== '') {
        $apikey = $dbCurrent;
    }
    $stmt = $pdo->prepare('
        INSERT INTO estoque_notificacoes (id, telefone, callmebot_apikey, ativo, atualizado_em)
        VALUES (1, :telefone, :apikey, :ativo, datetime(\'now\'))
        ON CONFLICT(id) DO UPDATE SET
            telefone = excluded.telefone,
            callmebot_apikey = excluded.callmebot_apikey,
            ativo = excluded.ativo,
            atualizado_em = datetime(\'now\')
    ');
    $stmt->execute([
        ':telefone' => $tel !== '' ? $tel : null,
        ':apikey' => $apikey !== '' ? $apikey : null,
        ':ativo' => $ativo,
    ]);
    return estoque_get_notificacao_config($pdo);
}

function estoque_limpar_alertas_item(PDO $pdo, int $itemId, string $statusAtual): void
{
    if ($statusAtual === 'ok') {
        $pdo->prepare('DELETE FROM estoque_alertas_enviados WHERE item_id = :id')->execute([':id' => $itemId]);
        return;
    }
    $stmt = $pdo->prepare('DELETE FROM estoque_alertas_enviados WHERE item_id = :id AND status <> :status');
    $stmt->execute([':id' => $itemId, ':status' => $statusAtual]);
}

function estoque_processar_notificacoes(PDO $pdo, array $alertas): array
{
    $config = estoque_get_notificacao_config($pdo);
    if (empty($config['ativo']) || empty($config['telefone']) || empty($config['callmebot_apikey'])) {
        return ['enviados' => 0, 'ignorados' => 0];
    }
    $pendentes = array_merge($alertas['faltando'] ?? [], $alertas['baixo'] ?? []);
    $enviados = 0;
    $ignorados = 0;
    $check = $pdo->prepare('SELECT 1 FROM estoque_alertas_enviados WHERE item_id = :id AND status = :status LIMIT 1');
    $insert = $pdo->prepare('INSERT OR IGNORE INTO estoque_alertas_enviados (item_id, status, enviado_em) VALUES (:id, :status, datetime(\'now\'))');
    foreach ($pendentes as $item) {
        $check->execute([':id' => $item['id'], ':status' => $item['status']]);
        if ($check->fetch()) {
            $ignorados++;
            continue;
        }
        if ($item['status'] === 'faltando') {
            $msg = '⚠️ KAUCELL Estoque — EM FALTA' . "\n" . $item['secao_nome'] . ': ' . $item['nome'] . ' (0 ' . ($item['unidade'] ?? 'un') . ')';
        } else {
            $msg = '📦 KAUCELL Estoque — BAIXO' . "\n" . $item['secao_nome'] . ': ' . $item['nome'] . ' (' . $item['quantidade'] . ' ' . ($item['unidade'] ?? 'un') . ', mín. ' . $item['quantidade_minima'] . ')';
        }
        try {
            estoque_enviar_whatsapp($config['telefone'], $msg, $config['callmebot_apikey']);
            $insert->execute([':id' => $item['id'], ':status' => $item['status']]);
            $enviados++;
        } catch (Throwable $e) {
            // ignora falha individual
        }
    }
    return ['enviados' => $enviados, 'ignorados' => $ignorados];
}

function estoque_pos_alteracao_item(PDO $pdo, array $item): void
{
    if (empty($item['id'])) {
        return;
    }
    estoque_limpar_alertas_item($pdo, (int)$item['id'], (string)($item['status'] ?? 'ok'));
    $dados = estoque_listar($pdo);
    estoque_processar_notificacoes($pdo, $dados['alertas']);
}

try {
    $pdo = api_db();
    api_bootstrap_tables($pdo);

    $id = isset($_GET['id']) ? (int)$_GET['id'] : 0;
    $acao = isset($_GET['acao']) ? (string)$_GET['acao'] : '';
    $relatorio = isset($_GET['relatorio']) && $_GET['relatorio'] === '1';
    $tempoReal = isset($_GET['tempo_real']) && $_GET['tempo_real'] === '1';

    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        if ($acao === 'cron_notificar') {
            $secret = trim((string)(getenv('CRON_SECRET') ?: getenv('ESTOQUE_CRON_SECRET') ?: ''));
            $auth = trim((string)($_SERVER['HTTP_AUTHORIZATION'] ?? ''));
            if ($secret === '' || $auth !== 'Bearer ' . $secret) {
                api_json(['ok' => false, 'message' => 'Não autorizado.'], 401);
            }
            $dados = estoque_listar($pdo);
            $result = estoque_processar_notificacoes($pdo, $dados['alertas']);
            api_json([
                'ok' => true,
                'cron' => true,
                'enviados' => $result['enviados'],
                'ignorados' => $result['ignorados'],
                'alertas' => [
                    'faltando' => count($dados['alertas']['faltando']),
                    'baixo' => count($dados['alertas']['baixo']),
                ],
                'checado_em' => date('c'),
            ]);
        }

        $dados = estoque_listar($pdo);
        if ($relatorio) {
            api_json([
                'ok' => true,
                'gerado_em' => date('c'),
                'faltando' => $dados['alertas']['faltando'],
                'baixo' => $dados['alertas']['baixo'],
            ]);
        }
        $payload = [
            'ok' => true,
            'secoes' => $dados['secoes'],
            'alertas' => $dados['alertas'],
            'atualizado_em' => date('c'),
        ];
        if (api_is_admin()) {
            estoque_processar_notificacoes($pdo, $dados['alertas']);
            $payload['notificacoes'] = estoque_notificacoes_publicas(estoque_get_notificacao_config($pdo));
        }
        api_json($payload);
    }

    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        api_require_admin_auth();
        $data = api_read_json();

        if ($acao === 'secao_criar') {
            $nome = trim((string)($data['nome'] ?? ''));
            if ($nome === '') {
                api_json(['ok' => false, 'message' => 'Nome da seção é obrigatório.'], 422);
            }
            $prox = (int)$pdo->query('SELECT COALESCE(MAX(ordem), 0) + 1 AS prox FROM estoque_secoes')->fetch()['prox'];
            $stmt = $pdo->prepare('INSERT INTO estoque_secoes (nome, ordem) VALUES (:nome, :ordem)');
            $stmt->execute([':nome' => $nome, ':ordem' => $prox]);
            $idNovo = (int)$pdo->lastInsertId();
            $secao = $pdo->query('SELECT id, nome, ordem FROM estoque_secoes WHERE id = ' . $idNovo)->fetch();
            $secao['itens'] = [];
            api_json(['ok' => true, 'secao' => $secao]);
        }

        if ($acao === 'secao_editar') {
            if ($id <= 0) {
                api_json(['ok' => false, 'message' => 'ID da seção é obrigatório.'], 422);
            }
            $nome = trim((string)($data['nome'] ?? ''));
            if ($nome === '') {
                api_json(['ok' => false, 'message' => 'Nome da seção é obrigatório.'], 422);
            }
            $stmt = $pdo->prepare('UPDATE estoque_secoes SET nome = :nome WHERE id = :id');
            $stmt->execute([':nome' => $nome, ':id' => $id]);
            $stmtSel = $pdo->prepare('SELECT id, nome, ordem FROM estoque_secoes WHERE id = :id');
            $stmtSel->execute([':id' => $id]);
            $secao = $stmtSel->fetch();
            if (!$secao) {
                api_json(['ok' => false, 'message' => 'Seção não encontrada.'], 404);
            }
            api_json(['ok' => true, 'secao' => $secao]);
        }

        if ($acao === 'secao_excluir') {
            if ($id <= 0) {
                api_json(['ok' => false, 'message' => 'ID da seção é obrigatório.'], 422);
            }
            $pdo->prepare('DELETE FROM estoque_itens WHERE secao_id = :id')->execute([':id' => $id]);
            $stmt = $pdo->prepare('DELETE FROM estoque_secoes WHERE id = :id');
            $stmt->execute([':id' => $id]);
            if ($stmt->rowCount() === 0) {
                api_json(['ok' => false, 'message' => 'Seção não encontrada.'], 404);
            }
            api_json(['ok' => true]);
        }

        if ($acao === 'item_criar') {
            $secaoId = (int)($data['secao_id'] ?? 0);
            $nome = trim((string)($data['nome'] ?? ''));
            $quantidade = isset($data['quantidade']) ? (int)$data['quantidade'] : -1;
            $quantidadeMinima = isset($data['quantidade_minima']) ? (int)$data['quantidade_minima'] : -1;
            $unidade = trim((string)($data['unidade'] ?? 'un')) ?: 'un';
            if ($secaoId <= 0 || $nome === '') {
                api_json(['ok' => false, 'message' => 'Seção e nome da peça são obrigatórios.'], 422);
            }
            if ($quantidade < 0 || $quantidadeMinima < 0) {
                api_json(['ok' => false, 'message' => 'Quantidades inválidas.'], 422);
            }
            $stmtSec = $pdo->prepare('SELECT id FROM estoque_secoes WHERE id = :id');
            $stmtSec->execute([':id' => $secaoId]);
            if (!$stmtSec->fetch()) {
                api_json(['ok' => false, 'message' => 'Seção não encontrada.'], 404);
            }
            $stmt = $pdo->prepare('
                INSERT INTO estoque_itens (secao_id, nome, quantidade, quantidade_minima, unidade)
                VALUES (:secao_id, :nome, :quantidade, :quantidade_minima, :unidade)
            ');
            $stmt->execute([
                ':secao_id' => $secaoId,
                ':nome' => $nome,
                ':quantidade' => $quantidade,
                ':quantidade_minima' => $quantidadeMinima,
                ':unidade' => $unidade,
            ]);
            $idNovo = (int)$pdo->lastInsertId();
            $stmtSel = $pdo->prepare('SELECT id, secao_id, nome, quantidade, quantidade_minima, unidade FROM estoque_itens WHERE id = :id');
            $stmtSel->execute([':id' => $idNovo]);
            $item = $stmtSel->fetch();
            $item['quantidade'] = (int)$item['quantidade'];
            $item['quantidade_minima'] = (int)$item['quantidade_minima'];
            $item['status'] = estoque_classificar_item($item);
            estoque_pos_alteracao_item($pdo, $item);
            api_json(['ok' => true, 'item' => $item]);
        }

        if ($acao === 'item_editar') {
            if ($id <= 0) {
                api_json(['ok' => false, 'message' => 'ID da peça é obrigatório.'], 422);
            }
            $secaoId = (int)($data['secao_id'] ?? 0);
            $nome = trim((string)($data['nome'] ?? ''));
            $quantidade = isset($data['quantidade']) ? (int)$data['quantidade'] : -1;
            $quantidadeMinima = isset($data['quantidade_minima']) ? (int)$data['quantidade_minima'] : -1;
            $unidade = trim((string)($data['unidade'] ?? 'un')) ?: 'un';
            if ($secaoId <= 0 || $nome === '') {
                api_json(['ok' => false, 'message' => 'Seção e nome da peça são obrigatórios.'], 422);
            }
            if ($quantidade < 0 || $quantidadeMinima < 0) {
                api_json(['ok' => false, 'message' => 'Quantidades inválidas.'], 422);
            }
            $stmt = $pdo->prepare('
                UPDATE estoque_itens
                   SET secao_id = :secao_id, nome = :nome, quantidade = :quantidade,
                       quantidade_minima = :quantidade_minima, unidade = :unidade
                 WHERE id = :id
            ');
            $stmt->execute([
                ':id' => $id,
                ':secao_id' => $secaoId,
                ':nome' => $nome,
                ':quantidade' => $quantidade,
                ':quantidade_minima' => $quantidadeMinima,
                ':unidade' => $unidade,
            ]);
            $stmtSel = $pdo->prepare('SELECT id, secao_id, nome, quantidade, quantidade_minima, unidade FROM estoque_itens WHERE id = :id');
            $stmtSel->execute([':id' => $id]);
            $item = $stmtSel->fetch();
            if (!$item) {
                api_json(['ok' => false, 'message' => 'Peça não encontrada.'], 404);
            }
            $item['quantidade'] = (int)$item['quantidade'];
            $item['quantidade_minima'] = (int)$item['quantidade_minima'];
            $item['status'] = estoque_classificar_item($item);
            estoque_pos_alteracao_item($pdo, $item);
            api_json(['ok' => true, 'item' => $item]);
        }

        if ($acao === 'item_ajustar') {
            if ($id <= 0) {
                api_json(['ok' => false, 'message' => 'ID da peça é obrigatório.'], 422);
            }
            $stmtAtual = $pdo->prepare('SELECT id, quantidade FROM estoque_itens WHERE id = :id');
            $stmtAtual->execute([':id' => $id]);
            $atual = $stmtAtual->fetch();
            if (!$atual) {
                api_json(['ok' => false, 'message' => 'Peça não encontrada.'], 404);
            }
            if (array_key_exists('quantidade', $data)) {
                $qtdFinal = max(0, (int)$data['quantidade']);
            } elseif (array_key_exists('delta', $data)) {
                $qtdFinal = max(0, (int)$atual['quantidade'] + (int)$data['delta']);
            } else {
                api_json(['ok' => false, 'message' => 'Informe delta ou quantidade.'], 422);
            }
            $stmt = $pdo->prepare('UPDATE estoque_itens SET quantidade = :quantidade WHERE id = :id');
            $stmt->execute([':quantidade' => $qtdFinal, ':id' => $id]);
            $stmtSel = $pdo->prepare('SELECT id, secao_id, nome, quantidade, quantidade_minima, unidade FROM estoque_itens WHERE id = :id');
            $stmtSel->execute([':id' => $id]);
            $item = $stmtSel->fetch();
            $item['quantidade'] = (int)$item['quantidade'];
            $item['quantidade_minima'] = (int)$item['quantidade_minima'];
            $item['status'] = estoque_classificar_item($item);
            estoque_pos_alteracao_item($pdo, $item);
            api_json(['ok' => true, 'item' => $item]);
        }

        if ($acao === 'item_excluir') {
            if ($id <= 0) {
                api_json(['ok' => false, 'message' => 'ID da peça é obrigatório.'], 422);
            }
            $stmt = $pdo->prepare('DELETE FROM estoque_itens WHERE id = :id');
            $stmt->execute([':id' => $id]);
            if ($stmt->rowCount() === 0) {
                api_json(['ok' => false, 'message' => 'Peça não encontrada.'], 404);
            }
            $pdo->prepare('DELETE FROM estoque_alertas_enviados WHERE item_id = :id')->execute([':id' => $id]);
            api_json(['ok' => true]);
        }

        if ($acao === 'notificacoes_salvar') {
            $telefone = trim((string)($data['telefone'] ?? ''));
            $apikey = trim((string)($data['callmebot_apikey'] ?? ''));
            $ativo = !empty($data['ativo']) ? 1 : 0;
            $manterApikey = ($data['manter_apikey'] ?? true) !== false;
            if ($telefone === '') {
                api_json(['ok' => false, 'message' => 'Informe o WhatsApp com DDD.'], 422);
            }
            $config = estoque_salvar_notificacao_config($pdo, [
                'telefone' => $telefone,
                'callmebot_apikey' => $apikey,
                'ativo' => $ativo,
                'manter_apikey' => $manterApikey && $apikey === '',
            ]);
            if ($config['callmebot_apikey'] === '') {
                api_json(['ok' => false, 'message' => 'Informe a API Key do CallMeBot ou configure CALLMEBOT_APIKEY na Vercel.'], 422);
            }
            api_json(['ok' => true, 'notificacoes' => estoque_notificacoes_publicas($config)]);
        }

        if ($acao === 'notificacoes_testar') {
            $telefone = trim((string)($data['telefone'] ?? ''));
            $apikey = trim((string)($data['callmebot_apikey'] ?? ''));
            $config = estoque_get_notificacao_config($pdo);
            $tel = $telefone !== '' ? $telefone : $config['telefone'];
            $key = $apikey !== '' ? $apikey : $config['callmebot_apikey'];
            try {
                estoque_enviar_whatsapp($tel, '✅ KAUCELL: WhatsApp conectado! Você receberá alertas de estoque baixo ou em falta.', $key);
                api_json(['ok' => true, 'message' => 'Mensagem de teste enviada. Confira seu WhatsApp.']);
            } catch (Throwable $e) {
                api_json(['ok' => false, 'message' => $e->getMessage()], 500);
            }
        }

        api_json(['ok' => false, 'message' => 'Ação inválida.'], 400);
    }

    api_json(['ok' => false, 'message' => 'Método não permitido.'], 405);
} catch (Throwable $e) {
    api_json(['ok' => false, 'message' => 'Erro no servidor.', 'error' => $e->getMessage()], 500);
}
