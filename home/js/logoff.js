const btnLogoff = document.getElementById("logoff");

if (btnLogoff) {
    // Dispara o endpoint de logoff e volta para a tela de login.
    btnLogoff.addEventListener("click", async () => {
        try {
            const retorno = await fetch("../php/usuario_logoff.php");
            const resposta = await retorno.json();

            if (resposta.status === "ok") {
                window.location.href = "../html/login.html";
            } else {
                alert("Falha ao efetuar logoff.");
            }
        } catch (erro) {
            console.error(erro);
            alert("Erro ao sair.");
        }
    });
}
