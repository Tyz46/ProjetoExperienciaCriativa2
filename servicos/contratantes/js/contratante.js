let usuarioLogado = null;
let servicosContratantes = [];

document.addEventListener("DOMContentLoaded", () => {
    iniciarPagina();
});

async function iniciarPagina() {
    const sessao = await valida_sessao();
    usuarioLogado = sessao.data;

    aplicarPermissoes();
    configurarFiltros();
    await carregarDados();
}

document.getElementById("novo").addEventListener("click", () => {
    if (!podeCriar()) {
        alert("Apenas clientes podem criar chamados nesta aba.");
        return;
    }

    window.location.href = "../html/contratante_novo.html";
});

document.getElementById("logoff").addEventListener("click", () => {
    logoff();
});

async function logoff() {
    const retorno = await fetch("../../../home/php/usuario_logoff.php");
    const resposta = await retorno.json();

    if (resposta.status === "ok") {
        window.location.href = "../../../home/html/login.html";
    } else {
        alert("Falha ao efetuar logoff.");
    }
}

async function carregarDados() {
    const lista = document.getElementById("lista");

    try {
        const retorno = await fetch("../php/contratantes_get.php", {
            credentials: "same-origin"
        });
        const resposta = await retorno.json();

        if (resposta.status !== "ok") {
            servicosContratantes = [];
            lista.innerHTML = renderizarVazio();
            atualizarResultadoResumo(0);
            return;
        }

        servicosContratantes = Array.isArray(resposta.data) ? resposta.data : [];
        renderizarLista();
    } catch (erro) {
        console.error(erro);
        servicosContratantes = [];
        lista.innerHTML = renderizarVazio("Nao foi possivel carregar os chamados agora.");
        atualizarResultadoResumo(0);
    }
}

function configurarFiltros() {
    const categoria = document.getElementById("filtroCategoria");
    const localidade = document.getElementById("filtroLocalidade");
    const precoMin = document.getElementById("filtroPrecoMin");
    const precoMax = document.getElementById("filtroPrecoMax");
    const toggle = document.getElementById("toggleFiltros");
    const limpar = document.getElementById("limparFiltros");

    function atualizarValoresPreco() {
        const elMin = document.getElementById("filtroPrecoMinValor");
        const elMax = document.getElementById("filtroPrecoMaxValor");
        if (elMin) elMin.textContent = formatarMoeda(precoMin.value);
        if (elMax) elMax.textContent = formatarMoeda(precoMax.value);
    }

    [categoria, localidade, precoMin, precoMax].forEach((el) => {
        if (!el) return;
        el.addEventListener("input", renderizarLista);
        el.addEventListener("change", renderizarLista);
    });

    if (precoMin) precoMin.addEventListener("input", atualizarValoresPreco);
    if (precoMax) precoMax.addEventListener("input", atualizarValoresPreco);
    atualizarValoresPreco();

    if (toggle) {
        toggle.addEventListener("click", () => {
            const painel = document.getElementById("filtros");
            if (!painel) return;
            painel.classList.toggle("d-none");
            toggle.textContent = painel.classList.contains("d-none") ? "Mostrar filtros" : "Ocultar filtros";
        });
    }

    if (limpar) {
        limpar.addEventListener("click", () => {
            if (categoria) categoria.value = "";
            if (localidade) localidade.value = "";
            if (precoMin) precoMin.value = 0;
            if (precoMax) precoMax.value = 90;
            atualizarValoresPreco();
            renderizarLista();
        });
    }
}

function renderizarLista() {
    const lista = document.getElementById("lista");
    const registros = obterServicosFiltrados();

    if (registros.length === 0) {
        lista.innerHTML = renderizarVazio("Nenhum chamado encontrado com os filtros atuais.");
        atualizarResultadoResumo(0);
        return;
    }

    lista.innerHTML = registros.map(renderizarCardChamado).join("");
    atualizarResultadoResumo(registros.length);
}

