-- Migração: fluxo de solicitação, notificações e avaliações
-- Execute no banco pf após o schema base (banco.sql)

USE pf;

CREATE TABLE IF NOT EXISTS negociacao_servico (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_servico INT NOT NULL,
    id_cliente INT NOT NULL,
    id_prestador INT NOT NULL,
    id_iniciador INT NOT NULL,
    tipo_iniciativa ENUM('cliente_solicita', 'prestador_proposta') NOT NULL,
    status ENUM('pendente', 'aceita', 'recusada', 'em_andamento', 'finalizada') NOT NULL DEFAULT 'pendente',
    titulo_mensagem VARCHAR(150) NULL,
    descricao_mensagem TEXT NULL,
    categoria_mensagem VARCHAR(100) NULL,
    valor_proposto DECIMAL(10,2) NULL,
    localidade_mensagem VARCHAR(100) NULL,
    finalizado_resposta_cliente ENUM('sim', 'nao') NULL,
    finalizado_resposta_prestador ENUM('sim', 'nao') NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (id_servico) REFERENCES servico(id) ON DELETE CASCADE,
    FOREIGN KEY (id_cliente) REFERENCES usuario(id) ON DELETE CASCADE,
    FOREIGN KEY (id_prestador) REFERENCES usuario(id) ON DELETE CASCADE,
    FOREIGN KEY (id_iniciador) REFERENCES usuario(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS notificacao (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_usuario INT NOT NULL,
    id_negociacao INT NULL,
    id_remetente INT NOT NULL,
    tipo ENUM(
        'solicitacao_servico',
        'proposta_trabalho',
        'resposta_aceita',
        'resposta_recusada',
        'confirmar_finalizacao',
        'avaliar'
    ) NOT NULL,
    titulo VARCHAR(200) NOT NULL,
    mensagem TEXT NOT NULL,
    requer_acao TINYINT NOT NULL DEFAULT 1,
    respondida TINYINT NOT NULL DEFAULT 0,
    resposta VARCHAR(50) NULL,
    lida TINYINT NOT NULL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_usuario) REFERENCES usuario(id) ON DELETE CASCADE,
    FOREIGN KEY (id_negociacao) REFERENCES negociacao_servico(id) ON DELETE CASCADE,
    FOREIGN KEY (id_remetente) REFERENCES usuario(id) ON DELETE CASCADE
);

CREATE INDEX idx_negociacao_servico ON negociacao_servico(id_servico);
CREATE INDEX idx_negociacao_status ON negociacao_servico(status);
CREATE INDEX idx_notificacao_usuario ON notificacao(id_usuario);
CREATE INDEX idx_notificacao_pendente ON notificacao(id_usuario, respondida);

-- Se a coluna id_negociacao ainda nao existir em avaliacao:
ALTER TABLE avaliacao ADD COLUMN id_negociacao INT NULL AFTER id_servico;

-- Se a unique key ja existir, comente a linha abaixo:
ALTER TABLE avaliacao ADD UNIQUE KEY uk_avaliacao_servico_avaliador (id_servico, id_avaliador);
