<?php
    include_once('conexao.php');

    $retorno = [
        'status'    => '', // ok ou nok
        'mensagem'  => '', // mensagem de sucesso ou erro
        'data'      => []  // efetivamente o retorno
    ];

    // As variáveis que eu ireir receber por $_POST;
    $nome       = $_POST['nome'];
    $tipo      = $_POST['tipo'];
    
    $stmt = $conexao->prepare("INSERT INTO servico(nome,tipo) VALUES (?,?)"); // prepara a query
    $stmt->bind_param("ss",$nome,$tipo);
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