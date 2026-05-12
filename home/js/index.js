document.addEventListener("DOMContentLoaded", () => { // Espera documento carregar para executar função
    valida_sessao();
    carregarDados();
});

document.getElementById('novo').addEventListener('click', () => {
    window.location.href = '../html/usuario_novo.html';
});

async function carregarDados() {
    const retorno = await fetch("../php/usuario_get.php");
    const resposta = await retorno.json();

    if (resposta.status == 'ok') {
        const registros = resposta.data;
        
        var html = `
        <table class="table table-striped table-bordered align-middle shadow-sm">
            <thead class="table-success text-center">
                <tr>
                    <th>Nome</th>
                    <th>Usuário</th>
                    <th>Senha</th>
                    <th>Tipo</th>
                    <th>Ações</th>
                </tr>
            </thead>
            <tbody>
        `;

        for (var i = 0; i < registros.length; i++) {
            var objeto = registros[i];
            html += `
                <tr>
                    <td>${objeto.nome}</td>
                    <td>${objeto.usuario}</td>
                    <td>${objeto.senha}</td>
                    <td>${objeto.tipo}</td>
                    <td class="text-center">
                        <a href='usuario_alterar.html?id=${objeto.id}' class="btn btn-warning btn-sm text-dark fw-semibold me-1">Alterar</a>
                        <a href='#' onclick='excluir(${objeto.id})' class="btn btn-danger btn-sm fw-semibold">Excluir</a>
                    </td>
                </tr>`;
        };

        html += `
            </tbody>
        </table>`;

        document.getElementById('lista').innerHTML = html;
    } else {
        alert('Erro:' + resposta.mensagem);
    }
};

async function excluir(id) {
    const retorno = await fetch("../php/usuario_excluir.php?id=" + id);
    const resposta = await retorno.json();
    if (resposta.status == 'ok') {
        alert(resposta.mensagem);
        window.location.reload();
    } else {
        alert("Erro: " + resposta.mensagem);
    }
}
