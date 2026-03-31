<?php
    include_once('conexao.php');

    $retorno = [
        'status'    => '', // ok ou nok
        'mensagem'  => '', // mensagem de sucesso ou erro
        'data'      => []  // efetivamente o retorno
    ];

    $stmt = $conexao->prepare("SELECT * FROM usuario WHERE usuario = ? AND senha = ?"); // prepara a query
    $stmt->bind_param("ss",$_POST['usuario'],$_POST['senha']);
    $stmt->execute(); // executa a query
    $resultado = $stmt->get_result(); // pega o resultado
    
    $tabela = []; // array para enviar para o Front
    if($resultado->num_rows > 0){
        // criar o laço de repetição para ler o resultado
        while($linha = $resultado->fetch_assoc()){
            $tabela[] = $linha;
        }

        $retorno = [
            'status'    => 'ok', // ok ou nok
            'mensagem'  => 'Registros encontrados', // mensagem de sucesso ou erro
            'data'      => $tabela  // efetivamente o retorno
        ];

        // Start Session
        session_start();
        $_SESSION['usuario'] = $tabela;

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