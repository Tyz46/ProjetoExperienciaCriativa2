CREATE DATABASE pf;
USE pf;

-- USUÁRIOS

CREATE TABLE usuario (
    id INT AUTO_INCREMENT PRIMARY KEY,

    nome VARCHAR(150) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    telefone VARCHAR(20) NOT NULL,

    username VARCHAR(50) NOT NULL UNIQUE,
    senha_hash VARCHAR(255) NOT NULL,

    -- Comentado: campo adicional de texto pedro para ser salvo e exibido no site
    -- pedro VARCHAR(255) NULL,

    tipo ENUM(
        'cliente',
        'prestador',
        'admin'
    ) NOT NULL DEFAULT 'cliente',

    foto VARCHAR(255) NULL,

    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP
);

-- PERFIL DO PRESTADOR

CREATE TABLE perfil_prestador (
    id INT AUTO_INCREMENT PRIMARY KEY,

    id_usuario INT NOT NULL UNIQUE,

    profissao VARCHAR(100) NOT NULL,
    descricao TEXT NULL,
    localidade VARCHAR(100) NOT NULL,

    nota_media DECIMAL(3,2) DEFAULT 0,

    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (id_usuario)
        REFERENCES usuario(id)
        ON DELETE CASCADE
);

-- SERVIÇOS

CREATE TABLE servico (
    id INT AUTO_INCREMENT PRIMARY KEY,

    id_prestador INT NOT NULL,

    titulo VARCHAR(150) NOT NULL,
    descricao TEXT NOT NULL,

    categoria VARCHAR(100) NOT NULL,

    valor DECIMAL(10,2) NOT NULL,

    origem ENUM(
        'cliente',
        'prestador'
    ) NOT NULL,

    status ENUM(
        'ativo',
        'em_andamento',
        'concluido',
        'cancelado',
        'pausado'
    ) DEFAULT 'ativo',

    localidade VARCHAR(100) NOT NULL,

    -- Comentado: campo adicional de texto pedro para ser salvo e exibido no card
    pedro VARCHAR(255) NULL,

    foto VARCHAR(255) NULL,

    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (id_prestador)
        REFERENCES usuario(id)
        ON DELETE CASCADE
);

-- HABILIDADES

CREATE TABLE habilidade (
    id INT AUTO_INCREMENT PRIMARY KEY,

    nome VARCHAR(100) NOT NULL UNIQUE
);

-- RELAÇÃO SERVIÇO x HABILIDADE

CREATE TABLE servico_habilidade (
    id_servico INT NOT NULL,
    id_habilidade INT NOT NULL,

    PRIMARY KEY (id_servico, id_habilidade),

    FOREIGN KEY (id_servico)
        REFERENCES servico(id)
        ON DELETE CASCADE,

    FOREIGN KEY (id_habilidade)
        REFERENCES habilidade(id)
        ON DELETE CASCADE
);

-- NEGOCIAÇÃO (fluxo cliente ↔ prestador antes da avaliação)

CREATE TABLE negociacao_servico (
    id INT AUTO_INCREMENT PRIMARY KEY,

    id_servico INT NOT NULL,
    id_cliente INT NOT NULL,
    id_prestador INT NOT NULL,
    id_iniciador INT NOT NULL,

    tipo_iniciativa ENUM(
        'cliente_solicita',
        'prestador_proposta'
    ) NOT NULL,

    status ENUM(
        'pendente',
        'aceita',
        'recusada',
        'em_andamento',
        'finalizada'
    ) NOT NULL DEFAULT 'pendente',

    titulo_mensagem VARCHAR(150) NULL,
    descricao_mensagem TEXT NULL,
    categoria_mensagem VARCHAR(100) NULL,
    valor_proposto DECIMAL(10,2) NULL,
    localidade_mensagem VARCHAR(100) NULL,

    finalizado_resposta_cliente ENUM('sim', 'nao') NULL,
    finalizado_resposta_prestador ENUM('sim', 'nao') NULL,

    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (id_servico)
        REFERENCES servico(id)
        ON DELETE CASCADE,

    FOREIGN KEY (id_cliente)
        REFERENCES usuario(id)
        ON DELETE CASCADE,

    FOREIGN KEY (id_prestador)
        REFERENCES usuario(id)
        ON DELETE CASCADE,

    FOREIGN KEY (id_iniciador)
        REFERENCES usuario(id)
        ON DELETE CASCADE
);

