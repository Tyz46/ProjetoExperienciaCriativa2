// Confere no backend se a sessao continua valida.
// Quando nao ha sessao, redireciona a pessoa para a tela de login.
async function valida_sessao() {
    try {
        const retorno = await fetch("../../../php/valida_sessao.php", {
            credentials: "same-origin"
        });
        const resposta = await retorno.json();

        if (resposta.status === "nok") {
            window.location.href = "../../../home/html/login.html";
        }

        return resposta;
    } catch (erro) {
        console.error(erro);
        window.location.href = "../../../home/html/login.html";
        return { status: "nok", data: null };
    }
}
