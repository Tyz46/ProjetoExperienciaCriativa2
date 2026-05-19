<?php
session_start();
require_once dirname(__DIR__, 3) . '/php/conexao.php';
require_once dirname(__DIR__, 3) . '/php/usuario_helpers.php';
require_once dirname(__DIR__, 3) . '/php/servico_helpers.php';

$retorno = ['status' => 'nok', 'mensagem' => '', 'data' => []];

if (!usuarioTemTipo(['prestador', 'admin'])) {
    $retorno['mensagem'] = 'Apenas prestadores podem criar servicos nesta aba.';
    $conexao->close();
    header('Content-type:application/json;charset:utf-8');
    echo json_encode($retorno);
    exit;
}

$nome = trim($_POST['nome'] ?? '');
$descricao = trim($_POST['descricao'] ?? '');
$categoria = trim($_POST['tipo'] ?? '');
$profissao = trim($_POST['profissao'] ?? '');
$descricaoEspecialidades = trim($_POST['descricao_especialidades'] ?? '');
$habilidades = normalizarHabilidades($_POST['habilidades'] ?? []);
$valor = trim($_POST['valor'] ?? '');
$localidade = trim($_POST['localidade'] ?? '');
$idUsuario = idUsuarioLogado();

if (
    $nome === '' ||
    $descricao === '' ||
    $categoria === '' ||
    $profissao === '' ||
    count($habilidades) === 0 ||
    $valor === '' ||
    $localidade === ''
) {
    $retorno['mensagem'] = 'Preencha todos os campos obrigatorios.';
} else {
    $fotos = salvarFotosServico(ORIGEM_PRESTADOR);
    $foto = count($fotos) > 0 ? $fotos[0] : null;
    $status = STATUS_SERVICO_ATIVO;

    $sql = "
        INSERT INTO servico (
            id_prestador, titulo, descricao, categoria, valor, origem, status, localidade, foto
        ) VALUES (?, ?, ?, ?, ?, 'prestador', ?, ?, ?)
    ";
    $stmt = $conexao->prepare($sql);

    if (!$stmt) {
        $retorno['mensagem'] = 'Erro na estrutura do banco: ' . $conexao->error;
    } else {
        $stmt->bind_param(
            'isssdsss',
            $idUsuario,
            $nome,
            $descricao,
            $categoria,
            $valor,
            $status,
            $localidade,
            $foto
        );

        if ($stmt->execute() && $stmt->affected_rows > 0) {
            $idServico = (int) $conexao->insert_id;
            upsertPerfilPrestador($conexao, $idUsuario, $profissao, $descricaoEspecialidades, $localidade);
            sincronizarHabilidadesServico($conexao, $idServico, $habilidades);

            $retorno['status'] = 'ok';
            $retorno['mensagem'] = 'Registro inserido com sucesso.';
        } else {
            $retorno['mensagem'] = 'Nao foi possivel inserir o registro: ' . $stmt->error;
        }

        $stmt->close();
    }
}

$conexao->close();

header('Content-type:application/json;charset:utf-8');
echo json_encode($retorno);
