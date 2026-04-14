let usuarioLogado = null;
let registrosServicos = [];

document.addEventListener("DOMContentLoaded", () => {
    configurarFiltros();
    iniciarPagina();
});

async function iniciarPagina() {
    const sessao = await valida_sessao();
    usuarioLogado = sessao.data;

    aplicarPermissoes();
    carregarDados();
}

document.getElementById("novo").addEventListener("click", () => {
    if (!podeCriar()) {
        alert("Apenas contratantes podem criar chamados nesta aba.");
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
        const retorno = await fetch("../php/contratantes_get.php");
        const resposta = await retorno.json();

        if (resposta.status !== "ok") {
            registrosServicos = [];
            atualizarFiltroPreco();
            renderizarLista();
            return;
        }

        registrosServicos = Array.isArray(resposta.data) ? resposta.data : [];
        atualizarFiltroPreco();
        renderizarLista();
    } catch (erro) {
        console.error(erro);
        registrosServicos = [];
        atualizarFiltroPreco();
        lista.innerHTML = renderizarVazio("Não foi possível carregar os serviços agora.");
    }
}

async function excluir(id) {
    if (!podeCriar()) {
        alert("Apenas contratantes podem excluir chamados nesta aba.");
        return;
    }

    const confirmar = confirm("Deseja realmente excluir este serviço?");
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

function configurarFiltros() {
    const botao = document.getElementById("abrirFiltros");
    const painel = document.getElementById("filtrosPainel");
    const filtroLocalidade = document.getElementById("filtroLocalidade");
    const filtroTipo = document.getElementById("filtroTipo");
    const filtroPrecoMin = document.getElementById("filtroPrecoMin");
    const filtroPrecoMax = document.getElementById("filtroPrecoMax");
    const botaoLimpar = document.getElementById("limparFiltros");

    if (!botao || !painel) {
        return;
    }

    botao.addEventListener("click", () => {
        const abrir = botao.getAttribute("aria-expanded") !== "true";
        botao.setAttribute("aria-expanded", abrir ? "true" : "false");
        botao.classList.toggle("is-open", abrir);
        painel.hidden = !abrir;
    });

    filtroLocalidade?.addEventListener("input", renderizarLista);
    filtroTipo?.addEventListener("change", renderizarLista);
    filtroPrecoMin?.addEventListener("input", () => {
        ajustarFaixaPreco("min");
        atualizarPrecoSelecionado();
        renderizarLista();
    });
    filtroPrecoMax?.addEventListener("input", () => {
        ajustarFaixaPreco("max");
        atualizarPrecoSelecionado();
        renderizarLista();
    });
    botaoLimpar?.addEventListener("click", limparFiltros);
}

function renderizarLista() {
    const lista = document.getElementById("lista");

    if (!lista) {
        return;
    }

    if (registrosServicos.length === 0) {
        lista.innerHTML = renderizarVazio();
        return;
    }

    const registrosFiltrados = filtrarRegistros();

    if (registrosFiltrados.length === 0) {
        lista.innerHTML = renderizarSemResultados();
        return;
    }

    lista.innerHTML = registrosFiltrados.map(renderizarCardServico).join("");
}

function filtrarRegistros() {
    const localidade = normalizarTexto(document.getElementById("filtroLocalidade")?.value || "");
    const tipo = document.getElementById("filtroTipo")?.value || "";
    const faixaPreco = obterFaixaPrecoFiltro();

    return registrosServicos.filter((objeto) => {
        const localidadeOk = !localidade || normalizarTexto(objeto.localidade).includes(localidade);
        const tipoOk = !tipo || normalizarTexto(objeto.tipo) === normalizarTexto(tipo);
        const valorServico = obterValorServico(objeto);
        const precoOk = valorServico >= faixaPreco.minimo && valorServico <= faixaPreco.maximo;

        return localidadeOk && tipoOk && precoOk;
    });
}

function limparFiltros() {
    const filtroLocalidade = document.getElementById("filtroLocalidade");
    const filtroTipo = document.getElementById("filtroTipo");
    const filtroPrecoMin = document.getElementById("filtroPrecoMin");
    const filtroPrecoMax = document.getElementById("filtroPrecoMax");

    if (filtroLocalidade) {
        filtroLocalidade.value = "";
    }

    if (filtroTipo) {
        filtroTipo.value = "";
    }

    if (filtroPrecoMin) {
        filtroPrecoMin.value = "0";
    }

    if (filtroPrecoMax) {
        filtroPrecoMax.value = filtroPrecoMax.max || "0";
    }

    atualizarPrecoSelecionado();
    renderizarLista();
}

function atualizarFiltroPreco() {
    const filtroPrecoMin = document.getElementById("filtroPrecoMin");
    const filtroPrecoMax = document.getElementById("filtroPrecoMax");
    const filtroPrecoMinimo = document.getElementById("filtroPrecoMinimo");
    const filtroPrecoMaximo = document.getElementById("filtroPrecoMaximo");

    if (!filtroPrecoMin || !filtroPrecoMax) {
        return;
    }

    const maiorPreco = registrosServicos.reduce((maior, objeto) => {
        return Math.max(maior, obterValorServico(objeto));
    }, 0);
    const limite = maiorPreco > 0 ? Math.ceil(maiorPreco / 10) * 10 : 0;

    [filtroPrecoMin, filtroPrecoMax].forEach((filtro) => {
        filtro.min = "0";
        filtro.max = String(limite);
        filtro.disabled = limite === 0;
    });

    filtroPrecoMin.value = "0";
    filtroPrecoMax.value = String(limite);

    if (filtroPrecoMinimo) {
        filtroPrecoMinimo.textContent = "R$ 0";
    }

    if (filtroPrecoMaximo) {
        filtroPrecoMaximo.textContent = limite > 0 ? formatarMoeda(limite) : "Sem valores";
    }

    atualizarPrecoSelecionado();
}

function atualizarPrecoSelecionado() {
    const filtroPrecoMin = document.getElementById("filtroPrecoMin");
    const filtroPrecoMax = document.getElementById("filtroPrecoMax");
    const filtroPrecoValor = document.getElementById("filtroPrecoValor");

    if (!filtroPrecoMin || !filtroPrecoMax || !filtroPrecoValor) {
        return;
    }

    const limite = Number(filtroPrecoMax.max) || 0;
    const minimo = Number(filtroPrecoMin.value) || 0;
    const maximo = Number(filtroPrecoMax.value) || 0;
    atualizarTrilhoPreco(minimo, maximo, limite);

    if (!limite || (minimo <= 0 && maximo >= limite)) {
        filtroPrecoValor.textContent = "Todos os pre\u00e7os";
        return;
    }

    if (minimo <= 0 && maximo <= 0) {
        filtroPrecoValor.textContent = "A negociar";
        return;
    }

    if (minimo <= 0) {
        filtroPrecoValor.textContent = "At\u00e9 " + formatarMoeda(maximo);
        return;
    }

    if (maximo >= limite) {
        filtroPrecoValor.textContent = "A partir de " + formatarMoeda(minimo);
        return;
    }

    if (minimo === maximo) {
        filtroPrecoValor.textContent = formatarMoeda(minimo);
        return;
    }

    filtroPrecoValor.textContent = formatarMoeda(minimo) + " a " + formatarMoeda(maximo);
}

function ajustarFaixaPreco(alterado) {
    const filtroPrecoMin = document.getElementById("filtroPrecoMin");
    const filtroPrecoMax = document.getElementById("filtroPrecoMax");

    if (!filtroPrecoMin || !filtroPrecoMax) {
        return;
    }

    const minimo = Number(filtroPrecoMin.value) || 0;
    const maximo = Number(filtroPrecoMax.value) || 0;

    if (minimo <= maximo) {
        return;
    }

    if (alterado === "min") {
        filtroPrecoMax.value = filtroPrecoMin.value;
    } else {
        filtroPrecoMin.value = filtroPrecoMax.value;
    }
}

function atualizarTrilhoPreco(minimo, maximo, limite) {
    const trilho = document.querySelector(".filter-range-stack");

    if (!trilho) {
        return;
    }

    const inicio = limite > 0 ? Math.max(0, Math.min(100, (minimo / limite) * 100)) : 0;
    const fim = limite > 0 ? Math.max(inicio, Math.min(100, (maximo / limite) * 100)) : 100;

    trilho.style.setProperty("--filter-range-start", inicio + "%");
    trilho.style.setProperty("--filter-range-end", fim + "%");
}

function obterFaixaPrecoFiltro() {
    const filtroPrecoMin = document.getElementById("filtroPrecoMin");
    const filtroPrecoMax = document.getElementById("filtroPrecoMax");

    if (!filtroPrecoMin || !filtroPrecoMax || filtroPrecoMax.disabled) {
        return {
            minimo: 0,
            maximo: Infinity
        };
    }

    return {
        minimo: Number(filtroPrecoMin.value) || 0,
        maximo: Number(filtroPrecoMax.value) || 0
    };
}

function obterValorServico(objeto) {
    const valor = Number(objeto?.valor);
    return Number.isNaN(valor) ? 0 : valor;
}

function normalizarTexto(valor) {
    return String(valor || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase();
}

function renderizarSemResultados() {
    return `
        <div class="col-12">
            <div class="empty-state">
                <i class="bi bi-search fs-1 d-block mb-3"></i>
                <h4 class="mb-2">Nenhum servi&ccedil;o encontrado</h4>
                <p class="mb-0">Tente mudar a localidade, o tipo ou o pre&ccedil;o m&aacute;ximo.</p>
            </div>
        </div>
    `;
}

function renderizarCardServico(objeto) {
    return `
        <div class="col-md-6 col-lg-4">
            <div class="card service-card">
                ${renderizarFoto(objeto)}
                <div class="card-body d-flex flex-column">
                    <div class="d-flex justify-content-between align-items-start gap-3 mb-3">
                        <span class="service-badge">${escaparHtml(formatarCategoria(objeto.tipo))}</span>
                        <span class="service-price">${formatarMoeda(objeto.valor)}</span>
                    </div>

                    <h5 class="card-title fw-bold">${escaparHtml(objeto.nome || "Sem nome")}</h5>
                    <p class="card-text text-muted mb-3">${escaparHtml(objeto.descricao || "Sem descrição cadastrada.")}</p>

                    <p class="mb-4">
                        <i class="bi bi-geo-alt text-success me-1"></i>
                        <strong>Localidade:</strong> ${escaparHtml(objeto.localidade || "Não informada")}
                    </p>

                    ${renderizarAcoes(objeto)}
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

function renderizarVazio(mensagem = "Clique em Novo serviço para adicionar o primeiro.") {
    return `
        <div class="col-12">
            <div class="empty-state">
                <i class="bi bi-briefcase fs-1 d-block mb-3"></i>
                <h4 class="mb-2">Nenhum serviço cadastrado</h4>
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
    const categorias = {
        Eletrica: "Elétrica",
        Informatica: "Informática"
    };

    categorias.Eletrica = "El\u00e9trica";
    categorias.Limpeza = "Limpeza";
    categorias.Informatica = "Inform\u00e1tica";
    categorias.Pintura = "Pintura";
    categorias.Encanamento = "Encanamento";
    categorias.Montagem = "Montagem";

    return categorias[categoria] || categoria || "Sem categoria";
}

function aplicarPermissoes() {
    const botaoNovo = document.getElementById("novo");

    if (!podeCriar()) {
        botaoNovo.classList.add("d-none");
    }
}

function podeCriar() {
    return usuarioLogado?.tipo === "contratante" || usuarioLogado?.tipo === "adm";
}

function podeGerenciarRegistro(objeto) {
    return usuarioLogado?.tipo === "adm" || (
        usuarioLogado?.tipo === "contratante" &&
        Number(objeto.id_usuario) === Number(usuarioLogado?.id)
    );
}

function escaparHtml(valor) {
    const elemento = document.createElement("span");
    elemento.textContent = valor;
    return elemento.innerHTML;
}
