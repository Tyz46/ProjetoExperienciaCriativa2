<?php

require_once __DIR__ . '/usuario_helpers.php';
require_once __DIR__ . '/servico_helpers.php';

const NEG_STATUS_PENDENTE = 'pendente';
const NEG_STATUS_ACEITA = 'aceita';
const NEG_STATUS_RECUSADA = 'recusada';
const NEG_STATUS_EM_ANDAMENTO = 'em_andamento';
const NEG_STATUS_FINALIZADA = 'finalizada';

const NOTIF_SOLICITACAO = 'solicitacao_servico';
const NOTIF_PROPOSTA = 'proposta_trabalho';
const NOTIF_ACEITA = 'resposta_aceita';
const NOTIF_RECUSADA = 'resposta_recusada';
const NOTIF_FINALIZACAO = 'confirmar_finalizacao';
const NOTIF_AVALIAR = 'avaliar';

function carregarServicoParaFluxo(mysqli $conexao, int $idServico): ?array
{
    $stmt = $conexao->prepare(
        'SELECT s.id, s.id_prestador, s.titulo, s.origem, s.status, s.categoria, u.nome AS nome_dono, u.tipo AS tipo_dono
         FROM servico s
         INNER JOIN usuario u ON u.id = s.id_prestador
         WHERE s.id = ?'
    );
    $stmt->bind_param('i', $idServico);
    $stmt->execute();
    $resultado = $stmt->get_result();
    $servico = $resultado->num_rows > 0 ? $resultado->fetch_assoc() : null;
    $stmt->close();

    return $servico;
}

function existeNegociacaoAtiva(mysqli $conexao, int $idServico, int $idUsuario): bool
{
    $sql = "
        SELECT id FROM negociacao_servico
        WHERE id_servico = ?
          AND (id_cliente = ? OR id_prestador = ? OR id_iniciador = ?)
          AND status IN ('pendente', 'em_andamento')
        LIMIT 1
    ";
    $stmt = $conexao->prepare($sql);
    $stmt->bind_param('iiii', $idServico, $idUsuario, $idUsuario, $idUsuario);
    $stmt->execute();
    $resultado = $stmt->get_result();
    $existe = $resultado->num_rows > 0;
    $stmt->close();

    return $existe;
}

function criarNotificacao(
    mysqli $conexao,
    int $idUsuario,
    int $idRemetente,
    ?int $idNegociacao,
    string $tipo,
    string $titulo,
    string $mensagem,
    bool $requerAcao = true
): int {
    $requerAcaoInt = $requerAcao ? 1 : 0;
    $idNegParam = $idNegociacao;

    if ($idNegociacao === null) {
        $stmt = $conexao->prepare(
            'INSERT INTO notificacao (id_usuario, id_negociacao, id_remetente, tipo, titulo, mensagem, requer_acao)
             VALUES (?, NULL, ?, ?, ?, ?, ?)'
        );
        $stmt->bind_param('iisssi', $idUsuario, $idRemetente, $tipo, $titulo, $mensagem, $requerAcaoInt);
    } else {
        $stmt = $conexao->prepare(
            'INSERT INTO notificacao (id_usuario, id_negociacao, id_remetente, tipo, titulo, mensagem, requer_acao)
             VALUES (?, ?, ?, ?, ?, ?, ?)'
        );
        $stmt->bind_param('iiisssi', $idUsuario, $idNegParam, $idRemetente, $tipo, $titulo, $mensagem, $requerAcaoInt);
    }

    $stmt->execute();
    $id = (int) $conexao->insert_id;
    $stmt->close();

    return $id;
}

function carregarUsuarioResumo(mysqli $conexao, int $idUsuario): ?array
{
    $stmt = $conexao->prepare('SELECT id, nome, username, tipo, foto FROM usuario WHERE id = ?');
    $stmt->bind_param('i', $idUsuario);
    $stmt->execute();
    $resultado = $stmt->get_result();
    $usuario = $resultado->num_rows > 0 ? $resultado->fetch_assoc() : null;
    $stmt->close();

    return $usuario;
}

