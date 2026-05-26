<?php
require_once dirname(__DIR__, 2) . '/php/conexao.php';
require_once dirname(__DIR__, 2) . '/php/auth_senha.php';
require_once dirname(__DIR__, 2) . '/php/usuario_helpers.php';

// Endpoint de cadastro publico de usuario.
$retorno = ['status' => 'nok', 'mensagem' => '', 'data' => []];

// Leitura e normalizacao dos campos do formulario.
$nome = trim($_POST['nome'] ?? '');
$email = trim($_POST['email'] ?? '');
$telefone = trim($_POST['telefone'] ?? '');
$username = trim($_POST['usuario'] ?? $_POST['username'] ?? '');
$senha = $_POST['senha'] ?? '';
$tipo = normalizarTipoCadastro($_POST['tipo'] ?? 'cliente');

if ($nome === '' || $email === '' || $telefone === '' || $username === '' || $senha === '') {
    $retorno['mensagem'] = 'Preencha todos os campos obrigatórios.';
} elseif (!in_array($tipo, ['cliente', 'prestador', 'admin'], true)) {
    $retorno['mensagem'] = 'Tipo de conta inválido.';
} else {
    // Cria a conta principal na tabela usuario.
    $sql = 'INSERT INTO usuario (nome, email, telefone, username, senha_hash, tipo) VALUES (?, ?, ?, ?, ?, ?)';
    $stmt = $conexao->prepare($sql);

    if (!$stmt) {
        $retorno['mensagem'] = 'Erro na estrutura do banco: ' . $conexao->error;
    } else {
        $senhaHash = hash_senha($senha);
        $stmt->bind_param('ssssss', $nome, $email, $telefone, $username, $senhaHash, $tipo);

        if ($stmt->execute() && $stmt->affected_rows > 0) {
            $idUsuario = (int) $conexao->insert_id;

            // Prestadores precisam de um perfil profissional inicial para preencher depois.
            if ($tipo === 'prestador') {
                $stmtPerfil = $conexao->prepare(
                    'INSERT INTO perfil_prestador (id_usuario, profissao, descricao, localidade)
                     VALUES (?, ?, NULL, ?)'
                );
                $profissaoPadrao = 'A definir';
                $localidadePadrao = 'A definir';
                $stmtPerfil->bind_param('iss', $idUsuario, $profissaoPadrao, $localidadePadrao);
                $stmtPerfil->execute();
                $stmtPerfil->close();
            }

            $retorno['status'] = 'ok';
            $retorno['mensagem'] = 'Usuário cadastrado com sucesso.';
        } else {
            $retorno['mensagem'] = 'Não foi possível cadastrar o usuário: ' . $stmt->error;
        }
        $stmt->close();
    }
}

$conexao->close();

header('Content-type:application/json;charset:utf-8');
echo json_encode($retorno);