-- NOTIFICAÇÕES (mensagens no perfil)

CREATE TABLE notificacao (
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

    FOREIGN KEY (id_usuario)
        REFERENCES usuario(id)
        ON DELETE CASCADE,

    FOREIGN KEY (id_negociacao)
        REFERENCES negociacao_servico(id)
        ON DELETE CASCADE,

    FOREIGN KEY (id_remetente)
        REFERENCES usuario(id)
        ON DELETE CASCADE
);

-- AVALIAÇÕES

CREATE TABLE avaliacao (
    id INT AUTO_INCREMENT PRIMARY KEY,

    id_servico INT NOT NULL,
    id_negociacao INT NULL,

    id_avaliador INT NOT NULL,
    id_avaliado INT NOT NULL,

    nota TINYINT NOT NULL,

    comentario TEXT NULL,

    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    UNIQUE KEY uk_avaliacao_servico_avaliador (id_servico, id_avaliador),

    FOREIGN KEY (id_servico)
        REFERENCES servico(id)
        ON DELETE CASCADE,

    FOREIGN KEY (id_negociacao)
        REFERENCES negociacao_servico(id)
        ON DELETE SET NULL,

    FOREIGN KEY (id_avaliador)
        REFERENCES usuario(id)
        ON DELETE CASCADE,

    FOREIGN KEY (id_avaliado)
        REFERENCES usuario(id)
        ON DELETE CASCADE
);

-- ÍNDICES

CREATE INDEX idx_usuario_email ON usuario(email);
CREATE INDEX idx_usuario_tipo ON usuario(tipo);
CREATE INDEX idx_servico_categoria ON servico(categoria);
CREATE INDEX idx_servico_status ON servico(status);
CREATE INDEX idx_servico_localidade ON servico(localidade);
CREATE INDEX idx_negociacao_servico ON negociacao_servico(id_servico);
CREATE INDEX idx_negociacao_status ON negociacao_servico(status);
CREATE INDEX idx_notificacao_usuario ON notificacao(id_usuario);
CREATE INDEX idx_notificacao_pendente ON notificacao(id_usuario, respondida);

-- DISPONIBILIDADE DO PRESTADOR

CREATE TABLE prestador_disponibilidade (
    id INT AUTO_INCREMENT PRIMARY KEY,

    id_prestador INT NOT NULL,

    data_inicio DATE NOT NULL,
    hora_inicio TIME NOT NULL,

    data_fim DATE NOT NULL,
    hora_fim TIME NOT NULL,

    status ENUM('ocupado', 'disponivel') NOT NULL DEFAULT 'ocupado',

    descricao TEXT NULL,

    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (id_prestador)
        REFERENCES usuario(id)
        ON DELETE CASCADE,

    UNIQUE KEY uk_disponibilidade_periodo (id_prestador, data_inicio, hora_inicio, data_fim, hora_fim)
);

CREATE INDEX idx_prestador_disponibilidade ON prestador_disponibilidade(id_prestador);
CREATE INDEX idx_prestador_data ON prestador_disponibilidade(id_prestador, data_inicio);

-- Conta admin inicial (senha: admin123 — troque após o primeiro login)
INSERT INTO usuario (nome, email, telefone, username, senha_hash, tipo)
VALUES (
    'Administrador',
    'admin@consertaja.local',
    '00000000000',
    'admin',
    'admin123',
    'admin'
);
