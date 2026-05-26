<?php
session_start();
require_once dirname(__DIR__, 2) . '/php/conexao.php';

// Endpoint que lista os periodos ocupados do prestador dono do perfil.
$retorno = ['status' => 'nok', 'mensagem' => '', 'data' => []];

if (!isset($_SESSION['usuario']['id'])) {
    $retorno['mensagem'] = 'Sessão não encontrada.';
    header('Content-type:application/json;charset:utf-8');
    echo json_encode($retorno);
    exit;
}

$idVisitante = (int) $_SESSION['usuario']['id'];
$idPrestador = isset($_GET['id']) ? (int) $_GET['id'] : $idVisitante;

if ($idPrestador <= 0) {
    $retorno['mensagem'] = 'Prestador inválido.';
    header('Content-type:application/json;charset:utf-8');
    echo json_encode($retorno);
    exit;
}

// Verificar se é prestador e se é seu próprio perfil
// A agenda so faz sentido para usuarios do tipo prestador.
$sql_verificar = 'SELECT tipo FROM usuario WHERE id = ?';
$stmt_verificar = $conexao->prepare($sql_verificar);
$stmt_verificar->bind_param('i', $idPrestador);
$stmt_verificar->execute();
$resultado = $stmt_verificar->get_result();
$usuario = $resultado->fetch_assoc();
$stmt_verificar->close();

if (!$usuario || $usuario['tipo'] !== 'prestador') {
    $retorno['mensagem'] = 'Usuário não é prestador.';
    header('Content-type:application/json;charset:utf-8');
    echo json_encode($retorno);
    exit;
}

// Apenas o próprio prestador pode ver suas disponibilidades
// A agenda nao e publica: so o proprio dono pode consultar.
$ehProprio = ($idVisitante === $idPrestador);

if (!$ehProprio) {
    $retorno['mensagem'] = 'Você não tem permissão para acessar estas informações.';
    header('Content-type:application/json;charset:utf-8');
    echo json_encode($retorno);
    exit;
}

// Recuperar disponibilidades
// Busca os periodos cadastrados em ordem decrescente.
$sql = 'SELECT id, data_inicio, hora_inicio, data_fim, hora_fim, status, descricao, created_at 
        FROM prestador_disponibilidade 
        WHERE id_prestador = ? 
        ORDER BY data_inicio DESC, hora_inicio DESC';

$stmt = $conexao->prepare($sql);

if (!$stmt) {
    $retorno['mensagem'] = 'Erro na estrutura do banco: ' . $conexao->error;
    header('Content-type:application/json;charset:utf-8');
    echo json_encode($retorno);
    exit;
}

$stmt->bind_param('i', $idPrestador);
$stmt->execute();
$resultado = $stmt->get_result();
$disponibilidades = [];

while ($row = $resultado->fetch_assoc()) {
    $disponibilidades[] = [
        'id' => (int) $row['id'],
        'data_inicio' => $row['data_inicio'],
        'hora_inicio' => $row['hora_inicio'],
        'data_fim' => $row['data_fim'],
        'hora_fim' => $row['hora_fim'],
        'status' => $row['status'],
        'descricao' => $row['descricao'],
        'created_at' => $row['created_at']
    ];
}

$stmt->close();
$conexao->close();

$retorno['status'] = 'ok';
$retorno['data'] = $disponibilidades;

header('Content-type:application/json;charset:utf-8');
echo json_encode($retorno);
