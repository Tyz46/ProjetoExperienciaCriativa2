<?php
session_start();
require_once dirname(__DIR__, 2) . '/php/conexao.php';
require_once dirname(__DIR__, 2) . '/php/perfil_helpers.php';

$retorno = ['status' => 'nok', 'mensagem' => '', 'data' => []];

if (!isset($_SESSION['usuario']['id'])) {
    $retorno['mensagem'] = 'Sessao nao encontrada.';
    header('Content-type:application/json;charset:utf-8');
    echo json_encode($retorno);
    exit;
}

$idVisitante = (int) $_SESSION['usuario']['id'];
$idPerfil = isset($_GET['id']) ? (int) $_GET['id'] : $idVisitante;

if ($idPerfil <= 0) {
    $retorno['mensagem'] = 'Perfil invalido.';
    header('Content-type:application/json;charset:utf-8');
    echo json_encode($retorno);
    exit;
}

$dados = carregarPerfilCompleto($conexao, $idPerfil, $idVisitante);

if ($dados === null) {
    $retorno['mensagem'] = 'Usuario nao encontrado.';
} else {
    $retorno = [
        'status' => 'ok',
        'mensagem' => '',
        'data' => $dados,
    ];
}

$conexao->close();

header('Content-type:application/json;charset:utf-8');
echo json_encode($retorno);
