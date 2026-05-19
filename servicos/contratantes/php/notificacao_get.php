<?php
session_start();
require "../../conexao.php";

$idUsuario = $_SESSION["usuario"]["id"] ?? 0;

$sql = "
    SELECT *
    FROM notificacao
    WHERE id_usuario = ?
    ORDER BY data_criacao DESC
";

$stmt = $pdo->prepare($sql);
$stmt->execute([$idUsuario]);

echo json_encode([
    "status" => "ok",
    "data" => $stmt->fetchAll(PDO::FETCH_ASSOC)
]);