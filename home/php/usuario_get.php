<?php
session_start();
require_once dirname(__DIR__, 2) . '/php/conexao.php';
require_once dirname(__DIR__, 2) . '/php/usuario_helpers.php';

$retorno = [
    'status' => '',
    'mensagem' => '',
    'data' => [],
];

if (isset($_GET['perfil'])) {
    if (!isset($_SESSION['usuario']['id'])) {
        $retorno = [
            'status' => 'nok',
            'mensagem' => 'Usuário não autenticado',
            'data' => [],
        ];
        $conexao->close();
        header('Content-type:application/json;charset:utf-8');
        echo json_encode($retorno);
        exit;
    }

    $id = (int) $_SESSION['usuario']['id'];
    $stmt = $conexao->prepare(
        'SELECT id, nome, email, telefone, username, username AS usuario, tipo, foto
         FROM usuario WHERE id = ?'
    );
    $stmt->bind_param('i', $id);
} elseif (isset($_GET['id'])) {
    $id = (int) $_GET['id'];
    $stmt = $conexao->prepare(
        'SELECT id, nome, email, telefone, username, username AS usuario, tipo, foto, created_at, updated_at
         FROM usuario WHERE id = ?'
    );
    $stmt->bind_param('i', $id);
} else {
    $stmt = $conexao->prepare(
        'SELECT id, nome, email, telefone, username, username AS usuario, tipo, foto, created_at, updated_at
         FROM usuario'
    );
}

$stmt->execute();
$resultado = $stmt->get_result();
$tabela = [];

if ($resultado->num_rows > 0) {
    while ($linha = $resultado->fetch_assoc()) {
        $tabela[] = sanitizarUsuarioSessao($linha);
    }

    $retorno = [
        'status' => 'ok',
        'mensagem' => 'Registros encontrados',
        'data' => $tabela,
    ];
} else {
    $retorno = [
        'status' => 'nok',
        'mensagem' => 'Nenhum registro encontrado',
        'data' => [],
    ];
}

$stmt->close();
$conexao->close();

header('Content-type:application/json;charset:utf-8');
echo json_encode($retorno);
