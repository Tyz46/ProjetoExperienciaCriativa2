<?php
session_start();
require_once dirname(__DIR__, 3) . '/php/conexao.php';
require_once dirname(__DIR__, 3) . '/php/servico_helpers.php';

// Endpoint de consulta dos chamados publicados por clientes.
$retorno = [
    'status' => '',
    'mensagem' => '',
    'data' => [],
];

$filtrarMeus = isset($_GET['meus']) && $_GET['meus'] === '1';
// A query base com joins fica centralizada no helper para ser reaproveitada.
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
    // Busca um unico chamado para preencher a tela de detalhes/edicao.
    $id = (int) $_GET['id'];
    $sql = $baseSql . " WHERE s.id = ? AND s.origem = 'cliente'";
    $stmt = $conexao->prepare($sql);
    $stmt->bind_param('i', $id);
} elseif ($filtrarMeus) {
    // Lista somente os chamados do usuario autenticado.
    $idUsuario = (int) $_SESSION['usuario']['id'];
    $sql = $baseSql . " WHERE s.origem = 'cliente' AND s.id_prestador = ? ORDER BY s.id DESC";
    $stmt = $conexao->prepare($sql);
    $stmt->bind_param('i', $idUsuario);
} else {
    // Lista publica: so chamados ativos.
    $sql = $baseSql . " WHERE s.origem = 'cliente' AND s.status = 'ativo' ORDER BY s.id DESC";
    $stmt = $conexao->prepare($sql);
}

$stmt->execute();
$resultado = $stmt->get_result();
$tabela = [];

if ($resultado->num_rows > 0) {
    while ($linha = $resultado->fetch_assoc()) {
        $tabela[] = $linha;
    }
    // Completa o retorno com habilidades e fotos normalizadas para o frontend.
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
