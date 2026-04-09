document.getElementById("enviar").addEventListener("click", novo);
document.getElementById("voltar").addEventListener("click", () => {
    window.location.href = "../html/login.html";
});

async function novo() {
    const nome = document.getElementById("nome").value.trim();
    const email = document.getElementById("email").value.trim();
    const telefone = document.getElementById("telefone").value.trim();
    const usuario = document.getElementById("usuario").value.trim();
    const senha = document.getElementById("senha").value.trim();
    const tipo = document.getElementById("tipo").value;

    if (!nome || !email || !telefone || !usuario || !senha || !tipo) {
        alert("Preencha todos os campos.");
        return;
    }

    const fd = new FormData();
    fd.append("nome", nome);
    fd.append("email", email);
    fd.append("telefone", telefone);
    fd.append("usuario", usuario);
    fd.append("senha", senha);
    fd.append("tipo", tipo);

    try {
        const retorno = await fetch("../php/usuario_novo.php", {
            method: "POST",
            body: fd
        });

        // Pegamos a resposta como texto bruto primeiro
        const textoResposta = await retorno.text();

        try {
            // Tentamos converter para JSON
            const resposta = JSON.parse(textoResposta);

            if (resposta.status === "ok") {
                alert("Cadastro realizado com sucesso!");
                window.location.href = "../html/login.html";
            } else {
                alert("Aviso: " + resposta.mensagem);
            }
        } catch (erroJson) {
            // Se não for JSON (PHP deu erro fatal), mostramos o erro real!
            console.error("Erro do Servidor:", textoResposta);
            alert("Erro no Servidor PHP:\n\n" + textoResposta);
        }
        
    } catch (erro) {
        console.error(erro);
        alert("Erro de conexão (O servidor está desligado ou o caminho está errado).");
    }
}