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

try {
    $pdo = api_db();
    api_bootstrap_tables($pdo);

    $id = isset($_GET['id']) ? (int)$_GET['id'] : 0;
    $acao = isset($_GET['acao']) ? (string)$_GET['acao'] : '';
    $relatorio = isset($_GET['relatorio']) && $_GET['relatorio'] === '1';

    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        $dados = estoque_listar($pdo);
        if ($relatorio) {
            api_json([
                'ok' => true,
                'gerado_em' => date('c'),
                'faltando' => $dados['alertas']['faltando'],
                'baixo' => $dados['alertas']['baixo'],
            ]);
        }
        api_json(['ok' => true, 'secoes' => $dados['secoes'], 'alertas' => $dados['alertas']]);
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
            api_json(['ok' => true]);
        }

        api_json(['ok' => false, 'message' => 'Ação inválida.'], 400);
    }

    api_json(['ok' => false, 'message' => 'Método não permitido.'], 405);
} catch (Throwable $e) {
    api_json(['ok' => false, 'message' => 'Erro no servidor.', 'error' => $e->getMessage()], 500);
}
