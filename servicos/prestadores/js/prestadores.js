let usuarioLogado = null;
let registrosServicos = [];
let usuarioLocalizacao = null;
let usuarioEndereco = null;
const cacheGeocoding = new Map();

document.addEventListener("DOMContentLoaded", () => {
    iniciarPagina();
    const botaoEnviarAvaliacao = document.getElementById("avaliacaoEnviar");
    if (botaoEnviarAvaliacao) {
        botaoEnviarAvaliacao.addEventListener("click", enviarAvaliacao);
    }
});

async function iniciarPagina() {
    const sessao = await valida_sessao();
    usuarioLogado = sessao.data;
    usuarioEndereco = usuarioLogado?.endereco || null;

    await obterLocalizacaoUsuario();
    atualizarStatusLocalizacao();
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
    document.getElementById("filtroAvaliacaoMedia").addEventListener("input", () => {
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

        const registros = Array.isArray(resposta.data) ? resposta.data : [];
        servicosPrestadores = ordenarServicosPorComentarioRecente(registros, 'data_avaliacao_contratante');
        mediasPrestador = calcularMediasPrestadores(servicosPrestadores);
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
    const filtroAvaliacaoMedia = document.getElementById("filtroAvaliacaoMedia").value;
    const valorAvaliacao = parseFloat(filtroAvaliacaoMedia);

    return servicosPrestadores.filter((servico) => {
        if (categoria && servico.tipo !== categoria) {
            return false;
        }

        if (filtroAvaliacaoMedia && !Number.isNaN(valorAvaliacao)) {
            const media = mediasPrestador.get(Number(servico.id_usuario)) || 0;
            return media >= valorAvaliacao;
        }

        return true;
    });
}

function calcularMediasPrestadores(servicos) {
    const acumulador = new Map();

    servicos.forEach((servico) => {
        const idUsuario = Number(servico.id_usuario);
        const nota = Number(servico.nota_contratante);
        if (Number.isNaN(idUsuario) || idUsuario <= 0 || Number.isNaN(nota) || nota < 1 || nota > 5) {
            return;
        }

        const registro = acumulador.get(idUsuario) || { total: 0, count: 0 };
        registro.total += nota;
        registro.count += 1;
        acumulador.set(idUsuario, registro);
    });

    const medias = new Map();
    acumulador.forEach((registro, idUsuario) => {
        medias.set(idUsuario, registro.total / registro.count);
    });
    return medias;
}

function gerarMensagemVazio() {
    const filtroAvaliacaoMedia = document.getElementById("filtroAvaliacaoMedia").value;
    const valorAvaliacao = parseFloat(filtroAvaliacaoMedia);
    if (filtroAvaliacaoMedia && !Number.isNaN(valorAvaliacao)) {
        return `Não há nenhum serviço com média maior ou igual a ${valorAvaliacao.toFixed(1)}`;
    }
    return "Nenhum serviço encontrado para o filtro escolhido.";
}

function obterMediaPrestador(idUsuario) {
    return mediasPrestador.get(Number(idUsuario)) || 0;
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

function configurarFiltros() {
    const botao = document.getElementById("abrirFiltros");
    const painel = document.getElementById("filtrosPainel");
    const filtroDistancia = document.getElementById("filtroDistancia");
    const filtroTipo = document.getElementById("filtroTipo");
    const filtroPrecoMin = document.getElementById("filtroPrecoMin");
    const filtroPrecoMax = document.getElementById("filtroPrecoMax");
    const botaoLimpar = document.getElementById("limparFiltros");

    if (!botao || !painel) {
        return;
    }

    return `
        <div class="col-md-6 col-xl-4">
            <div class="card service-card ${estaSelecionado ? "service-card-selected" : ""}">
                ${renderizarFoto(objeto)}
                <div class="card-body d-flex flex-column">
                    <div class="d-flex justify-content-between align-items-start gap-3 mb-3">
                        <span class="service-badge">${escaparHtml(formatarCategoria(objeto.tipo))}</span>
                        <span class="service-price">${formatarMoeda(objeto.valor)}</span>
                    </div>

    filtroDistancia?.addEventListener("input", () => {
        atualizarDistanciaSelecionada();
        renderizarLista();
    });
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

function initDistanceFilter() {
    // Função mantida para compatibilidade, mas não faz nada agora
}

async function obterLocalizacaoUsuario() {
    if (usuarioEndereco) {
        const coordenadas = await converterLocalidadeEmLatLng(usuarioEndereco);
        if (coordenadas) {
            usuarioLocalizacao = coordenadas;
            return usuarioLocalizacao;
        }
    }

    return new Promise((resolve) => {
        if (!navigator.geolocation) {
            resolve(null);
            return;
        }

        navigator.geolocation.getCurrentPosition((posicao) => {
            usuarioLocalizacao = {
                lat: posicao.coords.latitude,
                lng: posicao.coords.longitude
            };
            resolve(usuarioLocalizacao);
        }, () => {
            resolve(null);
        }, {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 60000
        });
    });
}

function atualizarStatusLocalizacao() {
    const status = document.getElementById("localizacaoStatus");
    const filtroDistancia = document.getElementById("filtroDistancia");

    if (!status) {
        return;
    }

    if (!usuarioLocalizacao) {
        status.textContent = usuarioEndereco
            ? "Endereço informado, mas localização não pôde ser calculada. Verifique o endereço ou tente novamente mais tarde."
            : "Localização ou endereço não disponível. Filtro de distância inativo.";
        if (filtroDistancia) {
            filtroDistancia.disabled = true;
        }
    } else {
        status.textContent = "Filtro de distância ativado. Ajuste a distância para ver serviços próximos.";
        if (filtroDistancia) {
            filtroDistancia.disabled = false;
        }
    }
}

function atualizarDistanciaSelecionada() {
    const filtroDistancia = document.getElementById("filtroDistancia");
    const filtroDistanciaValor = document.getElementById("filtroDistanciaValor");

    if (!filtroDistancia || !filtroDistanciaValor) {
        return;
    }

    filtroDistanciaValor.textContent = `${filtroDistancia.value} km`;
}

async function converterLocalidadeEmLatLng(endereco) {
    if (!endereco) {
        return null;
    }

    const chave = normalizarTexto(endereco);
    if (cacheGeocoding.has(chave)) {
        return cacheGeocoding.get(chave);
    }

    try {
        const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(endereco)}`);
        const data = await response.json();
        if (data && data.length > 0) {
            const result = { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
            cacheGeocoding.set(chave, result);
            return result;
        }
    } catch (error) {
        console.error('Erro na geocodificação:', error);
    }

    cacheGeocoding.set(chave, null);
    return null;
}

function calcularDistanciaKm(origem, destino) {
    if (!origem || !destino) {
        return null;
    }

    const toRad = (valor) => (valor * Math.PI) / 180;
    const distanciaLat = toRad(destino.lat - origem.lat);
    const distanciaLng = toRad(destino.lng - origem.lng);
    const a = Math.sin(distanciaLat / 2) ** 2 + Math.cos(toRad(origem.lat)) * Math.cos(toRad(destino.lat)) * Math.sin(distanciaLng / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const raioTerraKm = 6371;
    return raioTerraKm * c;
}

async function obterDistanciaServico(objeto) {
    if (!usuarioLocalizacao || !objeto?.localidade) {
        return null;
    }

    const destino = await converterLocalidadeEmLatLng(objeto.localidade);
    if (!destino) {
        return null;
    }

    return calcularDistanciaKm(usuarioLocalizacao, destino);
}

async function renderizarLista() {
    const lista = document.getElementById("lista");

                    <div class="skills-list mb-3">${renderizarHabilidades(objeto.habilidades)}</div>

                    <div class="detail-block mb-3">
                        <strong class="d-block mb-2">Especialidades tecnicas</strong>
                        <span class="text-muted">${escaparHtml(resumirTexto(objeto.descricao_especialidades || "Nao informadas.", 120))}</span>
                    </div>

    const registrosFiltrados = await filtrarRegistros();

                    <div class="service-rating mb-3">
                        ${renderizarRating(objeto.nota_contratante, objeto.comentario_contratante, "Avaliação do prestador", objeto.nome_avaliador_contratante, objeto.data_avaliacao_contratante)}
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

                    ${podeAvaliarServico(objeto) ? `<button class="btn btn-outline-primary btn-sm w-100 mt-2" data-bs-toggle="modal" data-bs-target="#modalAvaliacao" onclick="abrirModalAvaliacao(${objeto.id})">Avaliar prestador</button>` : ""}
                    ${renderizarAcoesGerenciamento(objeto)}
                </div>
            </div>
        </div>
    `;
}

async function filtrarRegistros() {
    const tipo = document.getElementById("filtroTipo")?.value || "";
    const faixaPreco = obterFaixaPrecoFiltro();
    const distanciaMax = Number(document.getElementById("filtroDistancia")?.value || 0);
    const distanciaAtiva = usuarioLocalizacao && distanciaMax > 0;

    const registrosComDistancia = await Promise.all(registrosServicos.map(async (objeto) => {
        if (distanciaAtiva) {
            objeto.distanciaKm = await obterDistanciaServico(objeto);
        } else {
            objeto.distanciaKm = null;
        }
        return objeto;
    }));

    return registrosComDistancia.filter((objeto) => {
        const tipoOk = !tipo || normalizarTexto(objeto.tipo) === normalizarTexto(tipo);
        const valorServico = obterValorServico(objeto);
        const precoOk = valorServico >= faixaPreco.minimo && valorServico <= faixaPreco.maximo;
        const distanciaOk = !distanciaAtiva || (typeof objeto.distanciaKm === "number" && objeto.distanciaKm <= distanciaMax);

        return tipoOk && precoOk && distanciaOk;
    });
}

function limparFiltros() {
    const filtroDistancia = document.getElementById("filtroDistancia");
    const filtroTipo = document.getElementById("filtroTipo");
    const filtroPrecoMin = document.getElementById("filtroPrecoMin");
    const filtroPrecoMax = document.getElementById("filtroPrecoMax");

    if (filtroDistancia) {
        filtroDistancia.value = "25";
        atualizarDistanciaSelecionada();
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
    document.getElementById("modalDetalhePrestador").textContent = servico.nome_usuario || "Prestador";
    document.getElementById("modalDetalheValor").textContent = formatarMoeda(servico.valor);
    document.getElementById("modalDetalheProfissao").textContent = servico.profissao || "Nao informada";
    document.getElementById("modalDetalheCategoria").textContent = formatarCategoria(servico.tipo);
    document.getElementById("modalDetalheLocalidade").textContent = servico.localidade || "Nao informada";
    document.getElementById("modalDetalheHabilidades").innerHTML = renderizarHabilidades(servico.habilidades);
    document.getElementById("modalDetalheEspecialidades").textContent = servico.descricao_especialidades || "Nao informadas.";

    const avaliacoesPrestador = obterAvaliacoesDoPrestador(servico.id_usuario);
    document.getElementById("modalDetalheAvaliacaoMedia").innerHTML = renderizarAvaliacaoMedia(avaliacoesPrestador);
    document.getElementById("modalDetalheAvaliacoesLista").innerHTML = renderizarAvaliacoesDoPrestador(avaliacoesPrestador);

    document.getElementById("modalDetalheDescricao").textContent = servico.descricao || "Sem descricao cadastrada.";
}

function obterAvaliacoesDoPrestador(idUsuario) {
    return servicosPrestadores
        .filter((item) => Number(item.id_usuario) === Number(idUsuario))
        .filter((item) => {
            const nota = Number(item.nota_contratante);
            return !Number.isNaN(nota) && nota >= 1 && nota <= 5;
        })
        .sort((a, b) => {
            const dataA = a.data_avaliacao_contratante ? new Date(a.data_avaliacao_contratante).getTime() : 0;
            const dataB = b.data_avaliacao_contratante ? new Date(b.data_avaliacao_contratante).getTime() : 0;
            return dataB - dataA;
        });
}

function calcularMediaAvaliacoes(avaliacoes) {
    const notas = avaliacoes
        .map((item) => Number(item.nota_contratante))
        .filter((nota) => !Number.isNaN(nota) && nota >= 1 && nota <= 5);

    if (notas.length === 0) {
        return 0;
    }

    const soma = notas.reduce((acc, nota) => acc + nota, 0);
    return soma / notas.length;
}

function renderizarAvaliacaoMedia(avaliacoes) {
    if (avaliacoes.length === 0) {
        return `<div class="text-muted small">Este profissional ainda não possui avaliações.</div>`;
    }

    const media = calcularMediaAvaliacoes(avaliacoes);
    const estrelas = renderizarEstrelas(Math.round(media));
    return `
        <div class="rating-summary">
            <strong>Nota média:</strong>
            <span class="ms-2">${estrelas}</span>
            <span class="small text-secondary ms-2">${media.toFixed(1)} de 5 (${avaliacoes.length} avaliação${avaliacoes.length > 1 ? 'ões' : 'ão'})</span>
        </div>
    `;
}

function renderizarAvaliacoesDoPrestador(avaliacoes) {
    if (avaliacoes.length === 0) {
        return `<div class="text-muted small">Nenhuma avaliação encontrada para este profissional.</div>`;
    }

    return avaliacoes.map((avaliacao) => {
        const nota = Number(avaliacao.nota_contratante);
        return `
            <div class="mb-3 p-3 bg-light rounded">
                <div class="d-flex justify-content-between align-items-start gap-2 mb-2">
                    <div>
                        <strong>${escaparHtml(avaliacao.nome || 'Serviço avaliado')}</strong>
                        <div class="small text-secondary">${escaparHtml(avaliacao.nome_avaliador_contratante || 'Contratante')} · ${escaparHtml(formatarDataAvaliacao(avaliacao.data_avaliacao_contratante || ''))}</div>
                    </div>
                    <div>${renderizarEstrelas(nota)}</div>
                </div>
                ${avaliacao.comentario_contratante ? `<p class="small text-muted mb-0">${escaparHtml(avaliacao.comentario_contratante)}</p>` : '<div class="small text-secondary">Sem comentário.</div>'}
            </div>
        `;
    }).join('');
}

function podeAvaliarServico(objeto) {
    return usuarioLogado?.tipo === "contratante" && Number(objeto.id_usuario) !== Number(usuarioLogado?.id);
}

function abrirModalAvaliacao(id) {
    const servico = servicosPrestadores.find((item) => Number(item.id) === Number(id));
    if (!servico) {
        return;
    }

    servicoAvaliacao = servico;
    document.getElementById("avaliacaoServicoId").value = id;
    document.getElementById("avaliacaoTitulo").textContent = `Avaliar ${servico.nome || "serviço"}`;
    document.getElementById("avaliacaoNota").value = servico.nota_contratante || "";
    document.getElementById("avaliacaoComentario").value = servico.comentario_contratante || "";
}

async function enviarAvaliacao() {
    if (!servicoAvaliacao) {
        alert("Nenhum serviço selecionado para avaliação.");
        return;
    }

    const id = document.getElementById("avaliacaoServicoId").value;
    const nota = document.getElementById("avaliacaoNota").value;
    const comentario = document.getElementById("avaliacaoComentario").value.trim();

    if (!id || !nota) {
        alert("Informe a nota da avaliação.");
        return;
    }

    const fd = new FormData();
    fd.append("id", id);
    fd.append("nota", nota);
    fd.append("comentario", comentario);

    try {
        const retorno = await fetch("../../php/avaliacao.php", {
            method: "POST",
            credentials: "same-origin",
            body: fd
        });
        const resposta = await retorno.json();

        if (resposta.status === "ok") {
            alert("Avaliação enviada com sucesso.");
            const servico = servicosPrestadores.find((item) => Number(item.id) === Number(id));
            if (servico) {
                servico.nota_contratante = Number(nota);
                servico.comentario_contratante = comentario;
            }
            const modal = bootstrap.Modal.getInstance(document.getElementById("modalAvaliacao"));
            modal?.hide();
            renderizarLista();
        } else {
            alert("Erro: " + resposta.mensagem);
        }
    } catch (erro) {
        console.error(erro);
        alert("Erro ao enviar avaliação. Verifique o servidor.");
    }
}

function renderizarRating(nota, comentario, label, autor, data) {
    const notaNumero = Number(nota);
    if (!notaNumero || notaNumero < 1) {
        return `<div class="text-muted small">Sem avaliação ainda.</div>`;
    }

    const partes = [];
    partes.push(`<strong>${escaparHtml(label)}:</strong>`);
    partes.push(`<span class="ms-2">${renderizarEstrelas(notaNumero)}</span>`);

    if (autor) {
        partes.push(`<div class="small text-secondary mt-1">Avaliado por: ${escaparHtml(autor)}</div>`);
    }
    if (data) {
        partes.push(`<div class="small text-secondary">${escaparHtml(formatarDataAvaliacao(data))}</div>`);
    }
    if (comentario) {
        partes.push(`<p class="small text-muted mt-2">${escaparHtml(comentario)}</p>`);
    }

    return `<div class="rating-summary">${partes.join('')}</div>`;
}

function formatarDataAvaliacao(data) {
    const dataObj = new Date(data);
    if (Number.isNaN(dataObj.getTime())) {
        return '';
    }
    return dataObj.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function ordenarServicosPorComentarioRecente(registros, campoData) {
    return registros.slice().sort((a, b) => {
        const dataA = a[campoData] ? new Date(a[campoData]).getTime() : 0;
        const dataB = b[campoData] ? new Date(b[campoData]).getTime() : 0;

        if (dataA === dataB) {
            return Number(b.id) - Number(a.id);
        }

        return dataB - dataA;
    });
}

function renderizarEstrelas(nota) {
    const estrelas = [];
    for (let i = 1; i <= 5; i += 1) {
        estrelas.push(i <= nota ? '<i class="bi bi-star-fill text-warning"></i>' : '<i class="bi bi-star text-muted"></i>');
    }
    return estrelas.join("");
}

function renderizarVazio(mensagem = "Nenhum servico de prestador foi encontrado no momento.") {
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

                    <p class="mb-2">
                        <i class="bi bi-geo-alt text-success me-1"></i>
                        <strong>Localidade:</strong> ${escaparHtml(objeto.localidade || "Não informada")}
                    </p>
                    <p class="mb-4">
                        <i class="bi bi-clock-history text-secondary me-1"></i>
                        <strong>Distância:</strong> ${objeto.distanciaKm != null ? escaparHtml(objeto.distanciaKm.toFixed(1) + " km") : "Não disponível"}
                    </p>

                    ${renderizarAcoes(objeto)}
                </div>
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
    return usuarioLogado?.tipo === "prestador" || usuarioLogado?.tipo === "adm";
}

function podeGerenciarRegistro(objeto) {
    return usuarioLogado?.tipo === "adm" || (
        usuarioLogado?.tipo === "prestador" &&
        Number(objeto.id_usuario) === Number(usuarioLogado?.id)
    );
}

function escaparHtml(valor) {
    const elemento = document.createElement("span");
    elemento.textContent = valor;
    return elemento.innerHTML;
}
