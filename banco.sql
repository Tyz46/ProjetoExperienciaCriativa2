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

CREATE TABLE servico(
	id INT PRIMARY KEY AUTO_INCREMENT,
    nome VARCHAR(50),
    descricao VARCHAR(200),
    tipo VARCHAR(50)
);