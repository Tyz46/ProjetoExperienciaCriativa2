<?php
// Configuração central de acesso ao MySQL (usada por todo o projeto).
$servidor = 'localhost:3306';
$usuario = 'root';
$senha = '';
$banco = 'pf';

$conexao = new mysqli($servidor, $usuario, $senha, $banco);

if ($conexao->connect_error) {
    echo $conexao->connect_error;
    exit;
}

$conexao->set_charset('utf8mb4');
