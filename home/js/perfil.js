let dadosPerfil = null;
let notificacoesPerfil = [];
let modalAvaliarInstancia = null;

document.addEventListener("DOMContentLoaded", async () => {
    await valida_sessao();
    configurarModalAvaliacao();
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
        abrirAbaNotificacoesSeHash();

        if (dadosPerfil.eh_proprio_perfil) {
            await carregarNotificacoes();
        }
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
    renderizarServicosAcordados(dados.servicos_acordados, ehProprio, usuario.nome);
    renderizarAvaliacoes(dados.avaliacoes, usuario.nome);
    configurarAbaAcordos(ehProprio);
    configurarAbaNotificacoes(ehProprio);

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

function renderizarServicosAcordados(registros, ehProprio, nomeUsuario) {
    const lista = document.getElementById("lista_servicos_acordados_perfil");
    const descricao = document.getElementById("perfil_acordos_descricao");
    const acordos = Array.isArray(registros) ? registros : [];

    if (!lista || !descricao) {
        return;
    }

    descricao.textContent = ehProprio
        ? "Aqui ficam os servicos que ja foram combinados com clientes e prestadores na plataforma."
        : `Registro de servicos acordados de ${nomeUsuario || "este usuario"} indisponivel para consulta publica.`;

    if (!ehProprio) {
        lista.innerHTML = "";
        return;
    }

    if (acordos.length === 0) {
        lista.innerHTML = renderizarVazioSecao("Nenhum servico acordado ainda. Quando uma solicitacao ou proposta for aceita, ela aparece aqui.");
        return;
    }

    lista.innerHTML = acordos
        .map((registro) => renderizarCardServicoAcordado(registro))
        .join("");
}

function renderizarCardServicoAcordado(registro) {
    const linkOutraParte = linkPerfilUsuario(
        registro.id_outra_parte,
        registro.nome_outra_parte,
        `Ver perfil de ${registro.nome_outra_parte || "usuario"}`
    );
    const statusClasse = obterClasseStatusAcordo(registro.status);
    const papelUsuario = registro.papel_usuario === "cliente"
        ? "Voce contratou este servico"
        : "Voce esta atendendo este cliente";
    const profissaoOutraParte = registro.profissao_outra_parte
        ? `
            <p class="text-secondary small mb-3">
                <i class="bi bi-briefcase me-1"></i>${escaparHtml(registro.profissao_outra_parte)}
            </p>
        `
        : "";

    return `
        <div class="col-md-6 col-xl-4">
            <article class="card service-card agreement-card h-100">
                ${renderizarFotoServico({ foto: registro.foto })}
                <div class="card-body d-flex flex-column">
                    <div class="d-flex justify-content-between align-items-start gap-2 mb-3">
                        <span class="service-badge">${escaparHtml(registro.tipo_iniciativa_rotulo || "Servico acordado")}</span>
                        <span class="agreement-status-pill ${statusClasse}">${escaparHtml(registro.status_rotulo || "Acordado")}</span>
                    </div>

                    <h5 class="card-title fw-bold mb-2">${escaparHtml(registro.titulo_exibicao || "Servico acordado")}</h5>
                    <div class="mb-2">${linkOutraParte}</div>
                    <p class="text-secondary small mb-2">${escaparHtml(registro.rotulo_outra_parte || "Outra parte do acordo")}</p>
                    ${profissaoOutraParte}

                    <p class="card-text text-muted service-description-clamp mb-3">
                        ${escaparHtml(registro.descricao_exibicao || "Sem descricao complementar registrada.")}
                    </p>

                    <div class="agreement-meta mb-3">
                        <span><i class="bi bi-person-check me-1"></i>${escaparHtml(papelUsuario)}</span>
                        <span><i class="bi bi-tag me-1"></i>${escaparHtml(formatarCategoria(registro.categoria_exibicao))}</span>
                    </div>

                    <div class="agreement-meta mb-3">
                        <span><i class="bi bi-geo-alt me-1"></i>${escaparHtml(registro.localidade_exibicao || "Nao informada")}</span>
                        <span><i class="bi bi-cash-coin me-1"></i>${formatarMoeda(registro.valor_exibicao)}</span>
                    </div>

                    <div class="agreement-footer mt-auto">
                        <span><strong>Registro:</strong> ${formatarData(registro.created_at)}</span>
                        <span><strong>Atualizacao:</strong> ${formatarData(registro.updated_at)}</span>
                    </div>
                </div>
            </article>
        </div>
    `;
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
        lista.innerHTML = renderizarVazioSecao("Nenhuma avaliacao recebida ainda. As avaliacoes aparecem apos a conclusao de um servico contratado na plataforma.");
        return;
    }

    registros.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    lista.innerHTML = registros.map(renderizarItemAvaliacao).join("");
}

function abrirAbaNotificacoesSeHash() {
    if (window.location.hash !== "#notificacoes") {
        if (window.location.hash !== "#acordos") {
            return;
        }
        const tabAcordos = document.getElementById("tab-acordos");
        if (tabAcordos) {
            bootstrap.Tab.getOrCreateInstance(tabAcordos).show();
        }
        return;
    }
    const tab = document.getElementById("tab-notificacoes");
    if (tab) {
        bootstrap.Tab.getOrCreateInstance(tab).show();
    }
}

function configurarAbaAcordos(ehProprio) {
    const tabItem = document.getElementById("tab_item_acordos");
    const painel = document.getElementById("painel-acordos");

    if (!tabItem || !painel) {
        return;
    }

    tabItem.classList.toggle("d-none", !ehProprio);
    painel.classList.toggle("d-none", !ehProprio);
}

function configurarAbaNotificacoes(ehProprio) {
    const tabItem = document.getElementById("tab_item_notificacoes");
    if (!ehProprio) {
        tabItem.classList.add("d-none");
    } else {
        tabItem.classList.remove("d-none");
    }
}

function configurarModalAvaliacao() {
    const modalEl = document.getElementById("modalAvaliar");
    if (!modalEl) {
        return;
    }
    modalAvaliarInstancia = new bootstrap.Modal(modalEl);
    document.getElementById("btn_enviar_avaliacao").addEventListener("click", enviarAvaliacao);
}

async function carregarNotificacoes() {
    const lista = document.getElementById("lista_notificacoes_perfil");
    lista.innerHTML = '<p class="text-secondary">Carregando mensagens...</p>';

    try {
        const retorno = await fetch("../php/notificacoes_get.php", { credentials: "same-origin" });
        const resposta = await retorno.json();

        if (resposta.status !== "ok") {
            lista.innerHTML = renderizarVazioSecao(resposta.mensagem || "Nao foi possivel carregar as mensagens.");
            return;
        }

        notificacoesPerfil = resposta.data?.notificacoes ?? [];
        const pendentes = Number(resposta.data?.pendentes ?? 0);
        atualizarBadgeNotificacoes(pendentes);
        renderizarNotificacoes(notificacoesPerfil);
    } catch (erro) {
        console.error(erro);
        lista.innerHTML = renderizarVazioSecao("Erro ao carregar mensagens.");
    }
}

function atualizarBadgeNotificacoes(pendentes) {
    const badge = document.getElementById("badge_notificacoes");
    if (!badge) {
        return;
    }
    if (pendentes > 0) {
        badge.textContent = String(pendentes);
        badge.classList.remove("d-none");
    } else {
        badge.classList.add("d-none");
    }
}

function renderizarNotificacoes(registros) {
    const lista = document.getElementById("lista_notificacoes_perfil");

    if (!Array.isArray(registros) || registros.length === 0) {
        lista.innerHTML = renderizarVazioSecao("Nenhuma mensagem no momento.");
        return;
    }

    lista.innerHTML = registros.map(renderizarItemNotificacao).join("");
}

function renderizarItemNotificacao(notif) {
    const pendente = Number(notif.requer_acao) === 1 && Number(notif.respondida) === 0;
    const acoes = Array.isArray(notif.acoes) ? notif.acoes : [];
    const linkRemetente = linkPerfilUsuario(
        notif.id_remetente,
        notif.nome_remetente,
        `Ver perfil de ${notif.nome_remetente || "usuario"}`
    );

    return `
        <article class="notification-item ${pendente ? "pending" : ""}">
            <div class="d-flex flex-wrap justify-content-between gap-2 mb-2">
                <div>
                    <strong>${escaparHtml(notif.titulo || "Mensagem")}</strong>
                    <div class="notification-meta">${formatarData(notif.created_at)}</div>
                </div>
                ${pendente ? '<span class="badge bg-warning text-dark">Aguardando resposta</span>' : '<span class="badge bg-secondary">Arquivada</span>'}
            </div>
            <div class="mb-2">${linkRemetente}</div>
            <p class="notification-message small mb-0">${escaparHtml(notif.mensagem || "")}</p>
            ${notif.servico_titulo ? `<p class="small text-secondary mt-2 mb-0">Referencia: ${escaparHtml(notif.servico_titulo)}</p>` : ""}
            ${pendente && acoes.length > 0 ? renderizarBotoesNotificacao(notif, acoes) : ""}
        </article>
    `;
}

function renderizarBotoesNotificacao(notif, acoes) {
    const id = Number(notif.id);
    const idNeg = Number(notif.id_negociacao);
    const idRemetente = Number(notif.id_remetente);
    const botoes = [];

    if (acoes.includes("aceitar")) {
        botoes.push(`<button class="btn btn-brand btn-sm" onclick="responderNotificacao(${id}, 'aceitar')">Aceitar</button>`);
    }
    if (acoes.includes("recusar")) {
        botoes.push(`<button class="btn btn-outline-danger btn-sm" onclick="responderNotificacao(${id}, 'recusar')">Recusar</button>`);
    }
    if (acoes.includes("sim")) {
        botoes.push(`<button class="btn btn-brand btn-sm" onclick="responderNotificacao(${id}, 'sim')">Sim</button>`);
    }
    if (acoes.includes("nao")) {
        botoes.push(`<button class="btn btn-outline-secondary btn-sm" onclick="responderNotificacao(${id}, 'nao')">Nao</button>`);
    }
    if (acoes.includes("avaliar")) {
        botoes.push(`<button class="btn btn-brand btn-sm" onclick='abrirModalAvaliacao(${idNeg}, ${idRemetente}, ${JSON.stringify(notif.nome_remetente || "Usuario")})'>Avaliar</button>`);
    }

    return `<div class="notification-actions">${botoes.join("")}</div>`;
}

async function responderNotificacao(idNotificacao, resposta) {
    const confirmar = resposta === "recusar"
        ? confirm("Deseja recusar esta solicitacao?")
        : true;

    if (!confirmar) {
        return;
    }

    const formData = new FormData();
    formData.append("id_notificacao", String(idNotificacao));
    formData.append("resposta", resposta);

    try {
        const retorno = await fetch("../php/notificacao_responder.php", {
            method: "POST",
            credentials: "same-origin",
            body: formData,
        });
        const json = await retorno.json();

        if (json.status === "ok") {
            alert(json.mensagem);
            await carregarNotificacoes();
            await carregarPerfil();
        } else {
            alert("Erro: " + (json.mensagem || "Falha ao responder."));
        }
    } catch (erro) {
        console.error(erro);
        alert("Nao foi possivel enviar a resposta.");
    }
}

function abrirModalAvaliacao(idNegociacao, idAvaliado, nomeAvaliado) {
    document.getElementById("avaliar_id_negociacao").value = String(idNegociacao);
    document.getElementById("avaliar_id_avaliado").value = String(idAvaliado);
    document.getElementById("modal_avaliar_contexto").textContent =
        `Voce esta avaliando ${nomeAvaliado}. So e possivel avaliar apos o servico ter sido concluido.`;
    document.getElementById("avaliar_nota").value = "5";
    document.getElementById("avaliar_comentario").value = "";

    if (modalAvaliarInstancia) {
        modalAvaliarInstancia.show();
    }
}

async function enviarAvaliacao() {
    const formData = new FormData();
    formData.append("id_negociacao", document.getElementById("avaliar_id_negociacao").value);
    formData.append("id_avaliado", document.getElementById("avaliar_id_avaliado").value);
    formData.append("nota", document.getElementById("avaliar_nota").value);
    formData.append("comentario", document.getElementById("avaliar_comentario").value);

    try {
        const retorno = await fetch("../php/avaliacao_novo.php", {
            method: "POST",
            credentials: "same-origin",
            body: formData,
        });
        const json = await retorno.json();

        if (json.status === "ok") {
            alert(json.mensagem);
            if (modalAvaliarInstancia) {
                modalAvaliarInstancia.hide();
            }
            await carregarNotificacoes();
            await carregarPerfil();
        } else {
            alert("Erro: " + (json.mensagem || "Falha ao avaliar."));
        }
    } catch (erro) {
        console.error(erro);
        alert("Nao foi possivel enviar a avaliacao.");
    }
}

function renderizarItemAvaliacao(avaliacao) {
    const nota = Number(avaliacao.nota);
    const rotuloServico = avaliacao.servico_origem === "prestador" ? "Servico" : "Chamado";
    const linkAvaliador = linkPerfilUsuario(
        avaliacao.id_avaliador,
        avaliacao.nome_avaliador,
        avaliacao.nome_avaliador || "Usuario"
    );

    return `
        <article class="profile-review-item mb-3">
            <div class="d-flex flex-wrap justify-content-between align-items-start gap-2 mb-2">
                <div>
                    <div class="mb-1">${linkAvaliador}</div>
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

function obterClasseStatusAcordo(status) {
    const mapa = {
        aceita: "is-agreed",
        em_andamento: "is-active",
        finalizada: "is-done",
    };

    return mapa[status] || "is-agreed";
}

function formatarTipoUsuario(tipo) {
    const mapa = {
        cliente: "Contratante",
        contratante: "Contratante",
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
    if (!data) {
        return "";
    }

    const textoOriginal = String(data).trim();
    if (textoOriginal === "") {
        return "";
    }

    let dataObj = new Date(textoOriginal);
    if (Number.isNaN(dataObj.getTime())) {
        const texto = textoOriginal
            .replace(/\s+/g, 'T')
            .replace(/\//g, '-');

        dataObj = new Date(texto);

        if (Number.isNaN(dataObj.getTime())) {
            const mysqlMatch = texto.match(/^([0-9]{4})-([0-9]{2})-([0-9]{2})(?:[T ]([0-9]{2}):([0-9]{2})(?::([0-9]{2})(?:\.[0-9]+)?)?)?$/);
            if (mysqlMatch) {
                const ano = Number(mysqlMatch[1]);
                const mes = Number(mysqlMatch[2]) - 1;
                const dia = Number(mysqlMatch[3]);
                const hora = Number(mysqlMatch[4] || 0);
                const minuto = Number(mysqlMatch[5] || 0);
                const segundo = Number(mysqlMatch[6] || 0);
                dataObj = new Date(ano, mes, dia, hora, minuto, segundo);
            }
        }
    }

    if (Number.isNaN(dataObj.getTime())) {
        const brMatch = textoOriginal.match(/^([0-9]{2})\/([0-9]{2})\/([0-9]{4})(?:\s+([0-9]{2}):([0-9]{2})(?::([0-9]{2}))?)?$/);
        if (brMatch) {
            const dia = Number(brMatch[1]);
            const mes = Number(brMatch[2]) - 1;
            const ano = Number(brMatch[3]);
            const hora = Number(brMatch[4] || 0);
            const minuto = Number(brMatch[5] || 0);
            const segundo = Number(brMatch[6] || 0);
            dataObj = new Date(ano, mes, dia, hora, minuto, segundo);
        }
    }

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
