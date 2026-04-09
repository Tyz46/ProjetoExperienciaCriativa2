document.getElementById("enviar").addEventListener("click", cadastrar);

document.getElementById("voltar").addEventListener("click", () => {
    window.location.href = "../html/contratante.html";
});

async function cadastrar() {
    const nome = document.getElementById("nome").value.trim();
    const descricao = document.getElementById("descricao").value.trim();
    const tipo = document.getElementById("tipo").value;
    const valor = document.getElementById("valor").value;
    const localidade = document.getElementById("localidade").value.trim();

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

    try {
        const retorno = await fetch("../php/contratantes_novo.php", {
            method: "POST",
            body: fd
        });

        // Pegamos a resposta como texto para evitar crash
        const textoResposta = await retorno.text();

        try {
            const resposta = JSON.parse(textoResposta);

            if (resposta.status == "ok") {
                alert("Serviço cadastrado com sucesso!");
                window.location.href = "../html/contratante.html";
            } else {
                alert("Atenção: " + resposta.mensagem);
            }
        } catch (erroJson) {
            console.error("Erro do Servidor:", textoResposta);
            alert("Erro no Servidor PHP:\n\n" + textoResposta);
        }
    } catch (erro) {
        console.error(erro);
        alert("Erro de conexão (O servidor está desligado ou o caminho está errado).");
    }
}