function obterServicosFiltrados() {
    const categoria = (document.getElementById("filtroCategoria") || {}).value || "";
    const localidade = (document.getElementById("filtroLocalidade") || {}).value || "";
    const precoMin = Number((document.getElementById("filtroPrecoMin") || {}).value || 0);
    const precoMax = Number((document.getElementById("filtroPrecoMax") || {}).value || 0);

    return servicosContratantes.filter((servico) => {
        if (categoria && servico.tipo !== categoria) return false;

        if (localidade) {
            const texto = (servico.localidade || "").toLowerCase();
            if (!texto.includes(localidade.toLowerCase())) return false;
        }

        const valor = Number(servico.valor);
        if (!Number.isNaN(precoMin) && precoMin > 0 && (Number.isNaN(valor) || valor < precoMin)) return false;
        if (!Number.isNaN(precoMax) && precoMax > 0 && (Number.isNaN(valor) || valor > precoMax)) return false;

        return true;
    });
}

function atualizarResultadoResumo(total) {
    const resumo = document.getElementById("resultadoResumo");
    if (!resumo) return;
    resumo.textContent = total === 1 ? "1 chamado exibido" : `${total} chamados exibidos`;
}

async function excluir(id) {
    if (!podeCriar()) {
        alert("Apenas clientes podem excluir chamados nesta aba.");
        return;
    }

    const confirmar = confirm("Deseja realmente excluir este chamado?");
    if (!confirmar) return;

    const retorno = await fetch("../php/contratantes_excluir.php?id=" + id, {
        credentials: "same-origin"
    });
    const resposta = await retorno.json();

    if (resposta.status === "ok") {
        alert(resposta.mensagem);
        carregarDados();
    } else {
        alert("Erro: " + resposta.mensagem);
    }
}

function renderizarCardChamado(objeto) {
    return `
        <div class="col-md-6 col-xl-4">
            <div class="card service-card">
                ${renderizarFoto(objeto)}
                <div class="card-body d-flex flex-column">
                    <div class="d-flex justify-content-between align-items-start gap-3 mb-3">
                        <span class="service-badge">${escaparHtml(formatarCategoria(objeto.tipo))}</span>
                        <span class="service-price">${formatarMoeda(objeto.valor)}</span>
                    </div>

                    <h5 class="card-title fw-bold mb-2">${escaparHtml(objeto.nome || "Sem nome")}</h5>
                    <div class="mb-3">
                        ${linkPerfilUsuario(objeto.id_usuario, objeto.nome_usuario, `Ver perfil de ${objeto.nome_usuario || "cliente"}`)}
                    </div>

                    <p class="card-text text-muted service-description-clamp mb-3">${escaparHtml(objeto.descricao || "Sem descricao cadastrada.")}</p>

                    <p class="service-meta mb-4">
                        <span><i class="bi bi-geo-alt text-success me-1"></i>${escaparHtml(objeto.localidade || "Nao informada")}</span>
                    </p>

                    <div class="mt-auto d-flex flex-column gap-2">
                        <button class="btn btn-outline-secondary btn-sm w-100" data-bs-toggle="modal" data-bs-target="#modalDetalheChamado" onclick="abrirDetalheChamado(${objeto.id})">Ver detalhes</button>
                        ${renderizarBotaoAceitarTrabalho(objeto)}
                        ${renderizarAcoes(objeto)}
                    </div>
                </div>
            </div>
        </div>
    `;
}

function renderizarFoto(objeto) {
    const foto = obterPrimeiraFoto(objeto.foto);

    if (!foto) {
        return "";
    }

    return `<img src="${escaparHtml(foto)}" class="service-photo" alt="Foto do chamado">`;
}

function obterPrimeiraFoto(valor) {
    if (!valor) {
        return "";
    }

    try {
        const fotos = JSON.parse(valor);
        return Array.isArray(fotos) ? (fotos[0] || "") : "";
    } catch (erro) {
        return valor;
    }
}

function renderizarAcoes(objeto) {
    if (!podeGerenciarRegistro(objeto)) {
        return "";
    }

    return `
        <div class="mt-auto d-flex gap-2">
            <a href="contratante_alterar.html?id=${objeto.id}" class="btn btn-warning btn-sm text-dark w-50">Alterar</a>
            <button class="btn btn-danger btn-sm w-50" onclick="excluir(${objeto.id})">Excluir</button>
        </div>
    `;
}

