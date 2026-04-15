let podeAlterar = false;
let usuarioLogado = null;

// Ao abrir a tela, valida a sessao e pega o ID que veio pela URL.
document.addEventListener("DOMContentLoaded", async () => {
    const url = new URLSearchParams(window.location.search);
    const id = url.get("id");

    const sessao = await valida_sessao();
    usuarioLogado = sessao.data;
    podeAlterar = usuarioLogado?.tipo === "contratante" || usuarioLogado?.tipo === "adm";

    if (!podeAlterar) {
        alert("Apenas contratantes podem alterar chamados nesta aba.");
        window.location.href = "../html/contratante.html";
        return;
    }

    if (!id) {
        alert("Servico nao encontrado.");
        window.location.href = "../html/contratante.html";
        return;
    }

    buscarDados(id);
});

// Busca o chamado atual para preencher o formulario.
async function buscarDados(id) {
    const retorno = await fetch("../php/contratantes_get.php?id=" + id);
    const resposta = await retorno.json();

    if (resposta.status === "ok" && resposta.data.length > 0) {
        const reg = resposta.data[0];

        if (!podeGerenciarRegistro(reg)) {
            alert("Voce so pode alterar chamados criados pela sua conta.");
            window.location.href = "../html/contratante.html";
            return;
        }

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

// Botoes principais da tela.
document.getElementById("enviar").addEventListener("click", () => {
    alterar();
});

document.getElementById("voltar").addEventListener("click", () => {
    window.location.href = "../html/contratante.html";
});

async function alterar() {
    if (!podeAlterar) {
        alert("Apenas contratantes podem alterar chamados nesta aba.");
        return;
    }

    // Pega os valores atuais do formulario.
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

    // Monta o POST que sera enviado ao PHP.
    const fd = new FormData();
    fd.append("nome", nome);
    fd.append("descricao", descricao);
    fd.append("tipo", tipo);
    fd.append("valor", valor);
    fd.append("localidade", localidade);

    try {
        const retorno = await fetch("../php/contratantes_alterar.php?id=" + id, {
            method: "POST",
            credentials: "same-origin",
            body: fd
        });

        const resposta = await retorno.json();

        if (resposta.status === "ok") {
            alert("Servico alterado com sucesso!");
            window.location.href = "../html/contratante.html";
        } else {
            alert("Erro! " + resposta.mensagem);
        }
    } catch (erro) {
        console.error(erro);
        alert("Erro de conexao. Verifique se o servidor esta em execucao.");
    }
}

// Admin altera qualquer registro; usuario comum altera apenas o proprio.
function podeGerenciarRegistro(registro) {
    return usuarioLogado?.tipo === "adm" || Number(registro.id_usuario) === Number(usuarioLogado?.id);
}
