<?php
    include_once('conexao.php');

    $retorno = [
        'status'    => '', // ok ou nok
        'mensagem'  => '', // mensagem de sucesso ou erro
        'data'      => []  // efetivamente o retorno
    ];

    // As variáveis que eu ireir receber por $_POST;
    $nome      = $_POST['nome'];
    $tipo      = $_POST['tipo'];
    $descricao = $_POST['descricao'];
    $orcamento = $_POST['orcamento'];
    $data      = $_POST['data_pub'];

    $stmt = $conexao->prepare("INSERT INTO busca (nome_busca, tipo, descricao, orcamento, data_publicacao) VALUES (?, ?, ?, ?, ?)");
    $stmt->bind_param("sssss", $nome, $tipo, $descricao, $orcamento, $data);
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