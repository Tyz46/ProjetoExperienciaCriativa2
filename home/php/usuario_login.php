<?php
session_start();
include_once('conexao.php');

$retorno = ['status' => 'nok', 'mensagem' => '', 'data' => []];

$usuario = $_POST['usuario'] ?? '';
$senha = $_POST['senha'] ?? '';

if (empty($usuario) || empty($senha)) {
    $retorno['mensagem'] = 'Preencha usuário e senha.';
} else {
    $sql = "SELECT * FROM usuario WHERE usuario = ? AND senha = ?";
    $stmt = $conexao->prepare($sql);

    if (!$stmt) {
        $retorno['mensagem'] = "Erro no banco de dados: " . $conexao->error;
    } else {
        $stmt->bind_param("ss", $usuario, $senha);
        $stmt->execute();
        $resultado = $stmt->get_result();

        if ($resultado->num_rows > 0) {
            $tabela = [];
            while ($linha = $resultado->fetch_assoc()) {
                $tabela[] = $linha;
            }

            $_SESSION['usuario'] = $tabela[0];

            $retorno['status'] = 'ok';
            $retorno['mensagem'] = 'Login efetuado com sucesso.';
            $retorno['data'] = $tabela;
        } else {
            $retorno['mensagem'] = 'Usuário ou senha inválidos.';
        }
        $stmt->close();
    }
}

$conexao->close();

header("Content-type:application/json;charset:utf-8");
echo json_encode($retorno);
