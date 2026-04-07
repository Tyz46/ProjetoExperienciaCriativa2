document.addEventListener("DOMContentLoaded", () => { // Espera documento carregar para executar função
    valida_sessao();
    carregarDados();
});

document.getElementById('novo').addEventListener('click', () => {
    window.location.href = '../html/contratante_novo.html';
});
document.getElementById('logoff').addEventListener('click', () => {
    logoff();
});

async function logoff(){
    const retorno = await fetch('../../../home/php/usuario_logoff.php');
    const resposta = await retorno.json();
    if(resposta.status == 'ok'){
        window.location.href = '../../../home/html/login.html';
    }else{
        alert("Falha ao efetuar Login.");
    }
}

async function carregarDados() {
    const retorno = await fetch("../php/contratantes_get.php");
    const resposta = await retorno.json();

    if (resposta.status == 'ok') {
        const registros = resposta.data;

        var html = `
        <table class="table table-striped table-bordered align-middle shadow-sm">
            <thead class="table-success text-center">
                <tr>
                    <th>Nome</th>
                    <th>Descrição</th>
                    <th>Orçamento</th>
                    <th>Data de Publicação</th>
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
                    <td>${objeto.descricao}</td>
                    <td>${objeto.orcamento}</td>
                    <td>${objeto.data_publicacao}</td>
                    <td class="text-center">
                        <a href='contratante_alterar.html?id=${objeto.id}' class="btn btn-warning btn-sm text-dark fw-semibold me-1">Alterar</a>
                        <a href='#' onclick='excluir(${objeto.id})' class="btn btn-danger btn-sm fw-semibold">Excluir</a>
                    </td>
                </tr>`;
        }

        html += `
            </tbody>
        </table>`;

        document.getElementById('lista').innerHTML = html;
    } else {
        alert('Erro: ' + resposta.mensagem);
    }
}

async function excluir(id) {
    const retorno = await fetch("../php/contratantes_excluir.php?id=" + id);
    const resposta = await retorno.json();
    if (resposta.status == 'ok') {
        alert(resposta.mensagem);
        window.location.reload();
    } else {
        alert("Erro: " + resposta.mensagem);
    }
}
