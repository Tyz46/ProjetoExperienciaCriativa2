<?php
session_start();
require "../../conexao.php"; // ajuste o caminho

if (!isset($_SESSION["usuario"]["id"])) {
    echo json_encode(["status" => "erro", "mensagem" => "Não autenticado"]);
    exit;
}

$dados = json_decode(file_get_contents("php://input"), true);

$idUsuario = intval($dados["id_usuario"] ?? 0);
$idServico = intval($dados["id_servico"] ?? 0);

if (!$idUsuario || !$idServico) {
    echo json_encode(["status" => "erro", "mensagem" => "Dados inválidos"]);
    exit;
}

$titulo = "Novo prestador interessado";
$mensagem = "Um prestador demonstrou interesse no seu serviço #$idServico.";

$sql = "
    INSERT INTO notificacao (id_usuario, titulo, mensagem)
    VALUES (?, ?, ?)
";

$stmt = $pdo->prepare($sql);
$stmt->execute([$idUsuario, $titulo, $mensagem]);

echo json_encode(["status" => "ok"]);