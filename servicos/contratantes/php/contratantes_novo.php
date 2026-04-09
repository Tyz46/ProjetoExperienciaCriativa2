<?php
// Ligando os erros temporariamente
ini_set('display_errors', 1);
error_reporting(E_ALL);

include_once('conexao.php');

$retorno = ['status' => 'nok', 'mensagem' => '', 'data' => []];

// 1. Recebendo todos os 5 campos que vêm do JS
$nome       = $_POST['nome'] ?? '';
$descricao  = $_POST['descricao'] ?? '';
$tipo       = $_POST['tipo'] ?? '';
$valor      = $_POST['valor'] ?? '';
$localidade = $_POST['localidade'] ?? '';

// 2. Validação básica
if(empty($nome) || empty($descricao) || empty($tipo) || empty($valor) || empty($localidade)){
    $retorno['mensagem'] = 'Preencha todos os campos obrigatórios.';
} else {
    // 3. Prepara a query para 5 colunas
    $sql = "INSERT INTO servico (nome, descricao, tipo, valor, localidade) VALUES (?, ?, ?, ?, ?)";
    $stmt = $conexao->prepare($sql);

    // Se a tabela não existir ou faltar coluna, ele avisa!
    if (!$stmt) {
        $retorno['mensagem'] = "Erro na estrutura do banco: " . $conexao->error;
    } else {
        // "sssss" = 5 strings (o MySQL converte o número do valor sozinho)
        $stmt->bind_param("sssss", $nome, $descricao, $tipo, $valor, $localidade);
        
        if ($stmt->execute()) {
            if ($stmt->affected_rows > 0) {
                $retorno['status'] = 'ok';
                $retorno['mensagem'] = 'Serviço cadastrado com sucesso!';
            } else {
                $retorno['mensagem'] = 'Não foi possível inserir o registro.';
            }
        } else {
            $retorno['mensagem'] = "Erro ao executar inserção: " . $stmt->error;
        }
        $stmt->close();
    }
}

$conexao->close();

header("Content-type:application/json;charset:utf-8");
echo json_encode($retorno);