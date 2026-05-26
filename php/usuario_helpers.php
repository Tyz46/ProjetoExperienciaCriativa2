<?php

/**
 * Traduz nomes antigos do formulario para os tipos usados no banco.
 */
function normalizarTipoCadastro(string $tipo): string
{
    $mapa = [
        'contratante' => 'cliente',
        'adm' => 'admin',
    ];

    return $mapa[$tipo] ?? $tipo;
}

/**
 * Remove campos sensiveis antes de mandar dados do usuario para o frontend ou sessao limpa.
 */
function sanitizarUsuarioSessao(array $usuario): array
{
    unset($usuario['senha_hash'], $usuario['senha']);

    if (isset($usuario['username'])) {
        $usuario['usuario'] = $usuario['username'];
    }

    return $usuario;
}

/**
 * Retorna o tipo do usuario atualmente logado.
 */
function tipoUsuarioLogado(): string
{
    return $_SESSION['usuario']['tipo'] ?? '';
}

/**
 * Atalho para verificar se o usuario atual e administrador.
 */
function ehAdmin(): bool
{
    return tipoUsuarioLogado() === 'admin';
}

/**
 * Verifica se o usuario logado pertence a qualquer um dos tipos permitidos.
 */
function usuarioTemTipo(array $tipos): bool
{
    return in_array(tipoUsuarioLogado(), $tipos, true);
}

/**
 * Retorna o ID do usuario logado como inteiro.
 */
function idUsuarioLogado(): int
{
    return (int) ($_SESSION['usuario']['id'] ?? 0);
}
