USE pf;

ALTER TABLE servico
    ADD COLUMN IF NOT EXISTS profissao VARCHAR(100) NULL AFTER tipo,
    ADD COLUMN IF NOT EXISTS habilidades TEXT NULL AFTER profissao,
    ADD COLUMN IF NOT EXISTS descricao_especialidades TEXT NULL AFTER habilidades;
