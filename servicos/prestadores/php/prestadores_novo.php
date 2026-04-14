<?php
session_start();
include_once('conexao.php');

$retorno = ['status' => 'nok', 'mensagem' => '', 'data' => []];

if (!isset($_SESSION['usuario']) || !in_array(($_SESSION['usuario']['tipo'] ?? ''), ['prestador', 'adm'], true)) {
    $retorno['mensagem'] = 'Apenas prestadores podem criar serviços nesta aba.';
    $conexao->close();
    header("Content-type:application/json;charset:utf-8");
    echo json_encode($retorno);
    exit;
}

$nome = trim($_POST['nome'] ?? '');
$descricao = trim($_POST['descricao'] ?? '');
$tipo = trim($_POST['tipo'] ?? '');
$valor = trim($_POST['valor'] ?? '');
$localidade = trim($_POST['localidade'] ?? '');
$idUsuario = (int) $_SESSION['usuario']['id'];
$origem = 'prestador';

if ($nome === '' || $descricao === '' || $tipo === '' || $valor === '' || $localidade === '') {
    $retorno['mensagem'] = 'Preencha todos os campos obrigatórios.';
} else {
    $fotos = salvarFotos($origem);
    $fotoJson = count($fotos) > 0 ? json_encode($fotos, JSON_UNESCAPED_SLASHES) : null;
    $stmt = $conexao->prepare(
        "INSERT INTO servico (id_usuario, origem, nome, descricao, tipo, valor, localidade, foto) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
    );

    if (!$stmt) {
        $retorno['mensagem'] = 'Erro na estrutura do banco: ' . $conexao->error;
    } else {
        $stmt->bind_param("isssssss", $idUsuario, $origem, $nome, $descricao, $tipo, $valor, $localidade, $fotoJson);

        if ($stmt->execute() && $stmt->affected_rows > 0) {
            $retorno['status'] = 'ok';
            $retorno['mensagem'] = 'Registro inserido com sucesso.';
        } else {
            $retorno['mensagem'] = 'Não foi possível inserir o registro: ' . $stmt->error;
        }

        $stmt->close();
    }
}

$conexao->close();

header("Content-type:application/json;charset:utf-8");
echo json_encode($retorno);

function salvarFotos($origem) {
    if (!isset($_FILES['fotos'])) {
        return [];
    }

    $arquivos = $_FILES['fotos'];
    $fotos = [];
    $pastaDestino = __DIR__ . '/../../../uploads/servicos/';
    $caminhoWeb = '../../../uploads/servicos/';
    $extensoesPermitidas = ['jpg', 'jpeg', 'png', 'gif', 'webp'];

    if (!is_dir($pastaDestino)) {
        mkdir($pastaDestino, 0777, true);
    }

    foreach ($arquivos['name'] as $indice => $nomeOriginal) {
        if ($arquivos['error'][$indice] === UPLOAD_ERR_NO_FILE) {
            continue;
        }

        if ($arquivos['error'][$indice] !== UPLOAD_ERR_OK) {
            continue;
        }

        if ($arquivos['size'][$indice] > 5 * 1024 * 1024) {
            continue;
        }

        $tmpName = $arquivos['tmp_name'][$indice];
        if (!@getimagesize($tmpName)) {
            continue;
        }

        $extensao = strtolower(pathinfo($nomeOriginal, PATHINFO_EXTENSION));
        if (!in_array($extensao, $extensoesPermitidas, true)) {
            continue;
        }

        $nomeArquivo = $origem . '_' . uniqid('', true) . '.' . $extensao;
        if (move_uploaded_file($tmpName, $pastaDestino . $nomeArquivo)) {
            $fotos[] = $caminhoWeb . $nomeArquivo;
        }
    }

    return $fotos;
}
