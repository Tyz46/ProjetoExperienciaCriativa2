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
                    <th>Tipo</th>
                    <th>Descrição</th>
                    <th>Requisitos</th>
                    <th>Preço</th>
                    <th>Data</th>
                    <th>Ações</th>
                </tr>
            </thead>
            <tbody>
        `;
        var html = `<div class="row row-cols-1 row-cols-md-3 g-4">`;

        for (var i = 0; i < registros.length; i++) {
            var objeto = registros[i];
          html += `
            <div class="col">
                <div class="card h-100 shadow-sm border-success">
                    <div class="card-body">
                        <h5 class="card-title fw-bold text-success">${objeto.nome_servico}</h5>
                        <h6 class="card-subtitle mb-3 text-muted">${objeto.tipo}</h6>
                        
                        <p class="card-text small" style="min-height: 40px;">
                            ${objeto.descricao}
                        </p>
                        <p class="card-text small" style="min-height: 40px;">
                            ${objeto.requisito}
                        </p>
                        
                        <div class="mb-3">
                            <span class="d-block fw-bold text-dark">R$ ${objeto.preco}</span>
                            <small class="text-muted">${objeto.data_publicacao}</small>
                        </div>

                        <div class="d-flex justify-content-between border-top pt-3">
                            <a href='criarservico_alterar.html?id=${objeto.id_servico}' class="btn btn-warning btn-sm text-dark fw-semibold">Alterar</a>
                            <button onclick='excluir(${objeto.id_servico})' class="btn btn-danger btn-sm fw-semibold">Excluir</button>
                        </div>
                    </div>
                </div>
            </div>`;
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
