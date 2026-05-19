document.getElementById("enviar").addEventListener("click", consulta);
document.getElementById("novo").addEventListener("click", () => {
    window.location.href = "../html/cadastro.html";
});

async function consulta() {
    const usuario = document.getElementById("usuario").value.trim();
    const senha = document.getElementById("senha").value.trim();
    const endereco = document.getElementById("endereco").value.trim();

    if (!usuario || !senha || !endereco) {
        alert("Preencha usuário, senha e endereço.");
        return;
    }

    const fd = new FormData();
    fd.append("usuario", usuario);
    fd.append("senha", senha);
    fd.append("endereco", endereco);

    try {
        const retorno = await fetch("../php/usuario_login.php", {
            method: "POST",
            credentials: "same-origin",
            body: fd
        });

        const textoResposta = await retorno.text();

        try {
            const resposta = JSON.parse(textoResposta);

            if (resposta.status === "ok") {
                alert("Login efetuado com sucesso!");
                window.location.href = "../html/index.html?v=sessao";
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
