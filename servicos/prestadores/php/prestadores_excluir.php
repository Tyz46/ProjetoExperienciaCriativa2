<?php
    session_start();
    include_once('conexao.php');

    $retorno = [
        'status'    => '', // ok ou nok
        'mensagem'  => '', // mensagem de sucesso ou erro
        'data'      => []  // efetivamente o retorno
    ];

    if(!isset($_SESSION['usuario']) || !in_array(($_SESSION['usuario']['tipo'] ?? ''), ['prestador', 'adm'], true)){
        $retorno = [
            'status'    => 'nok',
            'mensagem'  => 'Apenas prestadores podem excluir serviços nesta aba.',
            'data'      => []
        ];

        $conexao->close();
        header("Content-type:application/json;charset:utf-8");
        echo json_encode($retorno);
        exit;
    }

    $idUsuario = (int) $_SESSION['usuario']['id'];
    $ehAdmin = ($_SESSION['usuario']['tipo'] ?? '') === 'adm';

    if(isset($_GET['id'])){
        $id = $_GET['id'];
        $sql = "DELETE FROM servico WHERE id = ? AND origem = 'prestador'";
        if(!$ehAdmin){
            $sql .= " AND id_usuario = ?";
        }

        $stmt = $conexao->prepare($sql);
        if($ehAdmin){
            $stmt->bind_param("i",$id);
        }else{
            $stmt->bind_param("ii",$id,$idUsuario);
        }
        $stmt->execute();

        if($stmt->affected_rows > 0){
            $retorno = [
                'status'    => 'ok', // ok ou nok
                'mensagem'  => 'Registro excluido com sucesso', // mensagem de sucesso ou erro
                'data'      => []  // efetivamente o retorno
            ];
        }else{
            $retorno = [
                'status'    => 'nok', // ok ou nok
                'mensagem'  => 'Você só pode excluir serviços criados pela sua conta', // mensagem de sucesso ou erro
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
