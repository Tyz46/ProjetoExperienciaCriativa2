let dadosPerfil = null;

document.addEventListener("DOMContentLoaded", async () => {
    await valida_sessao();
    await carregarPerfil();
});

function obterIdPerfilDaUrl() {
    const params = new URLSearchParams(window.location.search);
    const id = Number(params.get("id"));
    return id > 0 ? id : null;
}

async function carregarPerfil() {
    const idUrl = obterIdPerfilDaUrl();
    const url = idUrl
        ? `../php/perfil_get.php?id=${idUrl}`
        : "../php/perfil_get.php";

    try {
        const retorno = await fetch(url, { credentials: "same-origin" });
        const resposta = await retorno.json();

        if (resposta.status !== "ok" || !resposta.data) {
            mostrarErroPerfil(resposta.mensagem || "Nao foi possivel carregar o perfil.");
            return;
        }

        dadosPerfil = resposta.data;
        renderizarPerfil(dadosPerfil);
    } catch (erro) {
        console.error(erro);
        mostrarErroPerfil("Nao foi possivel carregar o perfil.");
    }
}

function mostrarErroPerfil(mensagem) {
    document.getElementById("perfil_estado_carregando").classList.remove("d-none");
    document.getElementById("perfil_conteudo").classList.add("d-none");
    document.getElementById("perfil_estado_carregando").innerHTML = `
        <div class="empty-state py-4">
            <i class="bi bi-person-x fs-1 d-block mb-3"></i>
            <h4 class="mb-2">Perfil indisponivel</h4>
            <p class="mb-0">${escaparHtml(mensagem)}</p>
        
        </div>
    `;
}

function renderizarPerfil(dados) {
    const usuario = dados.usuario;
    const perfilPrestador = dados.perfil_prestador;
    const ehProprio = dados.eh_proprio_perfil;

    document.getElementById("perfil_estado_carregando").classList.add("d-none");
    document.getElementById("perfil_conteudo").classList.remove("d-none");

    document.title = `${usuario.nome || "Perfil"} - ConsertaJa`;
    document.getElementById("perfil_contexto").textContent = ehProprio ? "Meu perfil" : "Perfil publico";
    document.getElementById("perfil_nome_titulo").textContent = usuario.nome || "Usuario";
    document.getElementById("perfil_username").textContent = `@${usuario.usuario || usuario.username || "usuario"}`;
    document.getElementById("perfil_tipo_badge").textContent = formatarTipoUsuario(usuario.tipo);

    renderizarResumoAvaliacoes(dados.resumo_avaliacoes);
    renderizarCamposInformacao(usuario, perfilPrestador, ehProprio);
    renderizarServicos(dados.servicos, ehProprio);
    renderizarAvaliacoes(dados.avaliacoes, usuario.nome);

    const botaoVoltar = document.getElementById("perfil_voltar");
    if (ehProprio) {
        botaoVoltar.href = "../html/index.html";
        botaoVoltar.textContent = "Inicio";
    } else {
        botaoVoltar.href = "javascript:history.back()";
        botaoVoltar.textContent = "Voltar";
    }
}

function renderizarResumoAvaliacoes(resumo) {
    const elemento = document.getElementById("perfil_resumo_avaliacoes");
    const media = Number(resumo?.media || 0);
    const total = Number(resumo?.total || 0);

    if (total === 0 && media <= 0) {
        elemento.innerHTML = '<span class="text-muted">Sem avaliacoes recebidas ainda.</span>';
        return;
    }

    const estrelas = renderizarEstrelas(Math.round(media));
    elemento.innerHTML = `
        ${estrelas}
        <span class="ms-2">${media.toFixed(1)} de 5 · ${total} avaliacao${total === 1 ? "" : "oes"}</span>
    `;
}

