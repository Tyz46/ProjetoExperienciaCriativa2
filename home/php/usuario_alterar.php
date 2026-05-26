<?php
require_once dirname(__DIR__, 2) . '/php/conexao.php';
require_once dirname(__DIR__, 2) . '/php/auth_senha.php';

// Endpoint de alteracao basica de usuario.
$retorno = [
    'status' => '',
    'mensagem' => '',
    'data' => [],
];

if (isset($_GET['id'])) {
    // Atualiza apenas os campos recebidos pela tela atual.
    $id = (int) $_GET['id'];
    $nome = trim($_POST['nome'] ?? '');
    $username = trim($_POST['usuario'] ?? $_POST['username'] ?? '');
    $senha = $_POST['senha'] ?? '';

    // A senha sempre e regravada em hash.
    $senhaHash = hash_senha($senha);
    $stmt = $conexao->prepare(
        'UPDATE usuario SET nome = ?, username = ?, senha_hash = ? WHERE id = ?'
    );
    $stmt->bind_param('sssi', $nome, $username, $senhaHash, $id);
    $stmt->execute();

    if ($stmt->affected_rows > 0) {
        $retorno = [
            'status' => 'ok',
            'mensagem' => 'Registro alterado com sucesso',
            'data' => [],
        ];
    } else {
        $retorno = [
            'status' => 'nok',
            'mensagem' => 'Não foi possível alterar o registro',
            'data' => [],
        ];
    }

    $stmt->close();
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
