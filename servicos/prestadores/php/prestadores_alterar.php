<?php
session_start();
require_once dirname(__DIR__, 3) . '/php/conexao.php';
require_once dirname(__DIR__, 3) . '/php/usuario_helpers.php';
require_once dirname(__DIR__, 3) . '/php/servico_helpers.php';

// Endpoint de alteracao de servico de prestador.
$retorno = ['status' => 'nok', 'mensagem' => '', 'data' => []];

if (!usuarioTemTipo(['prestador', 'admin'])) {
    $retorno['mensagem'] = 'Apenas prestadores podem alterar servicos nesta aba.';
    $conexao->close();
    header('Content-type:application/json;charset:utf-8');
    echo json_encode($retorno);
    exit;
}

$id = (int) ($_GET['id'] ?? 0);
$nome = trim($_POST['nome'] ?? '');
$descricao = trim($_POST['descricao'] ?? '');
$categoria = trim($_POST['tipo'] ?? '');
$profissao = trim($_POST['profissao'] ?? '');
$descricaoEspecialidades = trim($_POST['descricao_especialidades'] ?? '');
$habilidades = normalizarHabilidades($_POST['habilidades'] ?? []);
$valor = trim($_POST['valor'] ?? '');
$localidade = trim($_POST['localidade'] ?? '');
$idUsuario = idUsuarioLogado();
$admin = ehAdmin();

// Valida campos e a existencia do ID antes de alterar.
if (
    $id <= 0 ||
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
    // Primeiro confirma se o usuario tem permissao para alterar este servico.
    $sqlPermissao = "SELECT id, id_prestador FROM servico WHERE id = ? AND origem = 'prestador'";
    if (!$admin) {
        $sqlPermissao .= ' AND id_prestador = ?';
    }

    $stmtPermissao = $conexao->prepare($sqlPermissao);
    if ($admin) {
        $stmtPermissao->bind_param('i', $id);
    } else {
        $stmtPermissao->bind_param('ii', $id, $idUsuario);
    }
    $stmtPermissao->execute();
    $resultadoPermissao = $stmtPermissao->get_result();

    if ($resultadoPermissao->num_rows === 0) {
        $retorno['mensagem'] = 'Voce so pode alterar servicos criados pela sua conta.';
        $stmtPermissao->close();
        $conexao->close();
        header('Content-type:application/json;charset:utf-8');
        echo json_encode($retorno);
        exit;
    }

    $servico = $resultadoPermissao->fetch_assoc();
    $idPrestador = (int) $servico['id_prestador'];
    $stmtPermissao->close();

    $sql = "
        UPDATE servico
        SET titulo = ?, descricao = ?, categoria = ?, valor = ?, localidade = ?
        WHERE id = ? AND origem = 'prestador'
    ";
    if (!$admin) {
        $sql .= ' AND id_prestador = ?';
    }

    $stmt = $conexao->prepare($sql);

    if (!$stmt) {
        $retorno['mensagem'] = 'Erro na estrutura do banco: ' . $conexao->error;
    } else {
        if ($admin) {
            $stmt->bind_param('sssdsi', $nome, $descricao, $categoria, $valor, $localidade, $id);
        } else {
            $stmt->bind_param('sssdsii', $nome, $descricao, $categoria, $valor, $localidade, $id, $idUsuario);
        }

        if ($stmt->execute()) {
            // Depois da alteracao principal, atualiza perfil e habilidades relacionadas.
            upsertPerfilPrestador($conexao, $idPrestador, $profissao, $descricaoEspecialidades, $localidade);
            sincronizarHabilidadesServico($conexao, $id, $habilidades);

            $retorno['status'] = 'ok';
            $retorno['mensagem'] = 'Registro alterado com sucesso.';
        } else {
            $retorno['mensagem'] = 'Nao foi possivel alterar o registro: ' . $stmt->error;
        }

        $stmt->close();
    }
}

$conexao->close();

header('Content-type:application/json;charset:utf-8');
echo json_encode($retorno);