function criarSolicitacaoCliente(mysqli $conexao, int $idCliente, int $idServico, array $dados): array
{
    if (!usuarioTemTipo(['cliente', 'admin'])) {
        return ['ok' => false, 'mensagem' => 'Apenas clientes podem enviar solicitacoes de servico.'];
    }

    $servico = carregarServicoParaFluxo($conexao, $idServico);
    if ($servico === null) {
        return ['ok' => false, 'mensagem' => 'Servico nao encontrado.'];
    }

    if ($servico['origem'] !== ORIGEM_PRESTADOR) {
        return ['ok' => false, 'mensagem' => 'Esta acao so vale para servicos oferecidos por prestadores.'];
    }

    if ($servico['status'] !== STATUS_SERVICO_ATIVO && $servico['status'] !== 'em_andamento') {
        return ['ok' => false, 'mensagem' => 'Este servico nao esta disponivel para solicitacao.'];
    }

    $idPrestador = (int) $servico['id_prestador'];
    if ($idPrestador === $idCliente && !ehAdmin()) {
        return ['ok' => false, 'mensagem' => 'Voce nao pode solicitar o proprio servico.'];
    }

    if (existeNegociacaoAtiva($conexao, $idServico, $idCliente)) {
        return ['ok' => false, 'mensagem' => 'Ja existe uma solicitacao ou servico em andamento para este anuncio.'];
    }

    $titulo = trim($dados['titulo'] ?? '');
    $descricao = trim($dados['descricao'] ?? '');
    $categoria = trim($dados['categoria'] ?? '');
    $localidade = trim($dados['localidade'] ?? '');
    $valor = isset($dados['valor']) ? (float) $dados['valor'] : 0;

    if ($titulo === '' || $descricao === '' || $categoria === '' || $localidade === '') {
        return ['ok' => false, 'mensagem' => 'Preencha titulo, descricao, categoria e localidade da solicitacao.'];
    }

    $stmt = $conexao->prepare(
        "INSERT INTO negociacao_servico (
            id_servico, id_cliente, id_prestador, id_iniciador, tipo_iniciativa, status,
            titulo_mensagem, descricao_mensagem, categoria_mensagem, valor_proposto, localidade_mensagem
        ) VALUES (?, ?, ?, ?, 'cliente_solicita', 'pendente', ?, ?, ?, ?, ?)"
    );
    $stmt->bind_param(
        'iiiisssds',
        $idServico,
        $idCliente,
        $idPrestador,
        $idCliente,
        $titulo,
        $descricao,
        $categoria,
        $valor,
        $localidade
    );
    $stmt->execute();
    $idNegociacao = (int) $conexao->insert_id;
    $stmt->close();

    $cliente = carregarUsuarioResumo($conexao, $idCliente);
    $nomeCliente = $cliente['nome'] ?? 'Um cliente';

    $mensagemNotif = "{$nomeCliente} enviou uma solicitacao para o servico \"{$servico['titulo']}\".\n\n"
        . "Assunto: {$titulo}\n"
        . "Categoria: {$categoria}\n"
        . "Local: {$localidade}\n"
        . "Orcamento sugerido: " . ($valor > 0 ? 'R$ ' . number_format($valor, 2, ',', '.') : 'A negociar') . "\n\n"
        . "Detalhes:\n{$descricao}";

    criarNotificacao(
        $conexao,
        $idPrestador,
        $idCliente,
        $idNegociacao,
        NOTIF_SOLICITACAO,
        'Nova solicitacao de servico',
        $mensagemNotif
    );

    return [
        'ok' => true,
        'mensagem' => 'Solicitacao enviada. O prestador foi notificado no perfil dele.',
        'id_negociacao' => $idNegociacao,
    ];
}

