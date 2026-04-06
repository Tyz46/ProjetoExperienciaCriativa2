<?php
    include_once('conexao.php');

    $retorno = [
        'status'    => '', // ok ou nok
        'mensagem'  => '', // mensagem de sucesso ou erro
        'data'      => []  // efetivamente o retorno
    ];

    if(isset($_GET['id'])){
        $id = $_GET['id'];
        $stmt = $conexao->prepare("DELETE FROM busca WHERE id_busca = ?"); // prepara a query
        $stmt->bind_param("i",$id);
        $stmt->execute(); // executa a query

        if($stmt->affected_rows > 0){
            $retorno = [
                'status'    => 'ok', // ok ou nok
                'mensagem'  => 'Registro excluido com sucesso', // mensagem de sucesso ou erro
                'data'      => []  // efetivamente o retorno
            ];
        }else{
            $retorno = [
                'status'    => 'nok', // ok ou nok
                'mensagem'  => 'Não foi possível excluir o registro', // mensagem de sucesso ou erro
                'data'      => []  // efetivamente o retorno
            ];
        }
        $stmt->close();    
    }else{
        $retorno = [
            'status'    => 'nok', // ok ou nok
            'mensagem'  => 'Não foi possível excluir o registro SEM ID', // mensagem de sucesso ou erro
            'data'      => []  // efetivamente o retorno
        ];
    }
    $conexao->close();
    header("Content-type:application/json;charset:utf-8");
    echo json_encode($retorno);