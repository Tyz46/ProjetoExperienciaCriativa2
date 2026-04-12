let podeCadastrar = false;

document.addEventListener("DOMContentLoaded", async () => {
    const sessao = await valida_sessao();
    podeCadastrar = sessao.data?.tipo === "prestador" || sessao.data?.tipo === "adm";

    if (!podeCadastrar) {
        alert("Apenas prestadores podem criar serviços nesta aba.");
        window.location.href = "../html/prestador.html";
    }
});

document.getElementById("enviar").addEventListener("click", novo);

document.getElementById("voltar").addEventListener("click", () => {
    window.location.href = "../html/prestador.html";
});

async function novo() {
    if (!podeCadastrar) {
        alert("Apenas prestadores podem criar serviços nesta aba.");
        return;
    }

    const nome = document.getElementById("nome").value.trim();
    const descricao = document.getElementById("descricao").value.trim();
    const tipo = document.getElementById("tipo").value;
    const valor = document.getElementById("valor").value;
    const localidade = document.getElementById("localidade").value.trim();
    const fotos = document.getElementById("fotos").files;

    if (!nome || !descricao || !tipo || !valor || !localidade) {
        alert("Preencha todos os campos.");
        return;
    }

    const fd = new FormData();
    fd.append("nome", nome);
    fd.append("descricao", descricao);
    fd.append("tipo", tipo);
    fd.append("valor", valor);
    fd.append("localidade", localidade);
    adicionarFotos(fd, fotos);

    try {
        const retorno = await fetch("../php/prestadores_novo.php", {
            method: "POST",
            credentials: "same-origin",
            body: fd
        });
        const resposta = await retorno.json();

        if (resposta.status === "ok") {
            alert("Serviço cadastrado com sucesso!");
            window.location.href = "../html/prestador.html";
        } else {
            alert("Erro: " + resposta.mensagem);
        }
    } catch (erro) {
        console.error(erro);
        alert("Erro de conexão. Verifique se o servidor está em execução.");
    }
}

function adicionarFotos(fd, fotos) {
    for (const foto of fotos) {
        fd.append("fotos[]", foto);
    }
}