function criarPropostaPrestador(mysqli $conexao, int $idPrestador, int $idServico, string $mensagemOpcional = ''): array
{
    if (!usuarioTemTipo(['prestador', 'admin'])) {
        return ['ok' => false, 'mensagem' => 'Apenas prestadores podem aceitar trabalhos nesta aba.'];
    }

    $servico = carregarServicoParaFluxo($conexao, $idServico);
    if ($servico === null) {
        return ['ok' => false, 'mensagem' => 'Chamado nao encontrado.'];
    }

    if ($servico['origem'] !== ORIGEM_CLIENTE) {
        return ['ok' => false, 'mensagem' => 'Esta acao so vale para chamados de contratantes.'];
    }

    if ($servico['status'] !== STATUS_SERVICO_ATIVO) {
        return ['ok' => false, 'mensagem' => 'Este chamado nao esta disponivel.'];
    }

    $idCliente = (int) $servico['id_prestador'];
    if ($idCliente === $idPrestador && !ehAdmin()) {
        return ['ok' => false, 'mensagem' => 'Voce nao pode aceitar o proprio chamado.'];
    }

    if (existeNegociacaoAtiva($conexao, $idServico, $idPrestador)) {
        return ['ok' => false, 'mensagem' => 'Ja existe uma proposta ou servico em andamento para este chamado.'];
    }

    $descricao = trim($mensagemOpcional);
    if ($descricao === '') {
        $descricao = 'Prestador demonstrou interesse em realizar este trabalho.';
    }

    $stmt = $conexao->prepare(
        "INSERT INTO negociacao_servico (
            id_servico, id_cliente, id_prestador, id_iniciador, tipo_iniciativa, status, descricao_mensagem
        ) VALUES (?, ?, ?, ?, 'prestador_proposta', 'pendente', ?)"
    );
    $stmt->bind_param('iiiis', $idServico, $idCliente, $idPrestador, $idPrestador, $descricao);
    $stmt->execute();
    $idNegociacao = (int) $conexao->insert_id;
    $stmt->close();

    $prestador = carregarUsuarioResumo($conexao, $idPrestador);
    $nomePrestador = $prestador['nome'] ?? 'Um prestador';

    criarNotificacao(
        $conexao,
        $idCliente,
        $idPrestador,
        $idNegociacao,
        NOTIF_PROPOSTA,
        'Proposta de trabalho',
        "{$nomePrestador} aceita trabalhar para voce no chamado \"{$servico['titulo']}\".\n\n{$descricao}"
    );

    return [
        'ok' => true,
        'mensagem' => 'Proposta enviada. O contratante foi notificado no perfil dele.',
        'id_negociacao' => $idNegociacao,
    ];
}

function carregarNegociacao(mysqli $conexao, int $idNegociacao): ?array
{
    $sql = "
        SELECT n.*, s.titulo AS servico_titulo, s.origem AS servico_origem, s.status AS servico_status
        FROM negociacao_servico n
        INNER JOIN servico s ON s.id = n.id_servico
        WHERE n.id = ?
    ";
    $stmt = $conexao->prepare($sql);
    $stmt->bind_param('i', $idNegociacao);
    $stmt->execute();
    $resultado = $stmt->get_result();
    $neg = $resultado->num_rows > 0 ? $resultado->fetch_assoc() : null;
    $stmt->close();

    return $neg;
}

function usuarioParticipaNegociacao(array $negociacao, int $idUsuario): bool
{
    return in_array($idUsuario, [
        (int) $negociacao['id_cliente'],
        (int) $negociacao['id_prestador'],
    ], true);
}

