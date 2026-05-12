USE pf;

ALTER TABLE servico
    ADD COLUMN IF NOT EXISTS id_usuario INT NOT NULL DEFAULT 0 AFTER id,
    ADD COLUMN IF NOT EXISTS origem VARCHAR(20) NOT NULL DEFAULT '' AFTER id_usuario,
    ADD COLUMN IF NOT EXISTS foto TEXT NULL AFTER localidade;

ALTER TABLE servico
    MODIFY COLUMN foto TEXT NULL;

ALTER TABLE servico
    ADD COLUMN IF NOT EXISTS nota_prestador TINYINT NULL AFTER foto,
    ADD COLUMN IF NOT EXISTS comentario_prestador TEXT NULL AFTER nota_prestador,
    ADD COLUMN IF NOT EXISTS nome_avaliador_prestador VARCHAR(150) NULL AFTER comentario_prestador,
    ADD COLUMN IF NOT EXISTS data_avaliacao_prestador DATETIME NULL AFTER nome_avaliador_prestador,
    ADD COLUMN IF NOT EXISTS nota_contratante TINYINT NULL AFTER data_avaliacao_prestador,
    ADD COLUMN IF NOT EXISTS comentario_contratante TEXT NULL AFTER nota_contratante,
    ADD COLUMN IF NOT EXISTS nome_avaliador_contratante VARCHAR(150) NULL AFTER comentario_contratante,
    ADD COLUMN IF NOT EXISTS data_avaliacao_contratante DATETIME NULL AFTER nome_avaliador_contratante;

-- Conta administradora.
INSERT INTO usuario (nome, email, telefone, usuario, senha, tipo)
VALUES ('Administrador', 'admin@consertaja.local', '00000000000', 'adm', 'adm123', 'adm')
ON DUPLICATE KEY UPDATE
    nome = VALUES(nome),
    email = VALUES(email),
    telefone = VALUES(telefone),
    senha = VALUES(senha),
    tipo = VALUES(tipo);
