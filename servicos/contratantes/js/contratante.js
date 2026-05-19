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
    await carregarDados();
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
        const retorno = await fetch("../php/contratantes_get.php", {
            credentials: "same-origin"
        });
        const resposta = await retorno.json();

        if (resposta.status !== "ok") {
            lista.innerHTML = renderizarVazio();
            return;
        }

        const registros = Array.isArray(resposta.data) ? resposta.data : [];
        servicosContratantes = ordenarServicosPorComentarioRecente(registros, 'data_avaliacao_prestador');
        if (servicosContratantes.length === 0) {
            lista.innerHTML = renderizarVazio();
            return;
        }

        lista.innerHTML = servicosContratantes.map(renderizarCardChamado).join("");
    } catch (erro) {
        console.error(erro);
        lista.innerHTML = renderizarVazio("Nao foi possivel carregar os chamados agora.");
    }
}

async function excluir(id) {
    if (!podeCriar()) {
        alert("Apenas contratantes podem excluir chamados nesta aba.");
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

    botao.addEventListener("click", () => {
        const abrir = botao.getAttribute("aria-expanded") !== "true";
        botao.setAttribute("aria-expanded", abrir ? "true" : "false");
        botao.classList.toggle("is-open", abrir);
        painel.hidden = !abrir;
    });

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

    if (!lista) {
        return;
    }

    if (registrosServicos.length === 0) {
        lista.innerHTML = renderizarVazio();
        return;
    }

    const registrosFiltrados = await filtrarRegistros();

    if (registrosFiltrados.length === 0) {
        lista.innerHTML = renderizarSemResultados();
        return;
    }

    lista.innerHTML = registrosFiltrados.map(renderizarCardServico).join("");
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
        <div class="col-md-6 col-xl-4">
            <div class="card service-card">
                ${renderizarFoto(objeto)}
                <div class="card-body d-flex flex-column">
                    <div class="d-flex justify-content-between align-items-start gap-3 mb-3">
                        <span class="service-badge">${escaparHtml(formatarCategoria(objeto.tipo))}</span>
                        <span class="service-price">${formatarMoeda(objeto.valor)}</span>
                    </div>

                    <h5 class="card-title fw-bold mb-2">${escaparHtml(objeto.nome || "Sem nome")}</h5>
                    <p class="text-secondary small mb-3">
                        <i class="bi bi-person me-1"></i>
                        ${escaparHtml(objeto.nome_usuario || "Contratante")}
                    </p>

                    <p class="card-text text-muted service-description-clamp mb-3">${escaparHtml(objeto.descricao || "Sem descricao cadastrada.")}</p>

                    <p class="mb-2">
                        <i class="bi bi-geo-alt text-success me-1"></i>
                        <strong>Localidade:</strong> ${escaparHtml(objeto.localidade || "Não informada")}
                    </p>
                    <p class="mb-4">
                        <i class="bi bi-clock-history text-secondary me-1"></i>
                        <strong>Distância:</strong> ${objeto.distanciaKm != null ? escaparHtml(objeto.distanciaKm.toFixed(1) + " km") : "Não disponível"}
                    </p>

                    <div class="mt-auto d-flex flex-column gap-2">
                        <button class="btn btn-outline-secondary btn-sm w-100" data-bs-toggle="modal" data-bs-target="#modalDetalheChamado" onclick="abrirDetalheChamado(${objeto.id})">Ver detalhes</button>
                        ${podeAvaliarServico(objeto) ? `<button class="btn btn-outline-primary btn-sm w-100" data-bs-toggle="modal" data-bs-target="#modalAvaliacao" onclick="abrirModalAvaliacao(${objeto.id})">Avaliar contratante</button>` : ""}
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
    document.getElementById("modalDetalheChamadoContratante").textContent = servico.nome_usuario || "Contratante";
    document.getElementById("modalDetalheChamadoValor").textContent = formatarMoeda(servico.valor);
    document.getElementById("modalDetalheChamadoCategoria").textContent = formatarCategoria(servico.tipo);
    document.getElementById("modalDetalheChamadoLocalidade").textContent = servico.localidade || "Nao informada";
    document.getElementById("modalDetalheChamadoDescricao").textContent = servico.descricao || "Sem descricao cadastrada.";

    const avaliacoesContratante = obterAvaliacoesDoContratante(servico.id_usuario);
    document.getElementById("modalDetalheAvaliacaoMedia").innerHTML = renderizarAvaliacaoMedia(avaliacoesContratante);
    document.getElementById("modalDetalheAvaliacoesLista").innerHTML = renderizarAvaliacoesDoContratante(avaliacoesContratante);
}

function obterAvaliacoesDoContratante(idUsuario) {
    return servicosContratantes
        .filter((item) => Number(item.id_usuario) === Number(idUsuario))
        .filter((item) => {
            const nota = Number(item.nota_prestador);
            return !Number.isNaN(nota) && nota >= 1 && nota <= 5;
        })
        .sort((a, b) => {
            const dataA = a.data_avaliacao_prestador ? new Date(a.data_avaliacao_prestador).getTime() : 0;
            const dataB = b.data_avaliacao_prestador ? new Date(b.data_avaliacao_prestador).getTime() : 0;
            return dataB - dataA;
        });
}

function calcularMediaAvaliacoes(avaliacoes) {
    const notas = avaliacoes
        .map((item) => Number(item.nota_prestador))
        .filter((nota) => !Number.isNaN(nota) && nota >= 1 && nota <= 5);

    if (notas.length === 0) {
        return 0;
    }

    const soma = notas.reduce((acc, nota) => acc + nota, 0);
    return soma / notas.length;
}

function renderizarAvaliacaoMedia(avaliacoes) {
    if (avaliacoes.length === 0) {
        return `<div class="text-muted small">Este contratante ainda não possui avaliações.</div>`;
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

function renderizarAvaliacoesDoContratante(avaliacoes) {
    if (avaliacoes.length === 0) {
        return `<div class="text-muted small">Nenhuma avaliação encontrada para este contratante.</div>`;
    }

    return avaliacoes.map((avaliacao) => {
        const nota = Number(avaliacao.nota_prestador);
        return `
            <div class="mb-3 p-3 bg-light rounded">
                <div class="d-flex justify-content-between align-items-start gap-2 mb-2">
                    <div>
                        <strong>${escaparHtml(avaliacao.nome || 'Chamado avaliado')}</strong>
                        <div class="small text-secondary">${escaparHtml(avaliacao.nome_avaliador_prestador || 'Prestador')} · ${escaparHtml(formatarDataAvaliacao(avaliacao.data_avaliacao_prestador || ''))}</div>
                    </div>
                    <div>${renderizarEstrelas(nota)}</div>
                </div>
                ${avaliacao.comentario_prestador ? `<p class="small text-muted mb-0">${escaparHtml(avaliacao.comentario_prestador)}</p>` : '<div class="small text-secondary">Sem comentário.</div>'}
            </div>
        `;
    }).join('');
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
    return usuarioLogado?.tipo === "contratante" || usuarioLogado?.tipo === "adm";
}

function podeGerenciarRegistro(objeto) {
    return usuarioLogado?.tipo === "adm" || (
        usuarioLogado?.tipo === "contratante" &&
        Number(objeto.id_usuario) === Number(usuarioLogado?.id)
    );
}

function podeAvaliarServico(objeto) {
    return usuarioLogado?.tipo === "prestador" && Number(objeto.id_usuario) !== Number(usuarioLogado?.id);
}

function abrirModalAvaliacao(id) {
    const servico = servicosContratantes.find((item) => Number(item.id) === Number(id));
    if (!servico) {
        return;
    }

    servicoAvaliacao = servico;
    document.getElementById("avaliacaoServicoId").value = id;
    document.getElementById("avaliacaoTitulo").textContent = `Avaliar ${servico.nome || "serviço"}`;
    document.getElementById("avaliacaoNota").value = servico.nota_prestador || "";
    document.getElementById("avaliacaoComentario").value = servico.comentario_prestador || "";
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
            const servico = servicosContratantes.find((item) => Number(item.id) === Number(id));
            if (servico) {
                servico.nota_prestador = Number(nota);
                servico.comentario_prestador = comentario;
            }
            const modal = bootstrap.Modal.getInstance(document.getElementById("modalAvaliacao"));
            modal?.hide();
            await carregarDados();
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

function escaparHtml(valor) {
    const elemento = document.createElement("span");
    elemento.textContent = valor;
    return elemento.innerHTML;
}