function responderNegociacaoPendente(mysqli $conexao, int $idUsuario, int $idNegociacao, string $resposta): array
{
    $neg = carregarNegociacao($conexao, $idNegociacao);
    if ($neg === null) {
        return ['ok' => false, 'mensagem' => 'Negociacao nao encontrada.'];
    }

    if ($neg['status'] !== NEG_STATUS_PENDENTE) {
        return ['ok' => false, 'mensagem' => 'Esta solicitacao ja foi respondida.'];
    }

    $idDestinatario = (int) $neg['id_prestador'];
    if ($neg['tipo_iniciativa'] === 'prestador_proposta') {
        $idDestinatario = (int) $neg['id_cliente'];
    }

    if ($idUsuario !== $idDestinatario && !ehAdmin()) {
        return ['ok' => false, 'mensagem' => 'Voce nao pode responder esta solicitacao.'];
    }

    $resposta = strtolower(trim($resposta));
    if (!in_array($resposta, ['aceitar', 'recusar'], true)) {
        return ['ok' => false, 'mensagem' => 'Resposta invalida.'];
    }

    $respondente = carregarUsuarioResumo($conexao, $idUsuario);
    $nomeRespondente = $respondente['nome'] ?? 'Usuario';

    if ($resposta === 'recusar') {
        $stmt = $conexao->prepare("UPDATE negociacao_servico SET status = 'recusada' WHERE id = ?");
        $stmt->bind_param('i', $idNegociacao);
        $stmt->execute();
        $stmt->close();

        marcarNotificacoesNegociacaoRespondidas($conexao, $idNegociacao, $resposta);

        $idIniciador = (int) $neg['id_iniciador'];
        criarNotificacao(
            $conexao,
            $idIniciador,
            $idUsuario,
            $idNegociacao,
            NOTIF_RECUSADA,
            'Solicitacao recusada',
            "{$nomeRespondente} recusou sua solicitacao sobre \"{$neg['servico_titulo']}\".",
            false
        );

        return ['ok' => true, 'mensagem' => 'Solicitacao recusada.'];
    }

    $stmt = $conexao->prepare("UPDATE negociacao_servico SET status = 'em_andamento' WHERE id = ?");
    $stmt->bind_param('i', $idNegociacao);
    $stmt->execute();
    $stmt->close();

    $stmt = $conexao->prepare("UPDATE servico SET status = 'em_andamento' WHERE id = ?");
    $idServico = (int) $neg['id_servico'];
    $stmt->bind_param('i', $idServico);
    $stmt->execute();
    $stmt->close();

    marcarNotificacoesNegociacaoRespondidas($conexao, $idNegociacao, $resposta);

    $idIniciador = (int) $neg['id_iniciador'];
    criarNotificacao(
        $conexao,
        $idIniciador,
        $idUsuario,
        $idNegociacao,
        NOTIF_ACEITA,
        'Solicitacao aceita',
        "{$nomeRespondente} aceitou. O servico \"{$neg['servico_titulo']}\" esta em andamento.",
        false
    );

    enviarNotificacoesFinalizacao($conexao, $neg);

    return ['ok' => true, 'mensagem' => 'Solicitacao aceita. Servico em andamento.'];
}

function enviarNotificacoesFinalizacao(mysqli $conexao, array $neg): void
{
    $tituloServico = $neg['servico_titulo'] ?? 'servico';
    $idNeg = (int) $neg['id'];
    $idCliente = (int) $neg['id_cliente'];
    $idPrestador = (int) $neg['id_prestador'];

    criarNotificacao(
        $conexao,
        $idCliente,
        $idPrestador,
        $idNeg,
        NOTIF_FINALIZACAO,
        'Servico finalizado?',
        "Seu servico \"{$tituloServico}\" foi marcado como finalizado. Confirme se o trabalho foi concluido (Sim ou Nao encerra o atendimento)."
    );

    criarNotificacao(
        $conexao,
        $idPrestador,
        $idCliente,
        $idNeg,
        NOTIF_FINALIZACAO,
        'Voce finalizou o servico?',
        "O servico \"{$tituloServico}\" esta em encerramento. Confirme se voce finalizou o trabalho (Sim ou Nao encerra o atendimento)."
    );
}

