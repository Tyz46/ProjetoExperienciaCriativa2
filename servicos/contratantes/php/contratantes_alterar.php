<?php
session_start();
require_once dirname(__DIR__, 3) . '/php/conexao.php';
require_once dirname(__DIR__, 3) . '/php/usuario_helpers.php';

$retorno = ['status' => 'nok', 'mensagem' => '', 'data' => []];

if (!usuarioTemTipo(['cliente', 'admin'])) {
    $retorno['mensagem'] = 'Apenas clientes podem alterar chamados nesta aba.';
    $conexao->close();
    header('Content-type:application/json;charset:utf-8');
    echo json_encode($retorno);
    exit;
}

$id = (int) ($_GET['id'] ?? 0);
$nome = trim($_POST['nome'] ?? '');
$descricao = trim($_POST['descricao'] ?? '');
$categoria = trim($_POST['tipo'] ?? '');
$valor = trim($_POST['valor'] ?? '');
$localidade = trim($_POST['localidade'] ?? '');
$idUsuario = idUsuarioLogado();
$admin = ehAdmin();

if ($id <= 0) {
    $retorno['mensagem'] = 'Nao foi possivel alterar o registro sem ID.';
} elseif ($nome === '' || $descricao === '' || $categoria === '' || $valor === '' || $localidade === '') {
    $retorno['mensagem'] = 'Preencha todos os campos obrigatorios.';
} else {
    $sqlPermissao = "SELECT id FROM servico WHERE id = ? AND origem = 'cliente'";
    if (!$admin) {
        $sqlPermissao .= ' AND id_prestador = ?';
    }

    $stmtPermissao = $conexao->prepare($sqlPermissao);
    if ($admin) {
        $stmtPermissao->bind_param('i', $id);
    } else {
        $stmtPermissao->bind_param('ii', $id, $idUsuario);
    }
    $stmtPermissao->execute();
    $resultadoPermissao = $stmtPermissao->get_result();

    if ($resultadoPermissao->num_rows === 0) {
        $retorno['mensagem'] = 'Voce so pode alterar chamados criados pela sua conta.';
        $stmtPermissao->close();
        $conexao->close();
        header('Content-type:application/json;charset:utf-8');
        echo json_encode($retorno);
        exit;
    }
    $stmtPermissao->close();

    $sql = "
        UPDATE servico
        SET titulo = ?, descricao = ?, categoria = ?, valor = ?, localidade = ?
        WHERE id = ? AND origem = 'cliente'
    ";
    if (!$admin) {
        $sql .= ' AND id_prestador = ?';
    }

    $stmt = $conexao->prepare($sql);
    if (!$stmt) {
        $retorno['mensagem'] = 'Erro na estrutura do banco: ' . $conexao->error;
    } else {
        if ($admin) {
            $stmt->bind_param('sssdsi', $nome, $descricao, $categoria, $valor, $localidade, $id);
        } else {
            $stmt->bind_param('sssdsii', $nome, $descricao, $categoria, $valor, $localidade, $id, $idUsuario);
        }

        if ($stmt->execute()) {
            $retorno['status'] = 'ok';
            $retorno['mensagem'] = 'Registro alterado com sucesso.';
        } else {
            $retorno['mensagem'] = 'Nao foi possivel alterar o registro: ' . $stmt->error;
        }
        $stmt->close();
    }
}

$conexao->close();

header('Content-type:application/json;charset:utf-8');
echo json_encode($retorno);
