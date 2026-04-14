<?php
session_start();
include_once('conexao.php');

$retorno = ['status' => 'nok', 'mensagem' => '', 'data' => []];

if (!isset($_SESSION['usuario']) || !in_array(($_SESSION['usuario']['tipo'] ?? ''), ['prestador', 'adm'], true)) {
    $retorno['mensagem'] = 'Apenas prestadores podem alterar serviços nesta aba.';
    $conexao->close();
    header("Content-type:application/json;charset:utf-8");
    echo json_encode($retorno);
    exit;
}

$id = $_GET['id'] ?? '';
$nome = trim($_POST['nome'] ?? '');
$descricao = trim($_POST['descricao'] ?? '');
$tipo = trim($_POST['tipo'] ?? '');
$valor = trim($_POST['valor'] ?? '');
$localidade = trim($_POST['localidade'] ?? '');
$idUsuario = (int) $_SESSION['usuario']['id'];
$ehAdmin = ($_SESSION['usuario']['tipo'] ?? '') === 'adm';

if ($id === '') {
    $retorno['mensagem'] = 'Não foi possível alterar o registro sem ID.';
} elseif ($nome === '' || $descricao === '' || $tipo === '' || $valor === '' || $localidade === '') {
    $retorno['mensagem'] = 'Preencha todos os campos obrigatórios.';
} else {
    $sqlPermissao = "SELECT id FROM servico WHERE id = ? AND origem = 'prestador'";
    if (!$ehAdmin) {
        $sqlPermissao .= " AND id_usuario = ?";
    }

    $stmtPermissao = $conexao->prepare($sqlPermissao);
    if ($ehAdmin) {
        $stmtPermissao->bind_param("i", $id);
    } else {
        $stmtPermissao->bind_param("ii", $id, $idUsuario);
    }
    $stmtPermissao->execute();
    $resultadoPermissao = $stmtPermissao->get_result();

    if ($resultadoPermissao->num_rows === 0) {
        $retorno['mensagem'] = 'Você só pode alterar serviços criados pela sua conta.';
        $stmtPermissao->close();
        $conexao->close();
        header("Content-type:application/json;charset:utf-8");
        echo json_encode($retorno);
        exit;
    }
    $stmtPermissao->close();

    $sql = "UPDATE servico SET nome = ?, descricao = ?, tipo = ?, valor = ?, localidade = ? WHERE id = ? AND origem = 'prestador'";
    if (!$ehAdmin) {
        $sql .= " AND id_usuario = ?";
    }

    $stmt = $conexao->prepare($sql);

    if (!$stmt) {
        $retorno['mensagem'] = 'Erro na estrutura do banco: ' . $conexao->error;
    } else {
        if ($ehAdmin) {
            $stmt->bind_param("sssssi", $nome, $descricao, $tipo, $valor, $localidade, $id);
        } else {
            $stmt->bind_param("sssssii", $nome, $descricao, $tipo, $valor, $localidade, $id, $idUsuario);
        }

        if ($stmt->execute()) {
            $retorno['status'] = 'ok';
            $retorno['mensagem'] = 'Registro alterado com sucesso.';
        } else {
            $retorno['mensagem'] = 'Não foi possível alterar o registro: ' . $stmt->error;
        }

        $stmt->close();
    }
}

$conexao->close();

header("Content-type:application/json;charset:utf-8");
echo json_encode($retorno);
