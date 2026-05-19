<?php

function normalizarTipoCadastro(string $tipo): string
{
    $mapa = [
        'contratante' => 'cliente',
        'adm' => 'admin',
    ];

    return $mapa[$tipo] ?? $tipo;
}

function sanitizarUsuarioSessao(array $usuario): array
{
    unset($usuario['senha_hash'], $usuario['senha']);

    if (isset($usuario['username'])) {
        $usuario['usuario'] = $usuario['username'];
    }

    return $usuario;
}

function tipoUsuarioLogado(): string
{
    return $_SESSION['usuario']['tipo'] ?? '';
}

function ehAdmin(): bool
{
    return tipoUsuarioLogado() === 'admin';
}

function usuarioTemTipo(array $tipos): bool
{
    return in_array(tipoUsuarioLogado(), $tipos, true);
}

function idUsuarioLogado(): int
{
    return (int) ($_SESSION['usuario']['id'] ?? 0);
}