function renderizarCamposInformacao(usuario, perfilPrestador, ehProprio) {
    document.getElementById("perfil_nome").value = usuario.nome ?? "";
    document.getElementById("perfil_usuario").value = usuario.usuario ?? usuario.username ?? "";
    document.getElementById("perfil_tipo").value = formatarTipoUsuario(usuario.tipo);

    const campoEmail = document.getElementById("campo_email");
    const campoTelefone = document.getElementById("campo_telefone");
    const campoProfissao = document.getElementById("campo_profissao");
    const campoLocalidade = document.getElementById("campo_localidade");
    const campoDescricao = document.getElementById("campo_descricao_prestador");
    const resumoProfissao = document.getElementById("perfil_profissao_resumo");

    if (ehProprio) {
        document.getElementById("perfil_email").value = usuario.email ?? "";
        document.getElementById("perfil_telefone").value = usuario.telefone ?? "";
        campoEmail.classList.remove("d-none");
        campoTelefone.classList.remove("d-none");
    } else {
        campoEmail.classList.add("d-none");
        campoTelefone.classList.add("d-none");
    }

    if (perfilPrestador && (usuario.tipo === "prestador" || perfilPrestador.profissao)) {
        document.getElementById("perfil_profissao").value = perfilPrestador.profissao ?? "";
        document.getElementById("perfil_localidade").value = perfilPrestador.localidade ?? "";
        document.getElementById("perfil_descricao").value = perfilPrestador.descricao ?? "";
        campoProfissao.classList.remove("d-none");
        campoLocalidade.classList.remove("d-none");
        campoDescricao.classList.remove("d-none");
        resumoProfissao.classList.remove("d-none");
        resumoProfissao.textContent = `${perfilPrestador.profissao || "Profissional"} · ${perfilPrestador.localidade || "Localidade nao informada"}`;
    } else {
        campoProfissao.classList.add("d-none");
        campoLocalidade.classList.add("d-none");
        campoDescricao.classList.add("d-none");
        resumoProfissao.classList.add("d-none");
    }
}

function renderizarServicos(servicos, ehProprio) {
    const lista = document.getElementById("lista_servicos_perfil");
    const prestador = servicos?.prestador ?? [];
    const cliente = servicos?.cliente ?? [];
    const todos = [...prestador, ...cliente];

    document.getElementById("perfil_servicos_descricao").textContent = ehProprio
        ? "Todos os servicos que voce ofereceu e os chamados que voce publicou."
        : "Historico publico de servicos oferecidos e chamados criados por esta conta.";

    if (todos.length === 0) {
        lista.innerHTML = renderizarVazioSecao("Nenhum servico ou chamado publicado ainda.");
        return;
    }

    lista.innerHTML = todos
        .map((registro) => renderizarCardServicoPerfil(registro, ehProprio))
        .join("");
}

function renderizarCardServicoPerfil(objeto, ehProprio) {
    const origem = objeto.origem;
    const ehPrestador = origem === "prestador";
    const rotuloOrigem = ehPrestador ? "Servico oferecido" : "Chamado publicado";
    const alterarHref = ehPrestador
        ? `../../servicos/prestadores/html/prestador_alterar.html?id=${objeto.id}`
        : `../../servicos/contratantes/html/contratante_alterar.html?id=${objeto.id}`;

    const acoesProprias = ehProprio
        ? `
            <div class="mt-auto d-flex gap-2">
                <a href="${alterarHref}" class="btn btn-warning btn-sm text-dark w-50">Alterar</a>
                <button class="btn btn-danger btn-sm w-50" onclick="excluirServicoPerfil(${objeto.id}, '${origem}')">Excluir</button>
            </div>
        `
        : "";

    return `
        <div class="col-md-6 col-xl-4">
            <div class="card service-card h-100">
                ${renderizarFotoServico(objeto)}
                <div class="card-body d-flex flex-column">
                    
                    <div class="d-flex justify-content-between align-items-start gap-2 mb-2">
                        <span class="service-badge">${escaparHtml(rotuloOrigem)}</span>
                        <span class="service-price">${formatarMoeda(objeto.valor)}</span>
                    </div>
                    <h5 class="card-title fw-bold mb-2">${escaparHtml(objeto.nome || "Sem titulo")}</h5>
                    <p class="text-secondary small mb-2">${escaparHtml(formatarCategoria(objeto.tipo))}</p>
                    <p class="card-text text-muted service-description-clamp mb-3">${escaparHtml(objeto.descricao || "Sem descricao.")}</p>
                    ${ehPrestador ? `<div class="skills-list mb-3">${renderizarHabilidades(objeto.habilidades)}</div>` : ""}
                    <p class="service-meta mb-3">
                        <i class="bi bi-geo-alt text-success me-1"></i>${escaparHtml(objeto.localidade || "Nao informada")}
                    </p>
                    ${acoesProprias}
                </div>
            </div>
        </div>
    `;
}

