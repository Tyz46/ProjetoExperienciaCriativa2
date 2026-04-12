<?php
session_start();
$retorno = ['status' => '','mensagem' => '','data' => []];
if(isset($_SESSION['usuario'])){
    $usuario = $_SESSION['usuario'];
    unset($usuario['senha']);

    $retorno = [
        'status' => 'ok',
        'mensagem' => '',
        'data' => $usuario
    ];
}else{
    $retorno = [
        'status' => 'nok',
        'mensagem' => '',
        'data' => []
    ];
}
header("Content-type:application/json;charset:utf-8");
echo json_encode($retorno);
