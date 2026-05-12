async function carregarNotificacoes() {
    const retorno = await fetch("../php/notificacao_get.php");
    const resposta = await retorno.json();

    const container = document.getElementById("lista-notificacoes");

    if (resposta.data.length === 0) {
        container.innerHTML = `
            <div class="list-group-item text-center text-secondary">
                Nenhuma notificação
            </div>
        `;
        return;
    }

    container.innerHTML = resposta.data.map(n => `
        <div class="list-group-item">
            <strong>${n.titulo}</strong>
            <p class="mb-1 text-secondary">${n.mensagem}</p>
            <small class="text-muted">
                ${new Date(n.data_criacao).toLocaleString("pt-BR")}
            </small>
        </div>
    `).join("");
}

document.getElementById("notificacoes-tab")
    .addEventListener("shown.bs.tab", carregarNotificacoes);