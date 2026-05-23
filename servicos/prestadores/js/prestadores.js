let usuarioLogado = null;
let servicosPrestadores = [];

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
        alert("Apenas prestadores podem criar servicos nesta aba.");
        return;
    }

    window.location.href = "../html/prestador_novo.html";
});

document.getElementById("logoff").addEventListener("click", () => {
    logoff();
});

function configurarFiltros() {
    const categoria = document.getElementById("filtroCategoria");
    const localidade = document.getElementById("filtroLocalidade");
    const precoMin = document.getElementById("filtroPrecoMin");
    const precoMax = document.getElementById("filtroPrecoMax");
    const toggle = document.getElementById("toggleFiltros");
    const toggleTexto = document.getElementById("toggleFiltrosTexto");
    const limpar = document.getElementById("limparFiltros");
    const painel = document.getElementById("filtrosPainel");
    const toolbar = toggle ? toggle.closest(".filters-toolbar") : null;

    function atualizarValoresPreco() {
        const elMin = document.getElementById("filtroPrecoMinValor");
        const elMax = document.getElementById("filtroPrecoMaxValor");
        if (elMin) elMin.textContent = formatarMoeda(precoMin.value);
        if (elMax) elMax.textContent = formatarMoeda(precoMax.value);
    }

    function atualizarEstadoFiltros(estaAberto) {
        if (painel) {
            painel.hidden = !estaAberto;
        }
        if (toggle) {
            toggle.setAttribute("aria-expanded", String(estaAberto));
        }
        if (toggleTexto) {
            toggleTexto.textContent = estaAberto ? "Recolher" : "Abrir";
        }
        if (toolbar) {
            toolbar.classList.toggle("is-collapsed", !estaAberto);
        }
    }

    [categoria, localidade, precoMin, precoMax].forEach((el) => {
        if (!el) return;
        el.addEventListener("input", renderizarLista);
        el.addEventListener("change", renderizarLista);
    });

    if (precoMin) precoMin.addEventListener("input", atualizarValoresPreco);
    if (precoMax) precoMax.addEventListener("input", atualizarValoresPreco);
    atualizarValoresPreco();
    atualizarEstadoFiltros(true);

    if (toggle) {
        toggle.addEventListener("click", () => {
            if (!painel) return;
            atualizarEstadoFiltros(painel.hidden);
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
        const retorno = await fetch("../php/prestadores_get.php", {
            credentials: "same-origin"
        });
        const resposta = await retorno.json();

        if (resposta.status !== "ok") {
            servicosPrestadores = [];
            lista.innerHTML = renderizarVazio();
            atualizarContadorOrcamentos(0);
            return;
        }

        servicosPrestadores = Array.isArray(resposta.data) ? resposta.data : [];
        renderizarLista();
    } catch (erro) {
        console.error(erro);
        servicosPrestadores = [];
        lista.innerHTML = renderizarVazio("Nao foi possivel carregar os servicos agora.");
        atualizarContadorOrcamentos(0);
    }
}

function renderizarLista() {
    const lista = document.getElementById("lista");
    const registros = obterServicosFiltrados();

    if (registros.length === 0) {
        lista.innerHTML = renderizarVazio(gerarMensagemVazio());
        atualizarContadorOrcamentos(0);
        return;
    }

    lista.innerHTML = registros.map(renderizarCardServico).join("");
    atualizarContadorOrcamentos(registros.length);
}

function obterServicosFiltrados() {
    const categoria = (document.getElementById("filtroCategoria") || {}).value || "";
    const localidade = (document.getElementById("filtroLocalidade") || {}).value || "";
    const precoMin = Number((document.getElementById("filtroPrecoMin") || {}).value || 0);
    const precoMax = Number((document.getElementById("filtroPrecoMax") || {}).value || 0);

    return servicosPrestadores.filter((servico) => {
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

function gerarMensagemVazio() {
    return "Nenhum servico encontrado para o filtro escolhido.";
}

function atualizarContadorOrcamentos(total) {
    const resumo = document.getElementById("resultadoResumo");
    const contador = document.getElementById("contadorOrcamentos");
    const texto = total === 1 ? "1 chamado exibido" : `${total} chamados exibidos`;
    if (resumo) resumo.textContent = texto;
    if (contador) contador.textContent = `${total} opcoes disponiveis para comparacao.`;
}

async function excluir(id) {
    if (!podeCriar()) {
        alert("Apenas prestadores podem excluir servicos nesta aba.");
        return;
    }

    const confirmar = confirm("Deseja realmente excluir este servico?");
    if (!confirmar) return;

    const retorno = await fetch("../php/prestadores_excluir.php?id=" + id, {
        credentials: "same-origin"
    });
    const resposta = await retorno.json();

    if (resposta.status === "ok") {
        alert(resposta.mensagem);
        await carregarDados();
    } else {
        alert("Erro: " + resposta.mensagem);
    }
}

function renderizarCardServico(objeto) {

    return `
        <div class="col-md-6 col-xl-4">
            <div class="card service-card h-100">
                ${renderizarFoto(objeto)}
                <div class="card-body d-flex flex-column">
                    <div class="d-flex justify-content-between align-items-start gap-3 mb-3">
                        <span class="service-badge">${escaparHtml(formatarCategoria(objeto.tipo))}</span>
                        <span class="service-price">${formatarMoeda(objeto.valor)}</span>
                    </div>

                    <h5 class="card-title fw-bold mb-2">${escaparHtml(objeto.nome || "Sem nome")}</h5>
                    <div class="mb-3">
                        ${linkPerfilUsuario(objeto.id_usuario, objeto.nome_usuario, `Ver perfil de ${objeto.nome_usuario || "prestador"}`)}
                    </div>
                    <p class="text-secondary small mb-3">
                        <i class="bi bi-person-workspace me-1"></i>
                        ${escaparHtml(objeto.profissao || "Profissao nao informada")}
                    </p>

                    <p class="card-text text-muted service-description-clamp mb-3">${escaparHtml(objeto.descricao || "Sem descricao cadastrada.")}</p>

                    <div class="skills-list mb-3">${renderizarHabilidades(objeto.habilidades)}</div>

                    <div class="detail-block mb-3">
                        <strong class="d-block mb-2">Especialidades tecnicas</strong>
                        <span class="text-muted">${escaparHtml(resumirTexto(objeto.descricao_especialidades || "Nao informadas.", 120))}</span>
                    </div>

                    <p class="service-meta mb-4">
                        <span><i class="bi bi-geo-alt text-success me-1"></i>${escaparHtml(objeto.localidade || "Nao informada")}</span>
                    </p>

                    <div class="service-card-actions mt-auto">
                        <button class="btn btn-card-secondary btn-sm w-100" data-bs-toggle="modal" data-bs-target="#modalDetalheOrcamento" onclick="abrirDetalheOrcamento(${objeto.id})">
                            <i class="bi bi-eye me-1"></i>Ver detalhes
                        </button>
                        ${renderizarBotaoSolicitacao(objeto)}
                        ${renderizarAcoesGerenciamento(objeto)}
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

    return `<img src="${escaparHtml(foto)}" class="service-photo" alt="Foto do servico">`;
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

function renderizarAcoesGerenciamento(objeto) {
    if (!podeGerenciarRegistro(objeto)) {
        return "";
    }

    return `
        <div class="service-card-actions-row">
            <a href="prestador_alterar.html?id=${objeto.id}" class="btn btn-card-edit btn-sm w-50">Alterar</a>
            <button class="btn btn-card-delete btn-sm w-50" onclick="excluir(${objeto.id})">Excluir</button>
        </div>
    `;
}

function alternarComparacao(id) {
    // comparação removida
}

function renderizarPainelComparacao() {
    // painel comparativo removido
}

function renderizarLinhaComparacao(rotulo, colunas) {
    return ``;
}

function renderizarIndicadorCusto(servico, selecionados) {
    return '';
}

function obterServicosSelecionados() {
    return [];
}

function limparComparacao() {
    // removido
}

function abrirDetalheOrcamento(id) {
    const servico = servicosPrestadores.find((item) => Number(item.id) === Number(id));
    if (!servico) {
        return;
    }

    document.getElementById("modalDetalheTitulo").textContent = servico.nome || "Servico";
    definirLinkPerfilNoElemento(
        "modalDetalhePrestador",
        servico.id_usuario,
        servico.nome_usuario,
        `Ver perfil de ${servico.nome_usuario || "prestador"}`
    );
    document.getElementById("modalDetalheValor").textContent = formatarMoeda(servico.valor);
    document.getElementById("modalDetalheProfissao").textContent = servico.profissao || "Nao informada";
    document.getElementById("modalDetalheCategoria").textContent = formatarCategoria(servico.tipo);
    document.getElementById("modalDetalheLocalidade").textContent = servico.localidade || "Nao informada";
    document.getElementById("modalDetalheHabilidades").innerHTML = renderizarHabilidades(servico.habilidades);
    document.getElementById("modalDetalheEspecialidades").textContent = servico.descricao_especialidades || "Nao informadas.";
    document.getElementById("modalDetalheDescricao").textContent = servico.descricao || "Sem descricao cadastrada.";
}

function renderizarVazio(mensagem = "Nenhum servico de prestador foi encontrado no momento.") {
    return `
        <div class="col-12">
            <div class="empty-state">
                <i class="bi bi-briefcase fs-1 d-block mb-3"></i>
                <h4 class="mb-2">Sem servicos para comparar</h4>
                <p class="mb-0">${mensagem}</p>
            </div>
        </div>
    `;
}

function renderizarHabilidades(valor) {
    const habilidades = parsearHabilidades(valor);

    if (habilidades.length === 0) {
        return '<span class="skill-chip muted">Sem habilidades informadas</span>';
    }

    return habilidades.map((habilidade) => `<span class="skill-chip">${escaparHtml(habilidade)}</span>`).join("");
}

function parsearHabilidades(valor) {
    if (!valor) {
        return [];
    }

    try {
        const habilidades = JSON.parse(valor);
        return Array.isArray(habilidades) ? habilidades : [];
    } catch (erro) {
        return [];
    }
}

function resumirTexto(texto, limite = 120) {
    if (!texto || texto.length <= limite) {
        return texto || "";
    }

    return texto.slice(0, limite).trim() + "...";
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
    return usuarioLogado?.tipo === "prestador" || usuarioLogado?.tipo === "admin";
}

function podeGerenciarRegistro(objeto) {
    return usuarioLogado?.tipo === "admin" || (
        usuarioLogado?.tipo === "prestador" &&
        Number(objeto.id_usuario) === Number(usuarioLogado?.id)
    );
}

function podeSolicitarServico(objeto) {
    if (!usuarioLogado) {
        return false;
    }
    if (usuarioLogado.tipo !== "cliente" && usuarioLogado.tipo !== "admin") {
        return false;
    }
    if (Number(objeto.id_usuario) === Number(usuarioLogado.id)) {
        return false;
    }
    return true;
}

function renderizarBotaoSolicitacao(objeto) {
    if (!podeSolicitarServico(objeto)) {
        return "";
    }

    const nomeServico = (objeto.nome || "servico").replace(/'/g, "\\'");
    return `
        <button class="btn btn-card-primary btn-sm w-100" onclick="abrirModalSolicitacao(${objeto.id}, '${nomeServico}')">
            <i class="bi bi-send me-1"></i>Enviar solicitacao
        </button>
    `;
}

let servicoSolicitacaoAtual = null;

function abrirModalSolicitacao(idServico, nomeServico) {
    servicoSolicitacaoAtual = Number(idServico);
    document.getElementById("solicitacao_id_servico").value = String(idServico);
    document.getElementById("modalSolicitacaoTitulo").textContent = `Solicitar: ${nomeServico}`;
    document.getElementById("solicitacao_titulo").value = "";
    document.getElementById("solicitacao_descricao").value = "";
    document.getElementById("solicitacao_categoria").value = "";
    document.getElementById("solicitacao_valor").value = "";
    document.getElementById("solicitacao_localidade").value = "";

    const modal = bootstrap.Modal.getOrCreateInstance(document.getElementById("modalSolicitacao"));
    modal.show();
}

async function enviarSolicitacaoServico() {
    const formData = new FormData();
    formData.append("id_servico", document.getElementById("solicitacao_id_servico").value);
    formData.append("titulo", document.getElementById("solicitacao_titulo").value.trim());
    formData.append("descricao", document.getElementById("solicitacao_descricao").value.trim());
    formData.append("categoria", document.getElementById("solicitacao_categoria").value);
    formData.append("localidade", document.getElementById("solicitacao_localidade").value.trim());
    formData.append("valor", document.getElementById("solicitacao_valor").value || "0");

    try {
        const retorno = await fetch("../../../home/php/fluxo_solicitacao.php", {
            method: "POST",
            credentials: "same-origin",
            body: formData,
        });
        const resposta = await retorno.json();

        if (resposta.status === "ok") {
            alert(resposta.mensagem + " Acompanhe as respostas em Mensagens no seu perfil.");
            bootstrap.Modal.getInstance(document.getElementById("modalSolicitacao"))?.hide();
        } else {
            alert("Erro: " + (resposta.mensagem || "Falha ao enviar."));
        }
    } catch (erro) {
        console.error(erro);
        alert("Nao foi possivel enviar a solicitacao.");
    }
}

function escaparHtml(valor) {
    const elemento = document.createElement("span");
    elemento.textContent = valor;
    return elemento.innerHTML;
}
