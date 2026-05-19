let usuarioLogado = null;
let servicosPrestadores = [];
let idsComparacao = [];

const LIMITE_COMPARACAO = 3;

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
    document.getElementById("filtroCategoria").addEventListener("change", () => {
        renderizarLista();
    });
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
            renderizarPainelComparacao();
            atualizarContadorOrcamentos(0);
            return;
        }

        servicosPrestadores = Array.isArray(resposta.data) ? resposta.data : [];
        renderizarLista();
    } catch (erro) {
        console.error(erro);
        servicosPrestadores = [];
        lista.innerHTML = renderizarVazio("Nao foi possivel carregar os servicos agora.");
        renderizarPainelComparacao();
        atualizarContadorOrcamentos(0);
    }
}

function renderizarLista() {
    const lista = document.getElementById("lista");
    const registros = obterServicosFiltrados();

    if (registros.length === 0) {
        lista.innerHTML = renderizarVazio(gerarMensagemVazio());
        atualizarContadorOrcamentos(0);
        renderizarPainelComparacao();
        return;
    }

    lista.innerHTML = registros.map(renderizarCardServico).join("");
    atualizarContadorOrcamentos(registros.length);
    renderizarPainelComparacao();
}

function obterServicosFiltrados() {
    const categoria = document.getElementById("filtroCategoria").value;

    return servicosPrestadores.filter((servico) => {
        if (categoria && servico.tipo !== categoria) {
            return false;
        }

        return true;
    });
}

function gerarMensagemVazio() {
    return "Nenhum servico encontrado para o filtro escolhido.";
}

function atualizarContadorOrcamentos(total) {
    const contador = document.getElementById("contadorOrcamentos");
    contador.textContent = total === 1 ? "1 opcao disponivel para comparacao." : `${total} opcoes disponiveis para comparacao.`;
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
    const estaSelecionado = idsComparacao.includes(Number(objeto.id));

    return `
        <div class="col-md-6 col-xl-4">
            <div class="card service-card ${estaSelecionado ? "service-card-selected" : ""}">
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

                    <div class="mt-auto d-flex gap-2 mb-2">
                        <button class="btn ${estaSelecionado ? "btn-outline-secondary" : "btn-outline-success"} btn-sm w-50" onclick="alternarComparacao(${objeto.id})">
                            ${estaSelecionado ? "Remover" : "Comparar"}
                        </button>
                        <button class="btn btn-brand btn-sm w-50" data-bs-toggle="modal" data-bs-target="#modalDetalheOrcamento" onclick="abrirDetalheOrcamento(${objeto.id})">
                            Ver detalhes
                        </button>
                    </div>

                    ${renderizarAcoesGerenciamento(objeto)}
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
        <div class="d-flex gap-2">
            <a href="prestador_alterar.html?id=${objeto.id}" class="btn btn-warning btn-sm text-dark w-50">Alterar</a>
            <button class="btn btn-danger btn-sm w-50" onclick="excluir(${objeto.id})">Excluir</button>
        </div>
    `;
}

function alternarComparacao(id) {
    const idNumerico = Number(id);
    const indice = idsComparacao.indexOf(idNumerico);

    if (indice >= 0) {
        idsComparacao.splice(indice, 1);
    } else {
        if (idsComparacao.length >= LIMITE_COMPARACAO) {
            alert("Voce pode comparar ate 3 servicos por vez.");
            return;
        }

        idsComparacao.push(idNumerico);
    }

    renderizarLista();
}

