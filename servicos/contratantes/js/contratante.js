// Controla a vitrine de chamados de clientes: filtros, detalhes, propostas e gerenciamento.
let usuarioLogado = null;
let servicosContratantes = [];

document.addEventListener("DOMContentLoaded", () => {
    iniciarPagina();
});

// Valida a sessao, carrega permissao da pessoa logada e inicializa a tela.
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

// Encerra a sessao atual e volta para o login.
async function logoff() {
    const retorno = await fetch("../../../home/php/usuario_logoff.php");
    const resposta = await retorno.json();

    if (resposta.status === "ok") {
        window.location.href = "../../../home/html/login.html";
    } else {
        alert("Falha ao efetuar logoff.");
    }
}

// Busca no backend a lista de chamados de clientes disponiveis.
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

// Liga os campos de filtro para re-renderizar a lista em tempo real.
function configurarFiltros() {
    const categoria = document.getElementById("filtroCategoria");
    const localidade = document.getElementById("filtroLocalidade");
    const notaMedia = document.getElementById("filtroNotaMedia");
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

    [categoria, localidade, notaMedia, precoMin, precoMax].forEach((el) => {
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
            if (notaMedia) notaMedia.value = "0";
            if (precoMin) precoMin.value = 0;
            if (precoMax) precoMax.value = 90;
            atualizarValoresPreco();
            renderizarLista();
        });
    }
}

// Renderiza a grade principal de cards com base nos filtros atuais.
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

// Aplica todos os filtros ativos sobre os chamados carregados em memoria.
function obterServicosFiltrados() {
    const categoria = (document.getElementById("filtroCategoria") || {}).value || "";
    const localidade = (document.getElementById("filtroLocalidade") || {}).value || "";
    const precoMin = Number((document.getElementById("filtroPrecoMin") || {}).value || 0);
    const precoMax = Number((document.getElementById("filtroPrecoMax") || {}).value || 0);
    const notaMedia = Number((document.getElementById("filtroNotaMedia") || {}).value || 0);

    return servicosContratantes.filter((servico) => {
        const notaRegistro = Number(servico.nota_media || 0);
        if (!Number.isNaN(notaMedia) && notaMedia > 0 && (Number.isNaN(notaRegistro) || notaRegistro < notaMedia)) return false;
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

// Atualiza o resumo visual com a quantidade de chamados exibidos.
function atualizarResultadoResumo(total) {
    const resumo = document.getElementById("resultadoResumo");
    if (!resumo) return;
    resumo.textContent = total === 1 ? "1 chamado exibido" : `${total} chamados exibidos`;
}

// Exclui um chamado do proprio usuario quando a permissao permite.
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

// Monta o card visual de um chamado publicado por cliente.
function renderizarCardChamado(objeto) {
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
                        ${linkPerfilUsuario(objeto.id_usuario, objeto.nome_usuario, `Ver perfil de ${objeto.nome_usuario || "cliente"}`)}
                    </div>
                    ${Number(objeto.nota_media) > 0 ? `<div class="text-secondary small mb-2">Avaliação: ${Number(objeto.nota_media).toFixed(1)} &#9733;</div>` : ""}

                    <p class="card-text text-muted service-description-clamp mb-3">${escaparHtml(objeto.descricao || "Sem descricao cadastrada.")}</p>

                    <p class="service-meta mb-4">
                        <span><i class="bi bi-geo-alt text-success me-1"></i>${escaparHtml(objeto.localidade || "Nao informada")}</span>
                    </p>

                    <div class="service-card-actions mt-auto">
                        <button class="btn btn-card-secondary btn-sm w-100" data-bs-toggle="modal" data-bs-target="#modalDetalheChamado" onclick="abrirDetalheChamado(${objeto.id})">
                            <i class="bi bi-eye me-1"></i>Ver detalhes
                        </button>
                        ${renderizarBotaoAceitarTrabalho(objeto)}
                        ${renderizarAcoes(objeto)}
                    </div>
                </div>
            </div>
        </div>
    `;
}

// Renderiza so a foto principal do chamado.
function renderizarFoto(objeto) {
    const foto = obterPrimeiraFoto(objeto.foto);

    if (!foto) {
        return "";
    }

    return `<img src="${escaparHtml(foto)}" class="service-photo" alt="Foto do chamado">`;
}

// Aceita string simples ou JSON com varias fotos e devolve a primeira.
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

// Mostra botoes de alterar/excluir apenas para quem pode gerenciar o registro.
function renderizarAcoes(objeto) {
    if (!podeGerenciarRegistro(objeto)) {
        return "";
    }

    return `
        <div class="service-card-actions-row">
            <a href="contratante_alterar.html?id=${objeto.id}" class="btn btn-card-edit btn-sm w-50">Alterar</a>
            <button class="btn btn-card-delete btn-sm w-50" onclick="excluir(${objeto.id})">Excluir</button>
        </div>
    `;
}

// Preenche o modal de detalhes com os dados do chamado selecionado.
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

// Template de estado vazio da listagem.
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

// Formata valores monetarios no padrao brasileiro.
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

// Garante um fallback quando a categoria nao vier preenchida.
function formatarCategoria(categoria) {
    return categoria || "Sem categoria";
}

// Esconde o botao de criar quando o tipo de usuario nao pode publicar nesta aba.
function aplicarPermissoes() {
    const botaoNovo = document.getElementById("novo");

    if (!podeCriar()) {
        botaoNovo.classList.add("d-none");
    }
}

// Define quem pode criar chamados na aba de contratantes.
function podeCriar() {
    return usuarioLogado?.tipo === "cliente" || usuarioLogado?.tipo === "admin";
}

// Define quem pode alterar/excluir um chamado especifico.
function podeGerenciarRegistro(objeto) {
    return usuarioLogado?.tipo === "admin" || (
        usuarioLogado?.tipo === "cliente" &&
        Number(objeto.id_usuario) === Number(usuarioLogado?.id)
    );
}

// Define quem pode enviar proposta para assumir este trabalho.
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

// Renderiza o botao de proposta apenas para prestadores/admins elegiveis.
function renderizarBotaoAceitarTrabalho(objeto) {
    if (!podeAceitarTrabalho(objeto)) {
        return "";
    }

    const nomeChamado = (objeto.nome || "chamado").replace(/'/g, "\\'");
    return `
        <button class="btn btn-card-primary btn-sm w-100" onclick="enviarPropostaTrabalho(${objeto.id}, '${nomeChamado}')">
            <i class="bi bi-hand-thumbs-up me-1"></i>Aceitar trabalho
        </button>
    `;
}

// Envia ao backend a proposta do prestador para trabalhar neste chamado.
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

// Escapa caracteres especiais antes de injetar texto em HTML.
function escaparHtml(valor) {
    const elemento = document.createElement("span");
    elemento.textContent = valor;
    return elemento.innerHTML;
}
