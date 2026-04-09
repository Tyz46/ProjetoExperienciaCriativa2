document.addEventListener("DOMContentLoaded", () => {
    const url = new URLSearchParams(window.location.search);
    const id = url.get("id");

    valida_sessao();
    buscarDados(id);
});

async function buscarDados(id) {
    const retorno = await fetch("../php/contratantes_get.php?id=" + id);
    const resposta = await retorno.json();

    if (resposta.status == "ok") {
        const reg = resposta.data[0];

        document.getElementById("id").value = reg.id;
        document.getElementById("nome").value = reg.nome ?? "";
        document.getElementById("descricao").value = reg.descricao ?? "";
        document.getElementById("tipo").value = reg.tipo ?? "";
        document.getElementById("valor").value = reg.valor ?? "";
        document.getElementById("localidade").value = reg.localidade ?? "";
    } else {
        alert("Erro! " + resposta.mensagem);
        window.location.href = "../html/contratante.html";
    }
}

document.getElementById("enviar").addEventListener("click", () => {
    alterar();
});

document.getElementById("voltar").addEventListener("click", () => {
    window.location.href = "../html/contratante.html";
});

async function alterar() {
    const nome = document.getElementById("nome").value.trim();
    const descricao = document.getElementById("descricao").value.trim();
    const tipo = document.getElementById("tipo").value;
    const valor = document.getElementById("valor").value;
    const localidade = document.getElementById("localidade").value.trim();
    const id = document.getElementById("id").value;

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

    const retorno = await fetch("../php/contratantes_alterar.php?id=" + id, {
        method: "POST",
        body: fd
    });

    const resposta = await retorno.json();

    if (resposta.status == "ok") {
        alert("Serviço alterado com sucesso!");
        window.location.href = "../html/contratante.html";
    } else {
        alert("Erro! " + resposta.mensagem);
    }
}