function marcarNotificacoesNegociacaoRespondidas(mysqli $conexao, int $idNegociacao, string $resposta): void
{
    $stmt = $conexao->prepare(
        "UPDATE notificacao SET respondida = 1, resposta = ?, lida = 1
         WHERE id_negociacao = ? AND requer_acao = 1 AND respondida = 0
           AND tipo IN ('solicitacao_servico', 'proposta_trabalho')"
    );
    $stmt->bind_param('si', $resposta, $idNegociacao);
    $stmt->execute();
    $stmt->close();
}

function responderFinalizacao(mysqli $conexao, int $idUsuario, int $idNotificacao, string $resposta): array
{
    $notif = carregarNotificacao($conexao, $idNotificacao);
    if ($notif === null) {
        return ['ok' => false, 'mensagem' => 'Notificacao nao encontrada.'];
    }

    if ((int) $notif['id_usuario'] !== $idUsuario && !ehAdmin()) {
        return ['ok' => false, 'mensagem' => 'Notificacao invalida.'];
    }

    if ($notif['tipo'] !== NOTIF_FINALIZACAO || (int) $notif['respondida'] === 1) {
        return ['ok' => false, 'mensagem' => 'Esta notificacao ja foi respondida.'];
    }

    $resposta = strtolower(trim($resposta));
    if (!in_array($resposta, ['sim', 'nao'], true)) {
        return ['ok' => false, 'mensagem' => 'Escolha Sim ou Nao.'];
    }

    $idNeg = (int) $notif['id_negociacao'];
    $neg = carregarNegociacao($conexao, $idNeg);
    if ($neg === null || $neg['status'] !== NEG_STATUS_EM_ANDAMENTO) {
        return ['ok' => false, 'mensagem' => 'Servico nao esta em andamento.'];
    }

    if ((int) $neg['id_cliente'] === $idUsuario) {
        $campo = 'finalizado_resposta_cliente';
    } elseif ((int) $neg['id_prestador'] === $idUsuario) {
        $campo = 'finalizado_resposta_prestador';
    } elseif (!ehAdmin()) {
        return ['ok' => false, 'mensagem' => 'Voce nao participa deste servico.'];
    } else {
        $campo = 'finalizado_resposta_cliente';
    }

    $sql = "UPDATE negociacao_servico SET {$campo} = ? WHERE id = ?";
    $stmt = $conexao->prepare($sql);
    $stmt->bind_param('si', $resposta, $idNeg);
    $stmt->execute();
    $stmt->close();

    $stmt = $conexao->prepare(
        'UPDATE notificacao SET respondida = 1, resposta = ?, lida = 1 WHERE id = ?'
    );
    $stmt->bind_param('si', $resposta, $idNotificacao);
    $stmt->execute();
    $stmt->close();

    $stmt = $conexao->prepare(
        "UPDATE notificacao SET respondida = 1, lida = 1
         WHERE id_negociacao = ? AND tipo = 'confirmar_finalizacao' AND respondida = 0"
    );
    $stmt->bind_param('i', $idNeg);
    $stmt->execute();
    $stmt->close();

    finalizarNegociacaoSeNecessario($conexao, $idNeg);

    return ['ok' => true, 'mensagem' => 'Resposta registrada.'];
}

function finalizarNegociacaoSeNecessario(mysqli $conexao, int $idNegociacao): void
{
    $neg = carregarNegociacao($conexao, $idNegociacao);
    if ($neg === null || $neg['status'] !== NEG_STATUS_EM_ANDAMENTO) {
        return;
    }

    $respCliente = $neg['finalizado_resposta_cliente'] ?? null;
    $respPrestador = $neg['finalizado_resposta_prestador'] ?? null;

    if ($respCliente === null && $respPrestador === null) {
        return;
    }

    $stmt = $conexao->prepare("UPDATE negociacao_servico SET status = 'finalizada' WHERE id = ?");
    $stmt->bind_param('i', $idNegociacao);
    $stmt->execute();
    $stmt->close();

    $idServico = (int) $neg['id_servico'];
    $stmt = $conexao->prepare("UPDATE servico SET status = 'concluido' WHERE id = ?");
    $stmt->bind_param('i', $idServico);
    $stmt->execute();
    $stmt->close();

    enviarNotificacoesAvaliacao($conexao, $neg);
}

