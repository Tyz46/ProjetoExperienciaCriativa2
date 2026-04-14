<?php
// Configuração para acesso ao MYSQL.
$servidor = "localhost";
$usuario  = "root";
$senha    = "";
$banco    = "pf";

$conexao = new mysqli($servidor, $usuario, $senha, $banco);

if($conexao->connect_error){
    echo $conexao->connect_error;
    exit;
}

$conexao->set_charset("utf8mb4");
