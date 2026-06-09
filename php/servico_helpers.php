<?php

// Constantes compartilhadas para diferenciar anuncios de prestadores e chamados de clientes.
const ORIGEM_PRESTADOR = 'prestador';
const ORIGEM_CLIENTE = 'cliente';
const STATUS_SERVICO_ATIVO = 'ativo';

/**
 * Monta o SELECT base de servicos com os joins mais usados nas listagens.
 * Os endpoints complementam esta query com WHERE/ORDER BY conforme o contexto.
 */
function sqlSelectServicoComUsuario(): string
{
    return "
        SELECT
            s.id,
            s.id_prestador AS id_usuario,
            s.titulo AS nome,
            s.descricao,
            s.categoria AS tipo,
            s.valor,
            s.localidade,
            s.foto,
            s.origem,
            s.status,
            DATE_FORMAT(s.created_at, '%Y-%m-%dT%H:%i:%s') AS created_at,
            u.nome AS nome_usuario,
            pp.profissao,
            pp.descricao AS descricao_especialidades,
            COALESCE(pp.nota_media, aval.nota_media, 0) AS nota_media
        FROM servico s
        LEFT JOIN usuario u ON u.id = s.id_prestador
        LEFT JOIN perfil_prestador pp ON pp.id_usuario = s.id_prestador
        LEFT JOIN (
            SELECT id_avaliado, ROUND(AVG(nota), 1) AS nota_media
            FROM avaliacao
            GROUP BY id_avaliado
        ) aval ON aval.id_avaliado = s.id_prestador
    ";
}

/**
 * Enriquece as linhas retornadas do banco com dados prontos para o frontend:
 * habilidades em JSON e foto sempre em formato de lista.
 */
function enriquecerLinhasServico(mysqli $conexao, array &$linhas): void
{
    foreach ($linhas as &$linha) {
        $linha['habilidades'] = json_encode(
            listarNomesHabilidadesServico($conexao, (int) $linha['id']),
            JSON_UNESCAPED_UNICODE
        );
        $linha['foto'] = fotoServicoParaJson($linha['foto'] ?? null);
    }
    unset($linha);
}

/**
 * Garante que o campo foto saia sempre como JSON, mesmo quando o banco guarda so uma string.
 */
function fotoServicoParaJson(?string $foto): ?string
{
    if ($foto === null || $foto === '') {
        return null;
    }

    if ($foto[0] === '[') {
        return $foto;
    }

    return json_encode([$foto], JSON_UNESCAPED_SLASHES);
}

/**
 * Extrai a primeira imagem de um campo que pode estar salvo como string ou lista JSON.
 */
function extrairPrimeiraFoto(?string $foto): ?string
{
    if ($foto === null || $foto === '') {
        return null;
    }

    if ($foto[0] === '[') {
        $lista = json_decode($foto, true);
        if (is_array($lista) && !empty($lista[0])) {
            return (string) $lista[0];
        }

        return null;
    }

    return $foto;
}

/**
 * Busca todas as habilidades ligadas a um servico.
 */
function listarNomesHabilidadesServico(mysqli $conexao, int $idServico): array
{
    $sql = "
        SELECT h.nome
        FROM servico_habilidade sh
        INNER JOIN habilidade h ON h.id = sh.id_habilidade
        WHERE sh.id_servico = ?
        ORDER BY h.nome
    ";
    $stmt = $conexao->prepare($sql);
    if (!$stmt) {
        return [];
    }

    $stmt->bind_param('i', $idServico);
    $stmt->execute();
    $resultado = $stmt->get_result();
    $nomes = [];

    while ($linha = $resultado->fetch_assoc()) {
        $nomes[] = $linha['nome'];
    }

    $stmt->close();
    return $nomes;
}

/**
 * Reaproveita uma habilidade existente ou cria uma nova quando ainda nao existe.
 */
