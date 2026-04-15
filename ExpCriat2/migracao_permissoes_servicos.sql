USE pf;

ALTER TABLE servico
    ADD COLUMN IF NOT EXISTS id_usuario INT NOT NULL DEFAULT 0 AFTER id,
    ADD COLUMN IF NOT EXISTS origem VARCHAR(20) NOT NULL DEFAULT '' AFTER id_usuario,
    ADD COLUMN IF NOT EXISTS foto TEXT NULL AFTER localidade;

ALTER TABLE servico
    MODIFY COLUMN foto TEXT NULL;

-- Conta administradora.
INSERT INTO usuario (nome, email, telefone, usuario, senha, tipo)
VALUES ('Administrador', 'admin@consertaja.local', '00000000000', 'adm', 'adm123', 'adm')
ON DUPLICATE KEY UPDATE
    nome = VALUES(nome),
    email = VALUES(email),
    telefone = VALUES(telefone),
    senha = VALUES(senha),
    tipo = VALUES(tipo);
