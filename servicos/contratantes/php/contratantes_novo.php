<?php
session_start();
require_once dirname(__DIR__, 3) . '/php/conexao.php';
require_once dirname(__DIR__, 3) . '/php/usuario_helpers.php';
require_once dirname(__DIR__, 3) . '/php/servico_helpers.php';

// Endpoint de cadastro de chamado publicado por cliente.
$retorno = ['status' => 'nok', 'mensagem' => '', 'data' => []];

if (!usuarioTemTipo(['cliente', 'admin'])) {
    $retorno['mensagem'] = 'Apenas clientes podem criar chamados nesta aba.';
    $conexao->close();
    header('Content-type:application/json;charset:utf-8');
    echo json_encode($retorno);
    exit;
}

$nome = trim($_POST['nome'] ?? '');
$descricao = trim($_POST['descricao'] ?? '');
$categoria = trim($_POST['tipo'] ?? '');
$valor = trim($_POST['valor'] ?? '');
$localidade = trim($_POST['localidade'] ?? '');
$idUsuario = idUsuarioLogado();

// Valida o minimo necessario para publicar um chamado.
if ($nome === '' || $descricao === '' || $categoria === '' || $valor === '' || $localidade === '') {
    $retorno['mensagem'] = 'Preencha todos os campos.';
} else {
    // Salva as fotos primeiro para depois gravar o caminho no banco.
    $fotos = salvarFotosServico(ORIGEM_CLIENTE);
    $foto = count($fotos) > 0 ? $fotos[0] : null;
    $status = STATUS_SERVICO_ATIVO;

    $sql = "
        INSERT INTO servico (
            id_prestador, titulo, descricao, categoria, valor, origem, status, localidade, foto
        ) VALUES (?, ?, ?, ?, ?, 'cliente', ?, ?, ?)
    ";
    $stmt = $conexao->prepare($sql);

    if (!$stmt) {
        $retorno['mensagem'] = 'Erro na estrutura do banco: ' . $conexao->error;
    } else {
        $stmt->bind_param(
            'issdssss',
            $idUsuario,
            $nome,
            $descricao,
            $categoria,
            $valor,
            $status,
            $localidade,
            $foto
        );

        if ($stmt->execute() && $stmt->affected_rows > 0) {
            $retorno['status'] = 'ok';
            $retorno['mensagem'] = 'Chamado cadastrado com sucesso';
        } else {
            $retorno['mensagem'] = 'Nao foi possivel inserir o registro: ' . $stmt->error;
        }
        $stmt->close();
    }
}

$conexao->close();

header('Content-type:application/json;charset:utf-8');
echo json_encode($retorno);
