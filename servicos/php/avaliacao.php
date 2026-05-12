<?php
session_start();
include_once(__DIR__ . '/../contratantes/php/conexao.php');

$retorno = ['status' => 'nok', 'mensagem' => '', 'data' => []];

if (!isset($_SESSION['usuario']) || empty($_SESSION['usuario']['tipo'])) {
    $retorno['mensagem'] = 'Sessão não encontrada.';
    header('Content-type:application/json;charset:utf-8');
    echo json_encode($retorno);
    exit;
}

$id = isset($_POST['id']) ? (int) $_POST['id'] : 0;
$nota = isset($_POST['nota']) ? (int) $_POST['nota'] : 0;
$comentario = trim($_POST['comentario'] ?? '');

if ($id <= 0 || $nota < 1 || $nota > 5) {
    $retorno['mensagem'] = 'ID inválido ou nota deve estar entre 1 e 5.';
    header('Content-type:application/json;charset:utf-8');
    echo json_encode($retorno);
    exit;
}

$stmt = $conexao->prepare('SELECT id_usuario, origem FROM servico WHERE id = ?');
$stmt->bind_param('i', $id);
$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows === 0) {
    $retorno['mensagem'] = 'Serviço não encontrado.';
    $stmt->close();
    $conexao->close();
    header('Content-type:application/json;charset:utf-8');
    echo json_encode($retorno);
    exit;
}

$registro = $result->fetch_assoc();
$stmt->close();

$origem = $registro['origem'];
$idUsuarioServico = (int) $registro['id_usuario'];
$idUsuario = (int) $_SESSION['usuario']['id'];
$tipoUsuario = $_SESSION['usuario']['tipo'];

$campoNota = '';
$campoComentario = '';
$campoAutor = '';
$campoData = '';
$permitido = false;

if ($origem === 'prestador' && $tipoUsuario === 'contratante' && $idUsuario !== $idUsuarioServico) {
    $campoNota = 'nota_contratante';
    $campoComentario = 'comentario_contratante';
    $campoAutor = 'nome_avaliador_contratante';
    $campoData = 'data_avaliacao_contratante';
    $permitido = true;
} elseif ($origem === 'contratante' && $tipoUsuario === 'prestador' && $idUsuario !== $idUsuarioServico) {
    $campoNota = 'nota_prestador';
    $campoComentario = 'comentario_prestador';
    $campoAutor = 'nome_avaliador_prestador';
    $campoData = 'data_avaliacao_prestador';
    $permitido = true;
} elseif ($tipoUsuario === 'adm') {
    // Administrador pode ajustar avaliações em qualquer registro.
    if ($origem === 'prestador') {
        $campoNota = 'nota_contratante';
        $campoComentario = 'comentario_contratante';
        $campoAutor = 'nome_avaliador_contratante';
        $campoData = 'data_avaliacao_contratante';
        $permitido = true;
    } else {
        $campoNota = 'nota_prestador';
        $campoComentario = 'comentario_prestador';
        $campoAutor = 'nome_avaliador_prestador';
        $campoData = 'data_avaliacao_prestador';
        $permitido = true;
    }
}

if (!$permitido) {
    $retorno['mensagem'] = 'Você não tem permissão para avaliar este serviço.';
    $conexao->close();
    header('Content-type:application/json;charset:utf-8');
    echo json_encode($retorno);
    exit;
}

$sql = "UPDATE servico SET {$campoNota} = ?, {$campoComentario} = ?, {$campoAutor} = ?, {$campoData} = ? WHERE id = ?";
$stmt = $conexao->prepare($sql);
if (!$stmt) {
    $retorno['mensagem'] = 'Erro na estrutura do banco: ' . $conexao->error;
    $conexao->close();
    header('Content-type:application/json;charset:utf-8');
    echo json_encode($retorno);
    exit;
}

$comentarioSql = $comentario === '' ? null : $comentario;
$autorSql = isset($_SESSION['usuario']['nome']) ? trim($_SESSION['usuario']['nome']) : null;
$dataSql = date('Y-m-d H:i:s');
$stmt->bind_param('isssi', $nota, $comentarioSql, $autorSql, $dataSql, $id);

if ($stmt->execute()) {
    $retorno['status'] = 'ok';
    $retorno['mensagem'] = 'Avaliação registrada com sucesso.';
} else {
    $retorno['mensagem'] = 'Não foi possível salvar a avaliação: ' . $stmt->error;
}

$stmt->close();
$conexao->close();
header('Content-type:application/json;charset:utf-8');
echo json_encode($retorno);
