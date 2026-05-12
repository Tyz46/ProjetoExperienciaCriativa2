<?php
session_start();
include_once('conexao.php');

$retorno = ['status' => 'nok', 'mensagem' => '', 'data' => []];

if (!isset($_SESSION['usuario']) || !in_array(($_SESSION['usuario']['tipo'] ?? ''), ['prestador', 'adm'], true)) {
    $retorno['mensagem'] = 'Apenas prestadores podem alterar servicos nesta aba.';
    $conexao->close();
    header("Content-type:application/json;charset:utf-8");
    echo json_encode($retorno);
    exit;
}

$id = $_GET['id'] ?? '';
$nome = trim($_POST['nome'] ?? '');
$descricao = trim($_POST['descricao'] ?? '');
$tipo = trim($_POST['tipo'] ?? '');
$profissao = trim($_POST['profissao'] ?? '');
$descricaoEspecialidades = trim($_POST['descricao_especialidades'] ?? '');
$habilidades = normalizarHabilidades($_POST['habilidades'] ?? []);
$valor = trim($_POST['valor'] ?? '');
$localidade = trim($_POST['localidade'] ?? '');
$idUsuario = (int) $_SESSION['usuario']['id'];
$ehAdmin = ($_SESSION['usuario']['tipo'] ?? '') === 'adm';

if ($id === '') {
    $retorno['mensagem'] = 'Nao foi possivel alterar o registro sem ID.';
} elseif (
    $nome === '' ||
    $descricao === '' ||
    $tipo === '' ||
    $profissao === '' ||
    count($habilidades) === 0 ||
    $valor === '' ||
    $localidade === ''
) {
    $retorno['mensagem'] = 'Preencha todos os campos obrigatorios.';
} else {
    $sqlPermissao = "SELECT id FROM servico WHERE id = ? AND origem = 'prestador'";
    if (!$ehAdmin) {
        $sqlPermissao .= " AND id_usuario = ?";
    }

    $stmtPermissao = $conexao->prepare($sqlPermissao);
    if ($ehAdmin) {
        $stmtPermissao->bind_param("i", $id);
    } else {
        $stmtPermissao->bind_param("ii", $id, $idUsuario);
    }
    $stmtPermissao->execute();
    $resultadoPermissao = $stmtPermissao->get_result();

    if ($resultadoPermissao->num_rows === 0) {
        $retorno['mensagem'] = 'Voce so pode alterar servicos criados pela sua conta.';
        $stmtPermissao->close();
        $conexao->close();
        header("Content-type:application/json;charset:utf-8");
        echo json_encode($retorno);
        exit;
    }
    $stmtPermissao->close();

    $habilidadesJson = json_encode($habilidades, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    $sql = "UPDATE servico SET nome = ?, descricao = ?, tipo = ?, profissao = ?, habilidades = ?, descricao_especialidades = ?, valor = ?, localidade = ? WHERE id = ? AND origem = 'prestador'";
    if (!$ehAdmin) {
        $sql .= " AND id_usuario = ?";
    }

    $stmt = $conexao->prepare($sql);

    if (!$stmt) {
        $retorno['mensagem'] = 'Erro na estrutura do banco: ' . $conexao->error;
    } else {
        if ($ehAdmin) {
            $stmt->bind_param(
                "ssssssssi",
                $nome,
                $descricao,
                $tipo,
                $profissao,
                $habilidadesJson,
                $descricaoEspecialidades,
                $valor,
                $localidade,
                $id
            );
        } else {
            $stmt->bind_param(
                "ssssssssii",
                $nome,
                $descricao,
                $tipo,
                $profissao,
                $habilidadesJson,
                $descricaoEspecialidades,
                $valor,
                $localidade,
                $id,
                $idUsuario
            );
        }

        if ($stmt->execute()) {
            $retorno['status'] = 'ok';
            $retorno['mensagem'] = 'Registro alterado com sucesso.';
        } else {
            $retorno['mensagem'] = 'Nao foi possivel alterar o registro: ' . $stmt->error;
        }

        $stmt->close();
    }
}

$conexao->close();

header("Content-type:application/json;charset:utf-8");
echo json_encode($retorno);

function normalizarHabilidades($habilidades) {
    if (!is_array($habilidades)) {
        $habilidades = [$habilidades];
    }

    $habilidadesNormalizadas = [];

    foreach ($habilidades as $habilidade) {
        $habilidade = trim((string) $habilidade);

        if ($habilidade === '' || in_array($habilidade, $habilidadesNormalizadas, true)) {
            continue;
        }

        $habilidadesNormalizadas[] = $habilidade;
    }

    return $habilidadesNormalizadas;
}
