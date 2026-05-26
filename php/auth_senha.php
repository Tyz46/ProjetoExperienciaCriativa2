<?php

/**
 * Gera o hash seguro da senha antes de salvar no banco.
 */
function hash_senha(string $senha): string
{
    return password_hash($senha, PASSWORD_DEFAULT);
}

/**
 * Confere a senha informada no login.
 * Aceita hash moderno (bcrypt/argon) e tambem texto puro legado de bases antigas.
 */
function verificar_senha(string $senhaInformada, string $senhaArmazenada): bool
{
    if ($senhaArmazenada === '') {
        return false;
    }

    $info = password_get_info($senhaArmazenada);
    if ($info['algo'] !== 0) {
        return password_verify($senhaInformada, $senhaArmazenada);
    }

    return hash_equals($senhaArmazenada, $senhaInformada);
}
