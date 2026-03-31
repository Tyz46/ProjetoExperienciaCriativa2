<?php
    include_once('conexao.php');

    $retorno = [
        'status'    => '', // ok ou nok
        'mensagem'  => '', // mensagem de sucesso ou erro
        'data'      => []  // efetivamente o retorno
    ];

    // As variáveis que eu ireir receber por $_POST;
    $nome       = $_POST['nome'];
    $usuario    = $_POST['usuario'];
    $senha      = $_POST['senha'];
    $tipo      = $_POST['tipo'];
    
    $stmt = $conexao->prepare("INSERT INTO usuario(nome,usuario,senha,tipo) VALUES (?,?,?,?)"); // prepara a query
    $stmt->bind_param("sssi",$nome,$usuario,$senha,$tipo);
    $stmt->execute(); // executa a query

    if($stmt->affected_rows > 0){
        $retorno = [
            'status'    => 'ok', // ok ou nok
            'mensagem'  => 'Registro inserido com sucesso', // mensagem de sucesso ou erro
            'data'      => []  // efetivamente o retorno
        ];
    }else{
        $retorno = [
            'status'    => 'nok', // ok ou nok
            'mensagem'  => 'Não foi possível inserir o registro', // mensagem de sucesso ou erro
            'data'      => []  // efetivamente o retorno
        ];
    }

    $stmt->close();    

    $conexao->close();

    header("Content-type:application/json;charset:utf-8");
    echo json_encode($retorno);