function enviarNotificacoesAvaliacao(mysqli $conexao, array $neg): void
{
    $titulo = $neg['servico_titulo'] ?? 'servico';
    $idNeg = (int) $neg['id'];
    $idCliente = (int) $neg['id_cliente'];
    $idPrestador = (int) $neg['id_prestador'];

    if (!usuarioJaAvaliou($conexao, $idNeg, $idCliente, $idPrestador)) {
        criarNotificacao(
            $conexao,
            $idCliente,
            $idPrestador,
            $idNeg,
            NOTIF_AVALIAR,
            'Avalie o prestador',
            "O servico \"{$titulo}\" foi concluido. Avalie o profissional que voce contratou.",
            true
        );
    }

    if (!usuarioJaAvaliou($conexao, $idNeg, $idPrestador, $idCliente)) {
        criarNotificacao(
            $conexao,
            $idPrestador,
            $idCliente,
            $idNeg,
            NOTIF_AVALIAR,
            'Avalie o cliente',
            "O servico \"{$titulo}\" foi concluido. Avalie o cliente com quem voce trabalhou.",
            true
        );
    }
}

function usuarioJaAvaliou(mysqli $conexao, int $idNegociacao, int $idAvaliador, int $idAvaliado): bool
{
    $stmt = $conexao->prepare(
        'SELECT id FROM avaliacao WHERE id_negociacao = ? AND id_avaliador = ? AND id_avaliado = ? LIMIT 1'
    );
    $stmt->bind_param('iii', $idNegociacao, $idAvaliador, $idAvaliado);
    $stmt->execute();
    $existe = $stmt->get_result()->num_rows > 0;
    $stmt->close();

    return $existe;
}

function carregarNotificacao(mysqli $conexao, int $idNotificacao): ?array
{
    $stmt = $conexao->prepare('SELECT * FROM notificacao WHERE id = ?');
    $stmt->bind_param('i', $idNotificacao);
    $stmt->execute();
    $resultado = $stmt->get_result();
    $notif = $resultado->num_rows > 0 ? $resultado->fetch_assoc() : null;
    $stmt->close();

    return $notif;
}

function listarNotificacoesUsuario(mysqli $conexao, int $idUsuario): array
{
    $sql = "
        SELECT
            n.id,
            n.id_negociacao,
            n.id_remetente,
            n.tipo,
            n.titulo,
            n.mensagem,
            n.requer_acao,
            n.respondida,
            n.resposta,
            n.lida,
            n.created_at,
            u.nome AS nome_remetente,
            u.username AS username_remetente,
            u.tipo AS tipo_remetente,
            u.foto AS foto_remetente,
            neg.id_servico,
            s.titulo AS servico_titulo
        FROM notificacao n
        INNER JOIN usuario u ON u.id = n.id_remetente
        LEFT JOIN negociacao_servico neg ON neg.id = n.id_negociacao
        LEFT JOIN servico s ON s.id = neg.id_servico
        WHERE n.id_usuario = ?
        ORDER BY n.created_at DESC, n.id DESC
        LIMIT 100
    ";
    $stmt = $conexao->prepare($sql);
    $stmt->bind_param('i', $idUsuario);
    $stmt->execute();
    $resultado = $stmt->get_result();

    $lista = [];
    while ($linha = $resultado->fetch_assoc()) {
        $linha['acoes'] = obterAcoesNotificacao($linha);
        $lista[] = $linha;
    }

    $stmt->close();
    return $lista;
}

function obterAcoesNotificacao(array $notif): array
{
    if ((int) $notif['respondida'] === 1 || (int) $notif['requer_acao'] === 0) {
        return [];
    }

    switch ($notif['tipo']) {
        case NOTIF_SOLICITACAO:
        case NOTIF_PROPOSTA:
            return ['aceitar', 'recusar'];
        case NOTIF_FINALIZACAO:
            return ['sim', 'nao'];
        case NOTIF_AVALIAR:
            return ['avaliar'];
        default:
            return [];
    }
}

