<?php
// Configuração para acesso ao MYSQL.
$servidor = "localhost:3307";
$usuario  = "root";
$senha    = "";
$banco    = "pf";

$conexao = new mysqli($servidor, $usuario, $senha, $banco);

if($conexao->connect_error){
    echo $conexao->connect_error;
}
