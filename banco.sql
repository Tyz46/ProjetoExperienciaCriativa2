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

-- AVALIAÇÕES

CREATE TABLE avaliacao (
    id INT AUTO_INCREMENT PRIMARY KEY,

    id_servico INT NOT NULL,

    id_avaliador INT NOT NULL,
    id_avaliado INT NOT NULL,

    nota TINYINT NOT NULL,

    comentario TEXT NULL,

    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (id_servico)
        REFERENCES servico(id)
        ON DELETE CASCADE,

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
