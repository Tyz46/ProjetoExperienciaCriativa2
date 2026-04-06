CREATE DATABASE pf;
USE pf;

CREATE TABLE usuario(
	id INT PRIMARY KEY AUTO_INCREMENT,
    nome VARCHAR(50),
    email VARCHAR(50),
    telefone INT,
    usuario VARCHAR(50),
    senha VARCHAR(255),
    tipo TINYINT 
);

CREATE TABLE servico (
    id_servico INT PRIMARY KEY AUTO_INCREMENT,
    nome_servico VARCHAR(100),
    tipo VARCHAR(50),
    descricao TEXT,
    preco DECIMAL(10,2),
    data_publicacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE busca (
    id_busca INT PRIMARY KEY AUTO_INCREMENT,
    nome_busca VARCHAR(100),
    tipo VARCHAR(50),
    descricao TEXT,
    orcamento DECIMAL(10,2),
    data_publicacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);