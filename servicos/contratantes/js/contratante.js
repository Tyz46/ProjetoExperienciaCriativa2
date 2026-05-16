let usuarioLogado = null;
let servicosContratantes = [];
let servicoAvaliacao = null;

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
                    <p class="text-secondary small mb-3">
                        <i class="bi bi-person me-1"></i>
                        ${escaparHtml(objeto.nome_usuario || "Contratante")}
                    </p>

                    <p class="card-text text-muted service-description-clamp mb-3">${escaparHtml(objeto.descricao || "Sem descricao cadastrada.")}</p>

                    <div class="service-rating mb-3">
                        ${renderizarRating(objeto.nota_prestador, objeto.comentario_prestador, "Avaliação do contratante", objeto.nome_avaliador_prestador, objeto.data_avaliacao_prestador)}
                    </div>

                    <p class="service-meta mb-4">
                        <span><i class="bi bi-geo-alt text-success me-1"></i>${escaparHtml(objeto.localidade || "Nao informada")}</span>
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
