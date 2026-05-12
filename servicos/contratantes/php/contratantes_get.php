<?php
session_start();
include_once('conexao.php');

$retorno = [
    'status' => '',
    'mensagem' => '',
    'data' => []
];

$filtrarMeus = isset($_GET['meus']) && $_GET['meus'] === '1';

if ($filtrarMeus && !isset($_SESSION['usuario']['id'])) {
    $retorno = [
        'status' => 'nok',
        'mensagem' => 'Sessao nao encontrada.',
        'data' => []
    ];
    $conexao->close();
    header("Content-type:application/json;charset:utf-8");
    echo json_encode($retorno);
    exit;
}

if (isset($_GET['id'])) {
    $id = (int) $_GET['id'];
    $stmt = $conexao->prepare(
        "SELECT s.*, u.nome AS nome_usuario
         FROM servico s
         LEFT JOIN usuario u ON u.id = s.id_usuario
         WHERE s.id = ? AND s.origem = 'contratante'"
    );
    $stmt->bind_param("i", $id);
} elseif ($filtrarMeus) {
    $idUsuario = (int) $_SESSION['usuario']['id'];
    $stmt = $conexao->prepare(
        "SELECT s.*, u.nome AS nome_usuario
         FROM servico s
         LEFT JOIN usuario u ON u.id = s.id_usuario
         WHERE s.origem = 'contratante' AND s.id_usuario = ?
         ORDER BY s.id DESC"
    );
    $stmt->bind_param("i", $idUsuario);
} else {
    $stmt = $conexao->prepare(
        "SELECT s.*, u.nome AS nome_usuario
         FROM servico s
         LEFT JOIN usuario u ON u.id = s.id_usuario
         WHERE s.origem = 'contratante'
         ORDER BY s.id DESC"
    );
}

$stmt->execute();
$resultado = $stmt->get_result();

$tabela = [];
if ($resultado->num_rows > 0) {
    while ($linha = $resultado->fetch_assoc()) {
        $tabela[] = $linha;
    }

    $retorno = [
        'status' => 'ok',
        'mensagem' => 'Registros encontrados',
        'data' => $tabela
    ];
} else {
    $retorno = [
        'status' => 'nok',
        'mensagem' => 'Nenhum registro encontrado',
        'data' => []
    ];
}

$stmt->close();
$conexao->close();

header("Content-type:application/json;charset:utf-8");
echo json_encode($retorno);
