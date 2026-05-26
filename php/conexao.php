<?php
// Configuracao central de acesso ao MySQL usada por todo o projeto.
// Sempre que um endpoint inclui este arquivo, a conexao $conexao ja fica pronta para uso.
// Configuração central de acesso ao MySQL (usada por todo o projeto).
$servidor = 'localhost:3306';
$usuario = 'root';
$senha = '';
$banco = 'pf';

$conexao = new mysqli($servidor, $usuario, $senha, $banco);

// Se a conexao falhar, o endpoint e interrompido aqui mesmo para evitar consultas invalidas.
if ($conexao->connect_error) {
    echo $conexao->connect_error;
    exit;
}

// Define UTF-8 completo para aceitar acentos, emojis e outros caracteres especiais.
$conexao->set_charset('utf8mb4');
