<?php
session_start();
require_once dirname(__DIR__, 2) . '/php/conexao.php';
require_once dirname(__DIR__, 2) . '/php/fluxo_servico_helpers.php';

header('Content-Type: application/json;charset=utf-8');

$retorno = ['status' => 'nok', 'mensagem' => '', 'data' => []];

if (!isset($_SESSION['usuario']['id'])) {
    $retorno['mensagem'] = 'Sessao nao encontrada.';
    echo json_encode($retorno);
    exit;
}

$idUsuario = idUsuarioLogado();
$idServico = (int) ($_POST['id_servico'] ?? 0);
$mensagem = trim($_POST['mensagem'] ?? '');

if ($idServico <= 0) {
    $retorno['mensagem'] = 'Chamado invalido.';
    echo json_encode($retorno);
    exit;
}

$resultado = criarPropostaPrestador($conexao, $idUsuario, $idServico, $mensagem);
$conexao->close();

if ($resultado['ok']) {
    $retorno = [
        'status' => 'ok',
        'mensagem' => $resultado['mensagem'],
        'data' => ['id_negociacao' => $resultado['id_negociacao'] ?? null],
    ];
} else {
    $retorno['mensagem'] = $resultado['mensagem'];
}

echo json_encode($retorno);
