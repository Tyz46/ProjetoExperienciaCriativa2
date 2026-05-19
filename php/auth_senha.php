<?php

function hash_senha(string $senha): string
{
    return password_hash($senha, PASSWORD_DEFAULT);
}

/**
 * Aceita senha em hash (bcrypt/argon) ou texto legado em bancos antigos.
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