async function excluirServicoPerfil(id, origem) {
    const confirmar = confirm(origem === "prestador"
        ? "Deseja realmente excluir este servico?"
        : "Deseja realmente excluir este chamado?");

    if (!confirmar) {
        return;
    }

    const url = origem === "prestador"
        ? `../../servicos/prestadores/php/prestadores_excluir.php?id=${id}`
        : `../../servicos/contratantes/php/contratantes_excluir.php?id=${id}`;

    const retorno = await fetch(url, { credentials: "same-origin" });
    const resposta = await retorno.json();

    if (resposta.status === "ok") {
        alert(resposta.mensagem);
        await carregarPerfil();
    } else {
        alert("Erro: " + resposta.mensagem);
    }
}

function renderizarAvaliacoes(avaliacoes, nomeUsuario) {
    const lista = document.getElementById("lista_avaliacoes_perfil");
    const registros = Array.isArray(avaliacoes) ? avaliacoes : [];

    document.getElementById("perfil_avaliacoes_descricao").textContent =
        `Comentarios e notas que outros usuarios deixaram para ${nomeUsuario || "esta conta"}.`;

    if (registros.length === 0) {
        lista.innerHTML = renderizarVazioSecao("Nenhuma avaliacao recebida ainda. A funcionalidade de enviar avaliacoes sera ampliada em breve.");
        return;
    }

    lista.innerHTML = registros.map(renderizarItemAvaliacao).join("");
}

function renderizarItemAvaliacao(avaliacao) {
    const nota = Number(avaliacao.nota);
    const rotuloServico = avaliacao.servico_origem === "prestador" ? "Servico" : "Chamado";

    return `
        <article class="profile-review-item mb-3">
            <div class="d-flex flex-wrap justify-content-between align-items-start gap-2 mb-2">
                <div>
                    <strong>${escaparHtml(avaliacao.nome_avaliador || "Usuario")}</strong>
                    <div class="small text-secondary">@${escaparHtml(avaliacao.username_avaliador || "usuario")}
                    
                    </div>
                    <div class="small text-secondary">${formatarData(avaliacao.created_at)}</div>
                </div>
                <div>${renderizarEstrelas(nota)}</div>
            </div>
            <p class="small text-secondary mb-1">${rotuloServico}: ${escaparHtml(avaliacao.servico_titulo || "Sem titulo")}</p>
            ${avaliacao.comentario
        ? `<p class="mb-0 text-muted">${escaparHtml(avaliacao.comentario)}</p>`
        : '<p class="mb-0 text-secondary small">Sem comentario.</p>'}
        </article>
    `;
}

function renderizarVazioSecao(mensagem) {
    return `
        <div class="empty-state py-4">
            <i class="bi bi-inbox fs-1 d-block mb-3"></i>
            <p class="mb-0 text-secondary">${escaparHtml(mensagem)}</p>
        </div>
    `;
}

function renderizarFotoServico(objeto) {
    const foto = obterPrimeiraFoto(objeto.foto);
    if (!foto) {
        return "";
    }
    return `<img src="${escaparHtml(foto)}" class="service-photo" alt="Foto">`;
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

function renderizarHabilidades(valor) {
    const habilidades = parsearHabilidades(valor);
    if (habilidades.length === 0) {
        return '<span class="skill-chip muted">Sem habilidades</span>';
    }
    return habilidades.map((h) => `<span class="skill-chip">${escaparHtml(h)}</span>`).join("");
}

function parsearHabilidades(valor) {
    if (!valor) {
        return [];
    }
    try {
        const lista = JSON.parse(valor);
        return Array.isArray(lista) ? lista : [];
    } catch (erro) {
        return [];
    }
}

function renderizarEstrelas(nota) {
    const estrelas = [];
    for (let i = 1; i <= 5; i += 1) {
        estrelas.push(
            i <= nota
                ? '<i class="bi bi-star-fill text-warning"></i>'
                : '<i class="bi bi-star text-muted"></i>'
        );
    }
    return estrelas.join(" ");
}

function formatarTipoUsuario(tipo) {
    const mapa = {
        cliente: "Cliente",
        prestador: "Prestador",
        admin: "Administrador",
    };
    return mapa[tipo] || tipo || "-";
}

function formatarMoeda(valor) {
    const numero = Number(valor);
    if (Number.isNaN(numero) || numero <= 0) {
        return "A negociar";
    }
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(numero);
}

function formatarCategoria(categoria) {
    return categoria || "Sem categoria";
}

function formatarData(data) {
    const dataObj = new Date(data);
    if (Number.isNaN(dataObj.getTime())) {
        return "";
    }
    return dataObj.toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

function escaparHtml(valor) {
    const elemento = document.createElement("span");
    elemento.textContent = valor ?? "";
    return elemento.innerHTML;
}
