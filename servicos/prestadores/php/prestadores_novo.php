<?php
    include_once('conexao.php');

    $retorno = [
        'status'    => '', // ok ou nok
        'mensagem'  => '', // mensagem de sucesso ou erro
        'data'      => []  // efetivamente o retorno
    ];

    // As variáveis que eu irei receber por $_POST;
    $nome             = trim($_POST['nome'] ?? '');
    $descricao        = trim($_POST['descricao'] ?? '');
    $preco            = trim($_POST['preco'] ?? '');
    $data_publicacao  = trim($_POST['data_publicacao'] ?? '');

    if ($nome === '' || $descricao === '' || $preco === '' || $data_publicacao === '') {
        $retorno = [
            'status'    => 'nok',
            'mensagem'  => 'Todos os campos são obrigatórios.',
            'data'      => []
        ];
    } elseif (!is_numeric($preco)) {
        $retorno = [
            'status'    => 'nok',
            'mensagem'  => 'Preço inválido.',
            'data'      => []
        ];
    } else {
        $stmt = $conexao->prepare("INSERT INTO prestador(nome,descricao,preco,data_publicacao) VALUES (?,?,?,?)"); // prepara a query
        $stmt->bind_param("ssss",$nome,$descricao,$preco,$data_publicacao);
        $stmt->execute(); // executa a query

        if($stmt->affected_rows > 0){
            $retorno = [
                'status'    => 'ok', // ok ou nok
                'mensagem'  => 'Registro inserido com sucesso', // mensagem de sucesso ou erro
                'data'      => []  // efetivamente o retorno
            ];
        } else {
            $retorno = [
                'status'    => 'nok', // ok ou nok
                'mensagem'  => 'Não foi possível inserir o registro', // mensagem de sucesso ou erro
                'data'      => []  // efetivamente o retorno
            ];
        }
    }

    $stmt->close();    

    $conexao->close();

    header("Content-type:application/json;charset:utf-8");
    echo json_encode($retorno);