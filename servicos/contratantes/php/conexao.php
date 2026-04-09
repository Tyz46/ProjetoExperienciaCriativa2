<?php
// Configuração para acesso ao MYSQL.
$servidor = "localhost";
$usuario  = "root";
$senha    = "";
$banco    = "pf";

$conexao = new mysqli($servidor, $usuario, $senha, $banco);