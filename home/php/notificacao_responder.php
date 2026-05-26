<?php
session_start();
require_once dirname(__DIR__, 2) . '/php/conexao.php';
require_once dirname(__DIR__, 2) . '/php/fluxo_servico_helpers.php';

header('Content-Type: application/json;charset=utf-8');

// Endpoint que recebe as acoes da central de notificacoes.
$retorno = ['status' => 'nok', 'mensagem' => '', 'data' => []];

if (!isset($_SESSION['usuario']['id'])) {
    $retorno['mensagem'] = 'Sessao nao encontrada.';
    echo json_encode($retorno);
    exit;
}

$idUsuario = idUsuarioLogado();
// A tela normalmente envia o ID da notificacao; o ID da negociacao fica como compatibilidade.
$idNotificacao = (int) ($_POST['id_notificacao'] ?? 0);
$resposta = trim($_POST['resposta'] ?? '');
$idNegociacao = (int) ($_POST['id_negociacao'] ?? 0);

if ($idNotificacao <= 0 && $idNegociacao <= 0) {
    $retorno['mensagem'] = 'Notificacao invalida.';
    echo json_encode($retorno);
    exit;
}

$notif = $idNotificacao > 0 ? carregarNotificacao($conexao, $idNotificacao) : null;

if ($notif !== null) {
    $idNegociacao = (int) ($notif['id_negociacao'] ?? 0);
    $tipo = $notif['tipo'] ?? '';

    // Cada tipo de notificacao dispara um fluxo diferente no helper central.
    if (in_array($tipo, [NOTIF_SOLICITACAO, NOTIF_PROPOSTA], true)) {
        if (!in_array($resposta, ['aceitar', 'recusar'], true)) {
            $retorno['mensagem'] = 'Resposta invalida.';
            echo json_encode($retorno);
            exit;
        }
        $resultado = responderNegociacaoPendente($conexao, $idUsuario, $idNegociacao, $resposta);
    } elseif ($tipo === NOTIF_FINALIZACAO) {
        $resultado = responderFinalizacao($conexao, $idUsuario, $idNotificacao, $resposta);
    } else {
        $retorno['mensagem'] = 'Esta notificacao nao aceita resposta.';
        echo json_encode($retorno);
        exit;
    }
} elseif ($idNegociacao > 0) {
    $resultado = responderNegociacaoPendente($conexao, $idUsuario, $idNegociacao, $resposta);
} else {
    $retorno['mensagem'] = 'Notificacao nao encontrada.';
    echo json_encode($retorno);
    exit;
}

$conexao->close();

if ($resultado['ok']) {
    $retorno = ['status' => 'ok', 'mensagem' => $resultado['mensagem'], 'data' => []];
} else {
    $retorno['mensagem'] = $resultado['mensagem'];
}

echo json_encode($retorno);
