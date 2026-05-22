<?php

require_once __DIR__ . '/servico_helpers.php';
require_once __DIR__ . '/usuario_helpers.php';

function carregarPerfilCompleto(mysqli $conexao, int $idUsuario, int $idVisitante): array
{
    $stmt = $conexao->prepare(
        'SELECT id, nome, email, telefone, username, tipo, foto, created_at
         FROM usuario WHERE id = ?'
    );
    $stmt->bind_param('i', $idUsuario);
    $stmt->execute();
    $resultado = $stmt->get_result();

    if ($resultado->num_rows === 0) {
        $stmt->close();
        return null;
    }

    $usuario = $resultado->fetch_assoc();
    $stmt->close();

    $ehProprioPerfil = $idVisitante > 0 && $idVisitante === (int) $usuario['id'];
    $usuario['usuario'] = $usuario['username'];

    if (!$ehProprioPerfil) {
        unset($usuario['email'], $usuario['telefone']);
    }

    $perfilPrestador = carregarPerfilPrestador($conexao, $idUsuario);
    $avaliacoes = carregarAvaliacoesRecebidas($conexao, $idUsuario);
    $resumoAvaliacoes = calcularResumoAvaliacoes($avaliacoes, $perfilPrestador);
    $servicos = carregarServicosDoUsuario($conexao, $idUsuario);

    return [
        'usuario' => sanitizarUsuarioSessao($usuario),
        'perfil_prestador' => $perfilPrestador,
        'eh_proprio_perfil' => $ehProprioPerfil,
        'resumo_avaliacoes' => $resumoAvaliacoes,
        'avaliacoes' => $avaliacoes,
        'servicos' => $servicos,
    ];
}

function carregarPerfilPrestador(mysqli $conexao, int $idUsuario): ?array
{
    $stmt = $conexao->prepare(
        'SELECT profissao, descricao, localidade, nota_media, created_at
         FROM perfil_prestador WHERE id_usuario = ?'
    );
    $stmt->bind_param('i', $idUsuario);
    $stmt->execute();
    $resultado = $stmt->get_result();
    $perfil = $resultado->num_rows > 0 ? $resultado->fetch_assoc() : null;
    $stmt->close();

    return $perfil;
}

function carregarAvaliacoesRecebidas(mysqli $conexao, int $idUsuario): array
{
    $sql = "
        SELECT
            a.id,
            a.nota,
            a.comentario,
            a.created_at,
            a.id_servico,
            a.id_avaliador,
            u.nome AS nome_avaliador,
            u.username AS username_avaliador,
            s.titulo AS servico_titulo,
            s.origem AS servico_origem
        FROM avaliacao a
        INNER JOIN usuario u ON u.id = a.id_avaliador
        INNER JOIN servico s ON s.id = a.id_servico
        WHERE a.id_avaliado = ?
        ORDER BY a.created_at DESC
    ";
    $stmt = $conexao->prepare($sql);
    $stmt->bind_param('i', $idUsuario);
    $stmt->execute();
    $resultado = $stmt->get_result();

    $lista = [];
    while ($linha = $resultado->fetch_assoc()) {
        $lista[] = $linha;
    }

    $stmt->close();
    return $lista;
}

function calcularResumoAvaliacoes(array $avaliacoes, ?array $perfilPrestador): array
{
    $total = count($avaliacoes);
    $media = 0.0;

    if ($total > 0) {
        $soma = 0;
        foreach ($avaliacoes as $avaliacao) {
            $soma += (int) $avaliacao['nota'];
        }
        $media = round($soma / $total, 1);
    } elseif ($perfilPrestador && (float) $perfilPrestador['nota_media'] > 0) {
        $media = round((float) $perfilPrestador['nota_media'], 1);
    }

    return [
        'media' => $media,
        'total' => $total,
    ];
}

function carregarServicosDoUsuario(mysqli $conexao, int $idUsuario): array
{
    $sql = sqlSelectServicoComUsuario() . '
        WHERE s.id_prestador = ?
        ORDER BY s.created_at DESC, s.id DESC
    ';
    $stmt = $conexao->prepare($sql);
    $stmt->bind_param('i', $idUsuario);
    $stmt->execute();
    $resultado = $stmt->get_result();

    $prestador = [];
    $cliente = [];

    while ($linha = $resultado->fetch_assoc()) {
        if ($linha['origem'] === ORIGEM_PRESTADOR) {
            $prestador[] = $linha;
        } elseif ($linha['origem'] === ORIGEM_CLIENTE) {
            $cliente[] = $linha;
        }
    }

    $stmt->close();

    enriquecerLinhasServico($conexao, $prestador);
    enriquecerLinhasServico($conexao, $cliente);

    return [
        'prestador' => $prestador,
        'cliente' => $cliente,
        'todos' => array_merge($prestador, $cliente),
    ];
}

function rotuloTipoUsuario(string $tipo): string
{
    $mapa = [
        'cliente' => 'Cliente',
        'prestador' => 'Prestador',
        'admin' => 'Administrador',
    ];

    return $mapa[$tipo] ?? $tipo;
}
