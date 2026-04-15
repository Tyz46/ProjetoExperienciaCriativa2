<?php
include_once('conexao.php');

$retorno = ['status' => 'nok', 'mensagem' => '', 'data' => []];

$nome = $_POST['nome'] ?? '';
$email = $_POST['email'] ?? '';
$telefone = $_POST['telefone'] ?? '';
$usuario = $_POST['usuario'] ?? '';
$senha = $_POST['senha'] ?? '';
$tipo = $_POST['tipo'] ?? 'contratante';

if (empty($nome) || empty($email) || empty($telefone) || empty($usuario) || empty($senha)) {
    $retorno['mensagem'] = 'Preencha todos os campos obrigatórios.';
} else {
    $sql = "INSERT INTO usuario (nome, email, telefone, usuario, senha, tipo) VALUES (?, ?, ?, ?, ?, ?)";
    $stmt = $conexao->prepare($sql);

    // Se o prepare falhar, nós capturamos o erro do MySQL aqui!
    if (!$stmt) {
        $retorno['mensagem'] = "Erro na estrutura do banco: " . $conexao->error;
    } else {
        $stmt->bind_param("ssssss", $nome, $email, $telefone, $usuario, $senha, $tipo);
        
        if ($stmt->execute()) {
            if ($stmt->affected_rows > 0) {
                $retorno['status'] = 'ok';
                $retorno['mensagem'] = 'Usuário cadastrado com sucesso.';
            } else {
                $retorno['mensagem'] = 'Não foi possível cadastrar o usuário.';
            }
        } else {
            $retorno['mensagem'] = "Erro ao executar inserção: " . $stmt->error;
        }
        $stmt->close();
    }
}

$conexao->close();

header("Content-type:application/json;charset:utf-8");
echo json_encode($retorno);