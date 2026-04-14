<?php
    session_start();
    include_once('conexao.php');

    $retorno = [
        'status'    => '', // ok ou nok
        'mensagem'  => '', // mensagem de sucesso ou erro
        'data'      => []  // efetivamente o retorno
    ];

    if(isset($_GET['id'])){
        $id = $_GET['id'];
        $stmt = $conexao->prepare("SELECT * FROM servico WHERE id = ? AND origem = 'prestador'");
        $stmt->bind_param("i",$id);
    }else{
        $stmt = $conexao->prepare("SELECT * FROM servico WHERE origem = 'prestador' ORDER BY id DESC");
    
    }
    $stmt->execute();
    $resultado = $stmt->get_result();
    
    $tabela = [];
    if($resultado->num_rows > 0){
        while($linha = $resultado->fetch_assoc()){
            $tabela[] = $linha;
        }

        $retorno = [
            'status'    => 'ok', // ok ou nok
            'mensagem'  => 'Registros encontrados', // mensagem de sucesso ou erro
            'data'      => $tabela  // efetivamente o retorno
        ];
    }else{
        $retorno = [
            'status'    => 'nok', // ok ou nok
            'mensagem'  => 'Nenhum registro encontrado', // mensagem de sucesso ou erro
            'data'      => []  // efetivamente o retorno
        ];
    }

    $stmt->close();
    $conexao->close();

    header("Content-type:application/json;charset:utf-8");
    echo json_encode($retorno);
