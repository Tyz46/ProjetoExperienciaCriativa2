<?php

require_once __DIR__ . '/servico_helpers.php';
require_once __DIR__ . '/usuario_helpers.php';

/**
 * Reune todos os dados necessarios para montar a tela de perfil.
 * Decide tambem o que pode ou nao ser exibido publicamente.
 */
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
    $servicosAcordados = $ehProprioPerfil
        ? carregarServicosAcordadosDoUsuario($conexao, $idUsuario)
        : [];

    return [
        'usuario' => sanitizarUsuarioSessao($usuario),
        'perfil_prestador' => $perfilPrestador,
        'eh_proprio_perfil' => $ehProprioPerfil,
        'resumo_avaliacoes' => $resumoAvaliacoes,
        'avaliacoes' => $avaliacoes,
        'servicos' => $servicos,
        'servicos_acordados' => $servicosAcordados,
    ];
}

/**
 * Carrega apenas os dados complementares do perfil profissional.
 */
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

/**
 * Lista as avaliacoes recebidas por um usuario junto com informacoes do avaliador e do servico.
 */
function carregarAvaliacoesRecebidas(mysqli $conexao, int $idUsuario): array
{
    $sql = "
        SELECT
            a.id,
            a.nota,
            a.comentario,
            DATE_FORMAT(a.created_at, '%Y-%m-%dT%H:%i:%s') AS created_at,
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

/**
 * Calcula media e quantidade total de avaliacoes para exibir no resumo do perfil.
 */
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

/**
 * Carrega todos os servicos publicados por um usuario e separa por origem.
 */
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

/**
 * Lista os servicos que ja viraram acordo entre cliente e prestador.
 * Esses dados alimentam a aba "Acordos" do perfil proprio.
 */
function carregarServicosAcordadosDoUsuario(mysqli $conexao, int $idUsuario): array
{
    $sql = "
        SELECT
            n.id,
            n.id_servico,
            n.id_cliente,
            n.id_prestador,
            n.id_iniciador,
            n.tipo_iniciativa,
            n.status,
            n.titulo_mensagem,
            n.descricao_mensagem,
            n.categoria_mensagem,
            n.valor_proposto,
            n.localidade_mensagem,
            n.finalizado_resposta_cliente,
            n.finalizado_resposta_prestador,
            DATE_FORMAT(n.created_at, '%Y-%m-%dT%H:%i:%s') AS created_at,
            DATE_FORMAT(n.updated_at, '%Y-%m-%dT%H:%i:%s') AS updated_at,
            s.titulo AS servico_titulo,
            s.descricao AS servico_descricao,
            s.categoria AS servico_categoria,
            s.valor AS servico_valor,
            s.localidade AS servico_localidade,
            s.foto AS servico_foto,
            s.origem AS servico_origem,
            s.status AS servico_status,
            cliente.nome AS nome_cliente,
            cliente.username AS username_cliente,
            prestador.nome AS nome_prestador,
            prestador.username AS username_prestador,
            pp.profissao AS profissao_prestador
        FROM negociacao_servico n
        INNER JOIN servico s ON s.id = n.id_servico
        INNER JOIN usuario cliente ON cliente.id = n.id_cliente
        INNER JOIN usuario prestador ON prestador.id = n.id_prestador
        LEFT JOIN perfil_prestador pp ON pp.id_usuario = n.id_prestador
        WHERE (n.id_cliente = ? OR n.id_prestador = ?)
          AND n.status IN ('aceita', 'em_andamento', 'finalizada')
        ORDER BY
            CASE
                WHEN n.status = 'em_andamento' THEN 0
                WHEN n.status = 'aceita' THEN 1
                ELSE 2
            END,
            n.updated_at DESC,
            n.id DESC
    ";

    $stmt = $conexao->prepare($sql);
    $stmt->bind_param('ii', $idUsuario, $idUsuario);
    $stmt->execute();
    $resultado = $stmt->get_result();

    $lista = [];
    while ($linha = $resultado->fetch_assoc()) {
        $lista[] = normalizarServicoAcordado($linha, $idUsuario);
    }

    $stmt->close();
    return $lista;
}

/**
 * Ajusta uma linha bruta da negociacao para um formato pronto para renderizacao no frontend.
 */
function normalizarServicoAcordado(array $linha, int $idUsuario): array
{
    $usuarioComoCliente = (int) $linha['id_cliente'] === $idUsuario;
    $titulo = trim((string) ($linha['titulo_mensagem'] ?? ''));
    $descricao = trim((string) ($linha['descricao_mensagem'] ?? ''));
    $categoria = trim((string) ($linha['categoria_mensagem'] ?? ''));
    $localidade = trim((string) ($linha['localidade_mensagem'] ?? ''));
    $valorProposto = isset($linha['valor_proposto']) ? (float) $linha['valor_proposto'] : 0.0;
    $valorServico = isset($linha['servico_valor']) ? (float) $linha['servico_valor'] : 0.0;

    if ($titulo === '') {
        $titulo = $linha['servico_titulo'] ?? 'Servico acordado';
    }

    if ($descricao === '') {
        $descricao = $linha['servico_descricao'] ?? '';
    }

    if ($categoria === '') {
        $categoria = $linha['servico_categoria'] ?? '';
    }

    if ($localidade === '') {
        $localidade = $linha['servico_localidade'] ?? '';
    }

    $linha['foto'] = fotoServicoParaJson($linha['servico_foto'] ?? null);
    $linha['titulo_exibicao'] = $titulo;
    $linha['descricao_exibicao'] = $descricao;
    $linha['categoria_exibicao'] = $categoria;
    $linha['localidade_exibicao'] = $localidade;
    $linha['valor_exibicao'] = $valorProposto > 0 ? $valorProposto : $valorServico;
    $linha['papel_usuario'] = $usuarioComoCliente ? 'cliente' : 'prestador';
    $linha['id_outra_parte'] = $usuarioComoCliente ? (int) $linha['id_prestador'] : (int) $linha['id_cliente'];
    $linha['nome_outra_parte'] = $usuarioComoCliente
        ? ($linha['nome_prestador'] ?? 'Prestador')
        : ($linha['nome_cliente'] ?? 'Cliente');
    $linha['username_outra_parte'] = $usuarioComoCliente
        ? ($linha['username_prestador'] ?? '')
        : ($linha['username_cliente'] ?? '');
    $linha['rotulo_outra_parte'] = $usuarioComoCliente
        ? 'Prestador responsavel'
        : 'Cliente contratante';
    $linha['profissao_outra_parte'] = $usuarioComoCliente
        ? ($linha['profissao_prestador'] ?? '')
        : '';
    $linha['tipo_iniciativa_rotulo'] = ($linha['tipo_iniciativa'] ?? '') === 'cliente_solicita'
        ? 'Solicitacao aceita'
        : 'Proposta aceita';
    $linha['status_rotulo'] = rotuloStatusAcordo($linha['status'] ?? '');

    return $linha;
}

/**
 * Traduz o status tecnico da negociacao para um rotulo amigavel.
 */
function rotuloStatusAcordo(string $status): string
{
    $mapa = [
        'aceita' => 'Acordado',
        'em_andamento' => 'Em andamento',
        'finalizada' => 'Finalizado',
    ];

    return $mapa[$status] ?? 'Acordado';
}

/**
 * Traduz o tipo salvo no banco para o rotulo apresentado na interface.
 */
function rotuloTipoUsuario(string $tipo): string
{
    $mapa = [
        'cliente' => 'Cliente',
        'prestador' => 'Prestador',
        'admin' => 'Administrador',
    ];

    return $mapa[$tipo] ?? $tipo;
}
