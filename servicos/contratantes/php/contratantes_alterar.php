<?php
    include_once('conexao.php');
    
    $retorno = [
        'status'    => '', // ok ou nok
        'mensagem'  => '', // mensagem de sucesso ou erro
        'data'      => []  // efetivamente o retorno
    ];

    if(isset($_GET['id'])){
        $id = $_GET['id'];
        
        // As variáveis que eu ireir receber por $_POST;
        $id        = $_POST['id'];
        $nome      = $_POST['nome'];
        $tipo      = $_POST['tipo'];
        $descricao = $_POST['descricao'];
        $requisitos = $_POST['requisitos'];
        $preco     = $_POST['preco'];
        $data_inst = $_POST['data_inst'];
        
        $stmt = $conexao->prepare("UPDATE servico SET nome = ?, tipo = ?, descricao = ?,requisitos = ?, preco = ?, data_inst = ? WHERE id = ?"); // prepara a query
        $stmt->bind_param("ssssssi", $nome, $tipo, $descricao, $requisitos, $preco, $data_inst, $id);
        $stmt->execute(); // executa a query

        if($stmt->affected_rows > 0){
            $retorno = [
                'status'    => 'ok', // ok ou nok
                'mensagem'  => 'Registro alterado com sucesso', // mensagem de sucesso ou erro
                'data'      => []  // efetivamente o retorno
            ];
        }else{
            $retorno = [
                'status'    => 'nok', // ok ou nok
                'mensagem'  => 'Não foi possível alterar o registro', // mensagem de sucesso ou erro
                'data'      => []  // efetivamente o retorno
            ];
        }

        $stmt->close();    
    }else{
        $retorno = [
            'status'    => 'nok', // ok ou nok
            'mensagem'  => 'Não foi possível alterar o registro sem ID', // mensagem de sucesso ou erro
            'data'      => []  // efetivamente o retorno
        ];
    }
    $conexao->close();

    header("Content-type:application/json;charset:utf-8");
    echo json_encode($retorno);