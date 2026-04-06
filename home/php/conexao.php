<?php
// Configuração para acesso ao MYSQL.
$servidor = "127.0.0.1";
$usuario  = "root";
$senha    = "";
$banco    = "pf";

$conexao = new mysqli($servidor, $usuario, $senha, $banco);

if($conexao->connect_error){
    echo $conexao->connect_error;
}
