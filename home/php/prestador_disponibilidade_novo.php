<?php
session_start();
require_once dirname(__DIR__, 2) . '/php/conexao.php';

// Endpoint para o prestador marcar periodos em que estara ocupado/indisponivel.
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

$dataInicio = trim($_POST['data_inicio'] ?? '');
$horaInicio = trim($_POST['hora_inicio'] ?? '');
$dataFim = trim($_POST['data_fim'] ?? '');
$horaFim = trim($_POST['hora_fim'] ?? '');
$descricao = trim($_POST['descricao'] ?? '');

// Valida se o formulario enviou o minimo necessario para montar o intervalo.
// Validar campos
if ($dataInicio === '' || $horaInicio === '' || $dataFim === '' || $horaFim === '') {
    $retorno['mensagem'] = 'Preencha todos os campos obrigatórios.';
    header('Content-type:application/json;charset:utf-8');
    echo json_encode($retorno);
    exit;
}

// Impede formatos invalidos antes de criar os objetos DateTime.
// Validar formato de data e hora
if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $dataInicio) || !preg_match('/^\d{2}:\d{2}$/', $horaInicio) || 
    !preg_match('/^\d{4}-\d{2}-\d{2}$/', $dataFim) || !preg_match('/^\d{2}:\d{2}$/', $horaFim)) {
    $retorno['mensagem'] = 'Formato de data ou hora inválido.';
    header('Content-type:application/json;charset:utf-8');
    echo json_encode($retorno);
    exit;
}

// Validar se a data fim e hora fim são maiores que data início e hora início
// O periodo final precisa vir depois do inicio.
$dt_inicio = new DateTime($dataInicio . ' ' . $horaInicio);
$dt_fim = new DateTime($dataFim . ' ' . $horaFim);

if ($dt_fim <= $dt_inicio) {
    $retorno['mensagem'] = 'A data/hora fim deve ser posterior à data/hora início.';
    header('Content-type:application/json;charset:utf-8');
    echo json_encode($retorno);
    exit;
}

// Verificar se já existe disponibilidade no mesmo período
// Consulta para bloquear sobreposicao de horarios.
$sql_verificar = 'SELECT id FROM prestador_disponibilidade 
                   WHERE id_prestador = ? 
                   AND data_inicio <= ?
                   AND data_fim >= ?
                   AND NOT (hora_fim < ? AND data_fim = ?)
                   AND NOT (hora_inicio > ? AND data_inicio = ?)
                   LIMIT 1';

$stmt_verificar = $conexao->prepare($sql_verificar);

if (!$stmt_verificar) {
    $retorno['mensagem'] = 'Erro na estrutura do banco: ' . $conexao->error;
    header('Content-type:application/json;charset:utf-8');
    echo json_encode($retorno);
    exit;
}

$stmt_verificar->bind_param(
    'isssiss',
    $idPrestador,
    $dataFim, $dataInicio,
    $horaInicio, $dataInicio,
    $horaFim, $dataFim
);
$stmt_verificar->execute();
$resultado_verificar = $stmt_verificar->get_result();

if ($resultado_verificar->num_rows > 0) {
    $retorno['mensagem'] = 'Dia/Horário já ocupado!';
    header('Content-type:application/json;charset:utf-8');
    echo json_encode($retorno);
    $stmt_verificar->close();
    exit;
}

$stmt_verificar->close();

// Inserir nova disponibilidade
// So depois de todas as validacoes o periodo e gravado no banco.
$sql = 'INSERT INTO prestador_disponibilidade 
        (id_prestador, data_inicio, hora_inicio, data_fim, hora_fim, status, descricao) 
        VALUES (?, ?, ?, ?, ?, ?, ?)';

$stmt = $conexao->prepare($sql);

if (!$stmt) {
    $retorno['mensagem'] = 'Erro na estrutura do banco: ' . $conexao->error;
    header('Content-type:application/json;charset:utf-8');
    echo json_encode($retorno);
    exit;
}

$status = 'ocupado';
$descricaoNula = empty($descricao) ? null : $descricao;

$stmt->bind_param(
    'issssss',
    $idPrestador,
    $dataInicio,
    $horaInicio,
    $dataFim,
    $horaFim,
    $status,
    $descricaoNula
);

if ($stmt->execute() && $stmt->affected_rows > 0) {
    $idDisponibilidade = (int) $conexao->insert_id;
    $retorno['status'] = 'ok';
    $retorno['mensagem'] = 'Disponibilidade registrada com sucesso!';
    $retorno['data'] = [
        'id' => $idDisponibilidade,
        'data_inicio' => $dataInicio,
        'hora_inicio' => $horaInicio,
        'data_fim' => $dataFim,
        'hora_fim' => $horaFim,
        'status' => $status,
        'descricao' => $descricaoNula
    ];
} else {
    $errorMsg = $stmt->error;
    
    // Capturar erro de duplicata e exibir mensagem amigável
    if (strpos($errorMsg, 'Duplicate entry') !== false || strpos($errorMsg, 'uk_disponibilidade_periodo') !== false) {
        $retorno['mensagem'] = 'Dia/Horário já ocupado!';
    } else {
        $retorno['mensagem'] = 'Erro ao registrar disponibilidade.';
    }
}

$stmt->close();
$conexao->close();

header('Content-type:application/json;charset:utf-8');
echo json_encode($retorno);
