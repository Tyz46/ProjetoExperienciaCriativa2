<?php
session_start();
require_once dirname(__DIR__, 2) . '/php/conexao.php';
require_once dirname(__DIR__, 2) . '/php/auth_senha.php';
require_once dirname(__DIR__, 2) . '/php/servico_helpers.php';

// Endpoint de alteracao basica de usuario.
$retorno = [
    'status' => '',
    'mensagem' => '',
    'data' => [],
];

if (!isset($_SESSION['usuario']['id'])) {
    $retorno = [
        'status' => 'nok',
        'mensagem' => 'Usuário não autenticado.',
        'data' => [],
    ];
    header('Content-type:application/json;charset:utf-8');
    echo json_encode($retorno);
    exit;
}

if (isset($_GET['id'])) {
    $id = (int) $_GET['id'];

    if ($id !== (int) $_SESSION['usuario']['id']) {
        $retorno = [
            'status' => 'nok',
            'mensagem' => 'Você só pode alterar seu próprio perfil.',
            'data' => [],
        ];
        header('Content-type:application/json;charset:utf-8');
        echo json_encode($retorno);
        exit;
    }

    $nome = trim($_POST['nome'] ?? '');
    $username = trim($_POST['usuario'] ?? $_POST['username'] ?? '');
    $email = trim($_POST['email'] ?? '');
    $telefone = trim($_POST['telefone'] ?? '');
    $senha = $_POST['senha'] ?? '';
    $descricao = trim($_POST['descricao'] ?? '');
    $profissao = trim($_POST['profissao'] ?? '');
    $localidade = trim($_POST['localidade'] ?? '');

    if ($senha !== '') {
        $senhaHash = hash_senha($senha);
        $stmt = $conexao->prepare(
            'UPDATE usuario SET nome = ?, username = ?, email = ?, telefone = ?, senha_hash = ? WHERE id = ?'
        );
        $stmt->bind_param('sssssi', $nome, $username, $email, $telefone, $senhaHash, $id);
    } else {
        $stmt = $conexao->prepare(
            'UPDATE usuario SET nome = ?, username = ?, email = ?, telefone = ? WHERE id = ?'
        );
        $stmt->bind_param('ssssi', $nome, $username, $email, $telefone, $id);
    }

    $stmt->execute();
    $atualizacaoUsuarioOk = $stmt->errno === 0;
    $stmt->close();

    if ($atualizacaoUsuarioOk) {
        $tipoUsuario = null;
        $stmtTipo = $conexao->prepare('SELECT tipo FROM usuario WHERE id = ?');
        $stmtTipo->bind_param('i', $id);
        $stmtTipo->execute();
        $resultadoTipo = $stmtTipo->get_result();
        if ($resultadoTipo && $resultadoTipo->num_rows > 0) {
            $tipoUsuario = $resultadoTipo->fetch_assoc()['tipo'];
        }
        $stmtTipo->close();

        if ($tipoUsuario === 'prestador') {
            upsertPerfilPrestador($conexao, $id, $profissao, $descricao, $localidade);
        }
    }

    if ($atualizacaoUsuarioOk) {
        $retorno = [
            'status' => 'ok',
            'mensagem' => 'Perfil alterado com sucesso',
            'data' => [],
        ];
    } else {
        $retorno = [
            'status' => 'nok',
            'mensagem' => 'Não foi possível alterar o perfil',
            'data' => [],
        ];
    }
} else {
    $retorno = [
        'status' => 'nok',
        'mensagem' => 'Não foi possível alterar o registro sem ID',
        'data' => [],
    ];
}

$conexao->close();

header('Content-type:application/json;charset:utf-8');
echo json_encode($retorno);