function obterOuCriarHabilidadeId(mysqli $conexao, string $nome): ?int
{
    $nome = trim($nome);
    if ($nome === '') {
        return null;
    }

    $stmt = $conexao->prepare('SELECT id FROM habilidade WHERE nome = ?');
    $stmt->bind_param('s', $nome);
    $stmt->execute();
    $resultado = $stmt->get_result();

    if ($resultado->num_rows > 0) {
        $id = (int) $resultado->fetch_assoc()['id'];
        $stmt->close();
        return $id;
    }
    $stmt->close();

    $stmtInsert = $conexao->prepare('INSERT INTO habilidade (nome) VALUES (?)');
    $stmtInsert->bind_param('s', $nome);
    if (!$stmtInsert->execute()) {
        $stmtInsert->close();
        return null;
    }

    $id = (int) $conexao->insert_id;
    $stmtInsert->close();
    return $id;
}

/**
 * Substitui a lista de habilidades de um servico pela lista recebida no formulario.
 */
function sincronizarHabilidadesServico(mysqli $conexao, int $idServico, array $nomesHabilidades): void
{
    $stmtDelete = $conexao->prepare('DELETE FROM servico_habilidade WHERE id_servico = ?');
    $stmtDelete->bind_param('i', $idServico);
    $stmtDelete->execute();
    $stmtDelete->close();

    $stmtInsert = $conexao->prepare(
        'INSERT INTO servico_habilidade (id_servico, id_habilidade) VALUES (?, ?)'
    );

    foreach ($nomesHabilidades as $nome) {
        $idHabilidade = obterOuCriarHabilidadeId($conexao, $nome);
        if ($idHabilidade === null) {
            continue;
        }

        $stmtInsert->bind_param('ii', $idServico, $idHabilidade);
        $stmtInsert->execute();
    }

    $stmtInsert->close();
}

/**
 * Cria ou atualiza o perfil profissional do prestador com os dados mais recentes do servico.
 */
function upsertPerfilPrestador(
    mysqli $conexao,
    int $idUsuario,
    string $profissao,
    string $descricao,
    string $localidade
): void {
    $sql = "
        INSERT INTO perfil_prestador (id_usuario, profissao, descricao, localidade)
        VALUES (?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
            profissao = VALUES(profissao),
            descricao = VALUES(descricao),
            localidade = VALUES(localidade)
    ";
    $stmt = $conexao->prepare($sql);
    $stmt->bind_param('isss', $idUsuario, $profissao, $descricao, $localidade);
    $stmt->execute();
    $stmt->close();
}

/**
 * Salva as fotos enviadas no upload, validando tamanho, extensao e se o arquivo e realmente uma imagem.
 * O retorno e uma lista de caminhos web que podem ser gravados no banco.
 */
function salvarFotosServico(string $prefixoOrigem): array
{
    if (!isset($_FILES['fotos'])) {
        return [];
    }

    $arquivos = $_FILES['fotos'];
    $fotos = [];
    $pastaDestino = dirname(__DIR__) . '/uploads/servicos/';
    $caminhoWeb = '../../../uploads/servicos/';
    $extensoesPermitidas = ['jpg', 'jpeg', 'png', 'gif', 'webp'];

    if (!is_dir($pastaDestino)) {
        mkdir($pastaDestino, 0777, true);
    }

    foreach ($arquivos['name'] as $indice => $nomeOriginal) {
        if ($arquivos['error'][$indice] === UPLOAD_ERR_NO_FILE) {
            continue;
        }

        if ($arquivos['error'][$indice] !== UPLOAD_ERR_OK) {
            continue;
        }

        if ($arquivos['size'][$indice] > 5 * 1024 * 1024) {
            continue;
        }

        $tmpName = $arquivos['tmp_name'][$indice];
        if (!@getimagesize($tmpName)) {
            continue;
        }

        $extensao = strtolower(pathinfo($nomeOriginal, PATHINFO_EXTENSION));
        if (!in_array($extensao, $extensoesPermitidas, true)) {
            continue;
        }

        $nomeArquivo = $prefixoOrigem . '_' . uniqid('', true) . '.' . $extensao;
        if (move_uploaded_file($tmpName, $pastaDestino . $nomeArquivo)) {
            $fotos[] = $caminhoWeb . $nomeArquivo;
        }
    }

    return $fotos;
}

/**
 * Limpa a lista de habilidades recebida do frontend:
 * converte para array, remove vazios e evita duplicados.
 */
function normalizarHabilidades($habilidades): array
{
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
