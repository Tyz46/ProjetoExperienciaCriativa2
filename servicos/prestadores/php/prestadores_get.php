<?php
session_start();
require_once dirname(__DIR__, 3) . '/php/conexao.php';
require_once dirname(__DIR__, 3) . '/php/servico_helpers.php';

$retorno = [
    'status' => '',
    'mensagem' => '',
    'data' => [],
];

$filtrarMeus = isset($_GET['meus']) && $_GET['meus'] === '1';
$baseSql = sqlSelectServicoComUsuario();

if ($filtrarMeus && !isset($_SESSION['usuario']['id'])) {
    $retorno = [
        'status' => 'nok',
        'mensagem' => 'Sessao nao encontrada.',
        'data' => [],
    ];
    $conexao->close();
    header('Content-type:application/json;charset:utf-8');
    echo json_encode($retorno);
    exit;
}

if (isset($_GET['id'])) {
    $id = (int) $_GET['id'];
    $sql = $baseSql . " WHERE s.id = ? AND s.origem = 'prestador'";
    $stmt = $conexao->prepare($sql);
    $stmt->bind_param('i', $id);
} elseif ($filtrarMeus) {
    $idUsuario = (int) $_SESSION['usuario']['id'];
    $sql = $baseSql . " WHERE s.origem = 'prestador' AND s.id_prestador = ? ORDER BY s.id DESC";
    $stmt = $conexao->prepare($sql);
    $stmt->bind_param('i', $idUsuario);
} else {
    $sql = $baseSql . "
        WHERE s.origem = 'prestador' AND s.status = 'ativo'
        ORDER BY CASE WHEN s.valor <= 0 THEN 1 ELSE 0 END, s.valor ASC, s.id DESC
    ";
    $stmt = $conexao->prepare($sql);
}

$stmt->execute();
$resultado = $stmt->get_result();
$tabela = [];

if ($resultado->num_rows > 0) {
    while ($linha = $resultado->fetch_assoc()) {
        $tabela[] = $linha;
    }
    enriquecerLinhasServico($conexao, $tabela);

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