function renderizarPainelComparacao() {
    const painel = document.getElementById("painelComparacao");
    const selecionados = obterServicosSelecionados();

    if (selecionados.length === 0) {
        painel.innerHTML = `
            <div class="comparison-panel compare-empty">
                <h3 class="h5 mb-2">Quadro comparativo</h3>
                <p class="mb-0 text-muted">Selecione servicos na lista para comparar valores, especialidades e descricao completa do orcamento.</p>
            </div>
        `;
        return;
    }

    painel.innerHTML = `
        <div class="comparison-panel">
            <div class="d-flex flex-column flex-lg-row justify-content-between align-items-lg-center gap-2 mb-3">
                <div>
                    <p class="section-kicker mb-2">Comparacao ativa</p>
                    <h3 class="h4 mb-1">Visao lado a lado dos orcamentos</h3>
                    <p class="text-secondary mb-0">Compare custo-beneficio e abra o detalhe de qualquer opcao quando quiser.</p>
                </div>
                <div class="d-flex flex-wrap align-items-center gap-2">
                    <span class="comparison-pill">${selecionados.length}/${LIMITE_COMPARACAO} selecionados</span>
                    <button type="button" class="btn btn-outline-secondary btn-sm" onclick="limparComparacao()">Limpar</button>
                </div>
            </div>

            <div class="table-responsive">
                <table class="table compare-table align-middle mb-0">
                    <thead>
                        <tr>
                            <th>Criterio</th>
                            ${selecionados.map((servico) => `<th>${escaparHtml(servico.nome || "Servico")}</th>`).join("")}
                        </tr>
                    </thead>
                    <tbody>
                        ${renderizarLinhaComparacao("Prestador", selecionados.map((servico) => escaparHtml(servico.nome_usuario || "Prestador")))}
                        ${renderizarLinhaComparacao("Profissao", selecionados.map((servico) => escaparHtml(servico.profissao || "Nao informada")))}
                        ${renderizarLinhaComparacao("Categoria", selecionados.map((servico) => escaparHtml(formatarCategoria(servico.tipo))))}
                        ${renderizarLinhaComparacao("Valor", selecionados.map((servico) => escaparHtml(formatarMoeda(servico.valor))))}
                        ${renderizarLinhaComparacao("Custo-beneficio", selecionados.map((servico) => renderizarIndicadorCusto(servico, selecionados)))}
                        ${renderizarLinhaComparacao("Localidade", selecionados.map((servico) => escaparHtml(servico.localidade || "Nao informada")))}
                        ${renderizarLinhaComparacao("Habilidades", selecionados.map((servico) => renderizarHabilidades(servico.habilidades)))}
                        ${renderizarLinhaComparacao("Especialidades", selecionados.map((servico) => escaparHtml(resumirTexto(servico.descricao_especialidades || "Nao informadas.", 140))))}
                        ${renderizarLinhaComparacao("Descricao do orcamento", selecionados.map((servico) => escaparHtml(resumirTexto(servico.descricao || "Sem descricao.", 180))))}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

function renderizarLinhaComparacao(rotulo, colunas) {
    return `
        <tr>
            <th>${rotulo}</th>
            ${colunas.map((coluna) => `<td>${coluna}</td>`).join("")}
        </tr>
    `;
}

function renderizarIndicadorCusto(servico, selecionados) {
    const valoresValidos = selecionados
        .map((item) => Number(item.valor))
        .filter((valor) => !Number.isNaN(valor) && valor > 0);

    const valorAtual = Number(servico.valor);
    if (valoresValidos.length === 0 || Number.isNaN(valorAtual) || valorAtual <= 0) {
        return '<span class="comparison-pill muted">A negociar</span>';
    }

    const menorValor = Math.min(...valoresValidos);
    if (valorAtual === menorValor) {
        return '<span class="comparison-pill success">Menor valor</span>';
    }

    return '<span class="comparison-pill">Acima do menor valor</span>';
}

function obterServicosSelecionados() {
    return idsComparacao
        .map((id) => servicosPrestadores.find((servico) => Number(servico.id) === Number(id)))
        .filter(Boolean);
}

function limparComparacao() {
    idsComparacao = [];
    renderizarLista();
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

function escaparHtml(valor) {
    const elemento = document.createElement("span");
    elemento.textContent = valor;
    return elemento.innerHTML;
}
