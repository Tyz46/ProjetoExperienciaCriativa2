<?php
session_start();
require_once dirname(__DIR__, 3) . '/php/conexao.php';
require_once dirname(__DIR__, 3) . '/php/usuario_helpers.php';

// Endpoint de exclusao de chamado de cliente.
$retorno = [
    'status' => 'nok',
    'mensagem' => '',
    'data' => [],
];

if (!usuarioTemTipo(['cliente', 'admin'])) {
    $retorno['mensagem'] = 'Apenas clientes podem excluir chamados nesta aba.';
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
    // Admin pode excluir qualquer registro; cliente so o proprio.
    $sql = "DELETE FROM servico WHERE id = ? AND origem = 'cliente'";
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
