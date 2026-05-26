<?php
session_start();
require_once __DIR__ . '/usuario_helpers.php';

// Endpoint simples usado pelas telas para descobrir se existe sessao ativa
// e, se existir, devolver um usuario ja sanitizado.
$retorno = ['status' => '', 'mensagem' => '', 'data' => []];

if (isset($_SESSION['usuario'])) {
    $retorno = [
        'status' => 'ok',
        'mensagem' => '',
        'data' => sanitizarUsuarioSessao($_SESSION['usuario']),
    ];
} else {
    $retorno = [
        'status' => 'nok',
        'mensagem' => '',
        'data' => [],
    ];
}

header('Content-type:application/json;charset:utf-8');
echo json_encode($retorno);
