<?php
session_start();
require_once dirname(__DIR__, 2) . '/php/conexao.php';
require_once dirname(__DIR__, 2) . '/php/auth_senha.php';
require_once dirname(__DIR__, 2) . '/php/usuario_helpers.php';

$retorno = ['status' => 'nok', 'mensagem' => '', 'data' => []];

$username = trim($_POST['usuario'] ?? $_POST['username'] ?? '');
$senha = $_POST['senha'] ?? '';

if ($username === '' || $senha === '') {
    $retorno['mensagem'] = 'Preencha usuário e senha.';
} else {
    $sql = 'SELECT * FROM usuario WHERE username = ?';
    $stmt = $conexao->prepare($sql);

    if (!$stmt) {
        $retorno['mensagem'] = 'Erro no banco de dados: ' . $conexao->error;
    } else {
        $stmt->bind_param('s', $username);
        $stmt->execute();
        $resultado = $stmt->get_result();

        if ($resultado->num_rows > 0) {
            $registro = $resultado->fetch_assoc();

            if (verificar_senha($senha, $registro['senha_hash'])) {
                $_SESSION['usuario'] = $registro;

                $retorno['status'] = 'ok';
                $retorno['mensagem'] = 'Login efetuado com sucesso.';
                $retorno['data'] = [sanitizarUsuarioSessao($registro)];
            } else {
                $retorno['mensagem'] = 'Usuário ou senha inválidos.';
            }
        } else {
            $retorno['mensagem'] = 'Usuário ou senha inválidos.';
        }
        $stmt->close();
    }
}

$conexao->close();

header('Content-type:application/json;charset:utf-8');
echo json_encode($retorno);
