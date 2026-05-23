<?php
session_start();
require_once dirname(__DIR__, 2) . '/php/conexao.php';

$retorno = ['status' => 'nok', 'mensagem' => '', 'data' => []];

if (!isset($_SESSION['usuario']['id'])) {
    $retorno['mensagem'] = 'Sessão não encontrada.';
    header('Content-type:application/json;charset:utf-8');
    echo json_encode($retorno);
    exit;
}

$idPrestador = (int) $_SESSION['usuario']['id'];
$tipoUsuario = $_SESSION['usuario']['tipo'] ?? '';

if ($tipoUsuario !== 'prestador') {
    $retorno['mensagem'] = 'Apenas prestadores podem acessar este recurso.';
    header('Content-type:application/json;charset:utf-8');
    echo json_encode($retorno);
    exit;
}

$idDisponibilidade = isset($_POST['id']) ? (int) $_POST['id'] : 0;

if ($idDisponibilidade <= 0) {
    $retorno['mensagem'] = 'ID de disponibilidade inválido.';
    header('Content-type:application/json;charset:utf-8');
    echo json_encode($retorno);
    exit;
}

// Verificar se a disponibilidade pertence ao prestador
$sql_verificar = 'SELECT id FROM prestador_disponibilidade WHERE id = ? AND id_prestador = ?';
$stmt_verificar = $conexao->prepare($sql_verificar);
$stmt_verificar->bind_param('ii', $idDisponibilidade, $idPrestador);
$stmt_verificar->execute();
$resultado = $stmt_verificar->get_result();

if ($resultado->num_rows === 0) {
    $retorno['mensagem'] = 'Disponibilidade não encontrada ou você não tem permissão.';
    header('Content-type:application/json;charset:utf-8');
    echo json_encode($retorno);
    $stmt_verificar->close();
    exit;
}

$stmt_verificar->close();

// Excluir disponibilidade
$sql = 'DELETE FROM prestador_disponibilidade WHERE id = ? AND id_prestador = ?';
$stmt = $conexao->prepare($sql);

if (!$stmt) {
    $retorno['mensagem'] = 'Erro na estrutura do banco: ' . $conexao->error;
    header('Content-type:application/json;charset:utf-8');
    echo json_encode($retorno);
    exit;
}

$stmt->bind_param('ii', $idDisponibilidade, $idPrestador);

if ($stmt->execute() && $stmt->affected_rows > 0) {
    $retorno['status'] = 'ok';
    $retorno['mensagem'] = 'Disponibilidade removida com sucesso!';
} else {
    $retorno['mensagem'] = 'Erro ao remover disponibilidade: ' . $stmt->error;
}

$stmt->close();
$conexao->close();

header('Content-type:application/json;charset:utf-8');
echo json_encode($retorno);
