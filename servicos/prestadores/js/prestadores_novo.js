let podeCadastrar = false;

// Ao abrir a tela, confere se o usuario pode criar servico.
document.addEventListener("DOMContentLoaded", async () => {
    const sessao = await valida_sessao();
    podeCadastrar = sessao.data?.tipo === "prestador" || sessao.data?.tipo === "adm";

    if (!podeCadastrar) {
        alert("Apenas prestadores podem criar servi\u00e7os nesta aba.");
        window.location.href = "../html/prestador.html";
    }
});

// Botoes principais da tela.
document.getElementById("enviar").addEventListener("click", novo);

document.getElementById("voltar").addEventListener("click", () => {
    window.location.href = "../html/prestador.html";
});

async function novo() {
    if (!podeCadastrar) {
        alert("Apenas prestadores podem criar servi\u00e7os nesta aba.");
        return;
    }

    // Pega os valores digitados no formulario.
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

    // FormData permite enviar texto e arquivos no mesmo POST.
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
            alert("Servi\u00e7o cadastrado com sucesso!");
            window.location.href = "../html/prestador.html";
        } else {
            alert("Erro: " + resposta.mensagem);
        }
    } catch (erro) {
        console.error(erro);
        alert("Erro de conexao. Verifique se o servidor esta em execucao.");
    }
}

function adicionarFotos(fd, fotos) {
    for (const foto of fotos) {
        fd.append("fotos[]", foto);
    }
}
