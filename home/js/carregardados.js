document.addEventListener("DOMContentLoaded", () => { // Espera documento carregar para executar função
    valida_sessao();
    carregarDados();
});

async function carregarDados() {
    const retorno = await fetch("../php/usuario_get.php");
    const resposta = await retorno.json();

    if (resposta.status == 'ok') {
    } else {
        alert('Erro:' + resposta.mensagem);
    };
};