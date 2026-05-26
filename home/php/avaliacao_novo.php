<?php
session_start();
require_once dirname(__DIR__, 2) . '/php/conexao.php';
require_once dirname(__DIR__, 2) . '/php/fluxo_servico_helpers.php';

header('Content-Type: application/json;charset=utf-8');

// Endpoint que grava a avaliacao final apos a conclusao do servico.
$retorno = ['status' => 'nok', 'mensagem' => '', 'data' => []];

if (!isset($_SESSION['usuario']['id'])) {
    $retorno['mensagem'] = 'Sessao nao encontrada.';
    echo json_encode($retorno);
    exit;
}

$idUsuario = idUsuarioLogado();

// O helper central valida participacao, status da negociacao e nota.
$dados = [
    'id_negociacao' => $_POST['id_negociacao'] ?? 0,
    'id_avaliado' => $_POST['id_avaliado'] ?? 0,
    'nota' => $_POST['nota'] ?? 0,
    'comentario' => $_POST['comentario'] ?? '',
];

$resultado = registrarAvaliacao($conexao, $idUsuario, $dados);
$conexao->close();

if ($resultado['ok']) {
    $retorno = ['status' => 'ok', 'mensagem' => $resultado['mensagem'], 'data' => []];
} else {
    $retorno['mensagem'] = $resultado['mensagem'];
}

echo json_encode($retorno);