function abrirDetalheChamado(id) {
    const servico = servicosContratantes.find((item) => Number(item.id) === Number(id));
    if (!servico) {
        return;
    }

    document.getElementById("modalDetalheChamadoTitulo").textContent = servico.nome || "Chamado";
    definirLinkPerfilNoElemento(
        "modalDetalheChamadoContratante",
        servico.id_usuario,
        servico.nome_usuario,
        `Ver perfil de ${servico.nome_usuario || "cliente"}`
    );
    document.getElementById("modalDetalheChamadoValor").textContent = formatarMoeda(servico.valor);
    document.getElementById("modalDetalheChamadoCategoria").textContent = formatarCategoria(servico.tipo);
    document.getElementById("modalDetalheChamadoLocalidade").textContent = servico.localidade || "Nao informada";
    document.getElementById("modalDetalheChamadoDescricao").textContent = servico.descricao || "Sem descricao cadastrada.";
}

function renderizarVazio(mensagem = "Nenhum chamado de contratante foi encontrado no momento.") {
    return `
        <div class="col-12">
            <div class="empty-state">
                <i class="bi bi-briefcase fs-1 d-block mb-3"></i>
                <h4 class="mb-2">Nenhum chamado cadastrado</h4>
                <p class="mb-0">${mensagem}</p>
            </div>
        </div>
    `;
}

function formatarMoeda(valor) {
    const numero = Number(valor);

    if (Number.isNaN(numero) || numero <= 0) {
        return "A negociar";
    }

    return new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL"
    }).format(numero);
}

function formatarCategoria(categoria) {
    return categoria || "Sem categoria";
}

function aplicarPermissoes() {
    const botaoNovo = document.getElementById("novo");

    if (!podeCriar()) {
        botaoNovo.classList.add("d-none");
    }
}

function podeCriar() {
    return usuarioLogado?.tipo === "cliente" || usuarioLogado?.tipo === "admin";
}

function podeGerenciarRegistro(objeto) {
    return usuarioLogado?.tipo === "admin" || (
        usuarioLogado?.tipo === "cliente" &&
        Number(objeto.id_usuario) === Number(usuarioLogado?.id)
    );
}

function podeAceitarTrabalho(objeto) {
    if (!usuarioLogado) {
        return false;
    }
    if (usuarioLogado.tipo !== "prestador" && usuarioLogado.tipo !== "admin") {
        return false;
    }
    if (Number(objeto.id_usuario) === Number(usuarioLogado.id)) {
        return false;
    }
    return true;
}

function renderizarBotaoAceitarTrabalho(objeto) {
    if (!podeAceitarTrabalho(objeto)) {
        return "";
    }

    const nomeChamado = (objeto.nome || "chamado").replace(/'/g, "\\'");
    return `
        <button class="btn btn-outline-primary btn-sm w-100" onclick="enviarPropostaTrabalho(${objeto.id}, '${nomeChamado}')">
            <i class="bi bi-hand-thumbs-up me-1"></i>Aceitar trabalho
        </button>
    `;
}

async function enviarPropostaTrabalho(idServico, nomeChamado) {
    const confirmar = confirm(`Deseja informar ao contratante que voce aceita trabalhar em "${nomeChamado}"?`);
    if (!confirmar) {
        return;
    }

    const formData = new FormData();
    formData.append("id_servico", String(idServico));

    try {
        const retorno = await fetch("../../../home/php/fluxo_proposta.php", {
            method: "POST",
            credentials: "same-origin",
            body: formData,
        });
        const resposta = await retorno.json();

        if (resposta.status === "ok") {
            alert(resposta.mensagem + " Acompanhe em Mensagens no seu perfil.");
        } else {
            alert("Erro: " + (resposta.mensagem || "Falha ao enviar."));
        }
    } catch (erro) {
        console.error(erro);
        alert("Nao foi possivel enviar a proposta.");
    }
}

function escaparHtml(valor) {
    const elemento = document.createElement("span");
    elemento.textContent = valor;
    return elemento.innerHTML;
}