function registrarAvaliacao(mysqli $conexao, int $idAvaliador, array $dados): array
{
    $idNegociacao = (int) ($dados['id_negociacao'] ?? 0);
    $idAvaliado = (int) ($dados['id_avaliado'] ?? 0);
    $nota = (int) ($dados['nota'] ?? 0);
    $comentario = trim($dados['comentario'] ?? '');

    if ($idNegociacao <= 0 || $idAvaliado <= 0) {
        return ['ok' => false, 'mensagem' => 'Dados de avaliacao invalidos.'];
    }

    if ($nota < 1 || $nota > 5) {
        return ['ok' => false, 'mensagem' => 'A nota deve ser entre 1 e 5.'];
    }

    $neg = carregarNegociacao($conexao, $idNegociacao);
    if ($neg === null || $neg['status'] !== NEG_STATUS_FINALIZADA) {
        return ['ok' => false, 'mensagem' => 'So e possivel avaliar apos o servico ser concluido.'];
    }

    if (!usuarioParticipaNegociacao($neg, $idAvaliador)) {
        return ['ok' => false, 'mensagem' => 'Voce nao participou deste servico.'];
    }

    $participantes = [(int) $neg['id_cliente'], (int) $neg['id_prestador']];
    if (!in_array($idAvaliado, $participantes, true) || $idAvaliado === $idAvaliador) {
        return ['ok' => false, 'mensagem' => 'Usuario avaliado invalido.'];
    }

    if (usuarioJaAvaliou($conexao, $idNegociacao, $idAvaliador, $idAvaliado)) {
        return ['ok' => false, 'mensagem' => 'Voce ja avaliou este usuario neste servico.'];
    }

    $idServico = (int) $neg['id_servico'];

    $stmt = $conexao->prepare(
        'INSERT INTO avaliacao (id_servico, id_negociacao, id_avaliador, id_avaliado, nota, comentario)
         VALUES (?, ?, ?, ?, ?, ?)'
    );
    $stmt->bind_param('iiiiss', $idServico, $idNegociacao, $idAvaliador, $idAvaliado, $nota, $comentario);
    $stmt->execute();
    $stmt->close();

    atualizarNotaMediaPrestador($conexao, $idAvaliado);

    $stmt = $conexao->prepare(
        "UPDATE notificacao SET respondida = 1, resposta = 'avaliado', lida = 1
         WHERE id_usuario = ? AND id_negociacao = ? AND tipo = 'avaliar' AND respondida = 0"
    );
    $stmt->bind_param('ii', $idAvaliador, $idNegociacao);
    $stmt->execute();
    $stmt->close();

    return ['ok' => true, 'mensagem' => 'Avaliacao registrada com sucesso.'];
}

function atualizarNotaMediaPrestador(mysqli $conexao, int $idUsuario): void
{
    $stmt = $conexao->prepare(
        'SELECT AVG(nota) AS media FROM avaliacao WHERE id_avaliado = ?'
    );
    $stmt->bind_param('i', $idUsuario);
    $stmt->execute();
    $row = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    $media = round((float) ($row['media'] ?? 0), 2);

    $stmt = $conexao->prepare(
        'UPDATE perfil_prestador SET nota_media = ? WHERE id_usuario = ?'
    );
    $stmt->bind_param('di', $media, $idUsuario);
    $stmt->execute();
    $stmt->close();
}

function contarNotificacoesPendentes(mysqli $conexao, int $idUsuario): int
{
    $stmt = $conexao->prepare(
        'SELECT COUNT(*) AS total FROM notificacao
         WHERE id_usuario = ? AND requer_acao = 1 AND respondida = 0'
    );
    $stmt->bind_param('i', $idUsuario);
    $stmt->execute();
    $row = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    return (int) ($row['total'] ?? 0);
}
