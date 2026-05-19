<?php
session_start();
require_once dirname(__DIR__, 3) . '/php/conexao.php';
require_once dirname(__DIR__, 3) . '/php/usuario_helpers.php';

$retorno = [
    'status' => 'nok',
    'mensagem' => '',
    'data' => [],
];

if (!usuarioTemTipo(['prestador', 'admin'])) {
    $retorno['mensagem'] = 'Apenas prestadores podem excluir servicos nesta aba.';
    $conexao->close();
    header('Content-type:application/json;charset:utf-8');
    echo json_encode($retorno);
    exit;
}

$id = (int) ($_GET['id'] ?? 0);
$idUsuario = idUsuarioLogado();
$admin = ehAdmin();

if ($id <= 0) {
    $retorno['mensagem'] = 'Nao foi possivel excluir o registro sem ID.';
} else {
    $sql = "DELETE FROM servico WHERE id = ? AND origem = 'prestador'";
    if (!$admin) {
        $sql .= ' AND id_prestador = ?';
    }

    $stmt = $conexao->prepare($sql);
    if ($admin) {
        $stmt->bind_param('i', $id);
    } else {
        $stmt->bind_param('ii', $id, $idUsuario);
    }
    $stmt->execute();

    if ($stmt->affected_rows > 0) {
        $retorno = [
            'status' => 'ok',
            'mensagem' => 'Registro excluido com sucesso',
            'data' => [],
        ];
    } else {
        $retorno['mensagem'] = 'Nao foi possivel excluir o registro';
    }

    $stmt->close();
}

$conexao->close();

header('Content-type:application/json;charset:utf-8');
echo json_encode($retorno);
