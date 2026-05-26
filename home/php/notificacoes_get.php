<?php
session_start();
require_once dirname(__DIR__, 2) . '/php/conexao.php';
require_once dirname(__DIR__, 2) . '/php/fluxo_servico_helpers.php';

header('Content-Type: application/json;charset=utf-8');

// Endpoint da central de mensagens do perfil.
$retorno = ['status' => 'nok', 'mensagem' => '', 'data' => []];

if (!isset($_SESSION['usuario']['id'])) {
    $retorno['mensagem'] = 'Sessao nao encontrada.';
    echo json_encode($retorno);
    exit;
}

$idUsuario = idUsuarioLogado();
// Busca as mensagens e tambem a quantidade ainda pendente de resposta.
$lista = listarNotificacoesUsuario($conexao, $idUsuario);
$pendentes = contarNotificacoesPendentes($conexao, $idUsuario);
$conexao->close();

$retorno = [
    'status' => 'ok',
    'mensagem' => '',
    'data' => [
        'notificacoes' => $lista,
        'pendentes' => $pendentes,
    ],
];

echo json_encode($retorno);
