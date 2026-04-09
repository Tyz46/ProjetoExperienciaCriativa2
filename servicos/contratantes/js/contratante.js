document.addEventListener("DOMContentLoaded", () => {
    valida_sessao();
    carregarDados();
});

document.getElementById("novo").addEventListener("click", () => {
    window.location.href = "../html/contratante_novo.html";
});

document.getElementById("logoff").addEventListener("click", () => {
    logoff();
});

async function logoff() {
    const retorno = await fetch("../../../home/php/usuario_logoff.php");
    const resposta = await retorno.json();

    if (resposta.status == "ok") {
        window.location.href = "../../../home/html/login.html";
    } else {
        alert("Falha ao efetuar logoff.");
    }
}

async function carregarDados() {
    const retorno = await fetch("../php/contratantes_get.php");
    const resposta = await retorno.json();

    if (resposta.status == "ok") {
        const registros = resposta.data;
        let html = "";

        for (let i = 0; i < registros.length; i++) {
            const objeto = registros[i];

            html += `
                <div class="col-md-6 col-lg-4">
                    <div class="card service-card">
                        <div class="card-body d-flex flex-column">
                            <div class="d-flex justify-content-between align-items-start mb-3">
                                <span class="service-badge">${objeto.tipo ?? "Sem categoria"}</span>
                                <span class="service-price">R$ ${formatarValor(objeto.valor)}</span>
                            </div>

                            <h5 class="card-title fw-bold">${objeto.nome ?? "Sem nome"}</h5>

                            <p class="card-text text-muted mb-3">
                                ${objeto.descricao ?? "Sem descrição cadastrada."}
                            </p>

                            <div class="mb-4">
                                <p class="mb-1"><i class="bi bi-geo-alt text-success me-1"></i> <strong>Localidade:</strong> ${objeto.localidade ?? "Não informada"}</p>
                            </div>

                            <div class="mt-auto d-flex gap-2">
                                <a href="contratante_alterar.html?id=${objeto.id}" class="btn btn-warning btn-sm text-dark fw-semibold w-50">
                                    Alterar
                                </a>
                                <button class="btn btn-danger btn-sm fw-semibold w-50" onclick="excluir(${objeto.id})">
                                    Excluir
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }

        document.getElementById("lista").innerHTML = html;
    } else {
        document.getElementById("lista").innerHTML = `
            <div class="col-12">
                <div class="empty-state">
                    <i class="bi bi-briefcase fs-1 d-block mb-3"></i>
                    <h4 class="mb-2">Nenhum serviço cadastrado</h4>
                    <p class="mb-0">Clique em <strong>"Novo Serviço"</strong> para adicionar o primeiro.</p>
                </div>
            </div>
        `;
    }
}

function formatarValor(valor) {
    const numero = parseFloat(valor);

    if (isNaN(numero)) {
        return "0,00";
    }

    return numero.toFixed(2).replace(".", ",");
}

async function excluir(id) {
    const confirmar = confirm("Deseja realmente excluir este serviço?");
    if (!confirmar) return;

    const retorno = await fetch("../php/contratantes_excluir.php?id=" + id);
    const resposta = await retorno.json();

    if (resposta.status == "ok") {
        alert(resposta.mensagem);
        carregarDados();
    } else {
        alert("Erro: " + resposta.mensagem);
    }
}