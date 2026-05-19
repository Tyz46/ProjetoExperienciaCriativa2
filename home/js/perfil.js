let usuarioPerfil = null;

document.addEventListener("DOMContentLoaded", async () => {
    await valida_sessao();
    await carregarPerfil();
});

async function carregarPerfil() {
    try {
        const retorno = await fetch("../php/usuario_get.php?perfil=1", {
            credentials: "same-origin"
        });
        const resposta = await retorno.json();

        if (resposta.status !== "ok" || resposta.data.length === 0) {
            renderizarVazioPerfil("Nao foi possivel carregar os dados do perfil.");
            return;
        }

        usuarioPerfil = resposta.data[0];
        preencherDados(usuarioPerfil);
        await carregarRegistrosDoPerfil();
    } catch (erro) {
        console.error(erro);
        renderizarVazioPerfil("Nao foi possivel carregar os dados do perfil.");
    }
}

function preencherDados(usuario) {
    document.getElementById("perfil_nome").value = usuario.nome ?? "";
    document.getElementById("perfil_usuario").value = usuario.usuario ?? "";
    document.getElementById("perfil_email").value = usuario.email ?? "";
    document.getElementById("perfil_telefone").value = usuario.telefone ?? "";
    document.getElementById("perfil_tipo").value = usuario.tipo ?? "";
}

async function carregarRegistrosDoPerfil() {
    const tipo = usuarioPerfil?.tipo ?? "";

    if (tipo === "prestador") {
        configurarCabecalhoRegistros("Seus servicos", "Aqui aparecem apenas os servicos criados por esta conta de prestador.");
        await carregarListaUnica("../../servicos/prestadores/php/prestadores_get.php?meus=1", "prestador");
        return;
    }

    if (tipo === "contratante") {
        configurarCabecalhoRegistros("Seus chamados", "Aqui aparecem apenas os chamados criados por esta conta de contratante.");
        await carregarListaUnica("../../servicos/contratantes/php/contratantes_get.php?meus=1", "contratante");
        return;
    }

    configurarCabecalhoRegistros("Seus registros", "Como esta conta e administradora, os itens proprios foram separados por origem.");
    await carregarListasAdmin();
}

function configurarCabecalhoRegistros(titulo, descricao) {
    document.getElementById("perfil_registros_titulo").textContent = titulo;
    document.getElementById("perfil_registros_descricao").textContent = descricao;
}

async function carregarListaUnica(url, origem) {
    const lista = document.getElementById("lista_registros");

    try {
        const retorno = await fetch(url, {
            credentials: "same-origin"
        });
        const resposta = await retorno.json();

        if (resposta.status !== "ok") {
            lista.innerHTML = renderizarVazioLista(origem);
            return;
        }

        const registros = Array.isArray(resposta.data) ? resposta.data : [];
        if (registros.length === 0) {
            lista.innerHTML = renderizarVazioLista(origem);
            return;
        }

        lista.innerHTML = registros.map((registro) => renderizarCardPerfil(registro, origem)).join("");
    } catch (erro) {
        console.error(erro);
        lista.innerHTML = renderizarVazioLista(origem, "Nao foi possivel carregar os registros desta conta.");
    }
}

async function carregarListasAdmin() {
    const lista = document.getElementById("lista_registros");

    try {
        const [prestadores, contratantes] = await Promise.all([
            buscarRegistros("../../servicos/prestadores/php/prestadores_get.php?meus=1"),
            buscarRegistros("../../servicos/contratantes/php/contratantes_get.php?meus=1")
        ]);

        const blocos = [];

        if (prestadores.length > 0) {
            blocos.push(`
                <div class="col-12">
                    <h4 class="mb-3">Seus servicos de prestador</h4>
                    <div class="row g-4">
                        ${prestadores.map((registro) => renderizarCardPerfil(registro, "prestador")).join("")}
                    </div>
                </div>
            `);
        }

        if (contratantes.length > 0) {
            blocos.push(`
                <div class="col-12">
                    <h4 class="mb-3">Seus chamados de contratante</h4>
                    <div class="row g-4">
                        ${contratantes.map((registro) => renderizarCardPerfil(registro, "contratante")).join("")}
                    </div>
                </div>
            `);
        }

        lista.innerHTML = blocos.length > 0 ? blocos.join("") : renderizarVazioLista("admin");
    } catch (erro) {
        console.error(erro);
        lista.innerHTML = renderizarVazioLista("admin", "Nao foi possivel carregar os registros desta conta.");
    }
}

async function buscarRegistros(url) {
    const retorno = await fetch(url, {
        credentials: "same-origin"
    });
    const resposta = await retorno.json();

    if (resposta.status !== "ok") {
        return [];
    }

    return Array.isArray(resposta.data) ? resposta.data : [];
}

async function excluirRegistro(id, origem) {
    const confirmar = confirm(origem === "prestador"
        ? "Deseja realmente excluir este servico?"
        : "Deseja realmente excluir este chamado?");

    if (!confirmar) {
        return;
    }

    const url = origem === "prestador"
        ? `../../servicos/prestadores/php/prestadores_excluir.php?id=${id}`
        : `../../servicos/contratantes/php/contratantes_excluir.php?id=${id}`;

    const retorno = await fetch(url, {
        credentials: "same-origin"
    });
    const resposta = await retorno.json();

    if (resposta.status === "ok") {
        alert(resposta.mensagem);
        await carregarRegistrosDoPerfil();
    } else {
        alert("Erro: " + resposta.mensagem);
    }
}

function renderizarCardPerfil(objeto, origem) {
    const tituloAcao = origem === "prestador" ? "servico" : "chamado";
    const alterarHref = origem === "prestador"
        ? `../../servicos/prestadores/html/prestador_alterar.html?id=${objeto.id}`
        : `../../servicos/contratantes/html/contratante_alterar.html?id=${objeto.id}`;

    return `
        <div class="col-md-6 col-xl-4">
            <div class="card service-card">
                ${renderizarFoto(objeto, tituloAcao)}
                <div class="card-body d-flex flex-column">
                    <div class="d-flex justify-content-between align-items-start gap-3 mb-3">
                        <span class="service-badge">${escaparHtml(formatarCategoria(objeto.tipo))}</span>
                        <span class="service-price">${formatarMoeda(objeto.valor)}</span>
                    </div>

                    <h5 class="card-title fw-bold mb-2">${escaparHtml(objeto.nome || "Sem nome")}</h5>
                    ${origem === "prestador" ? `
                        <p class="text-secondary small mb-3">
                            <i class="bi bi-person-workspace me-1"></i>
                            ${escaparHtml(objeto.profissao || "Profissao nao informada")}
                        </p>
                    ` : ""}

                    <p class="card-text text-muted service-description-clamp mb-3">${escaparHtml(objeto.descricao || "Sem descricao cadastrada.")}</p>

                    ${origem === "prestador" ? `
                        <div class="skills-list mb-3">${renderizarHabilidades(objeto.habilidades)}</div>
                        <div class="detail-block mb-3">
                            <strong class="d-block mb-2">Especialidades tecnicas</strong>
                            <span class="text-muted">${escaparHtml(resumirTexto(objeto.descricao_especialidades || "Nao informadas.", 120))}</span>
                        </div>
                    ` : ""}

                    <p class="service-meta mb-4">
                        <span><i class="bi bi-geo-alt text-success me-1"></i>${escaparHtml(objeto.localidade || "Nao informada")}</span>
                    </p>

                    <div class="mt-auto d-flex gap-2">
                        <a href="${alterarHref}" class="btn btn-warning btn-sm text-dark w-50">Alterar</a>
                        <button class="btn btn-danger btn-sm w-50" onclick="excluirRegistro(${objeto.id}, '${origem}')">Excluir</button>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function renderizarFoto(objeto, tituloAcao) {
    const foto = obterPrimeiraFoto(objeto.foto);

    if (!foto) {
        return "";
    }

    return `<img src="${escaparHtml(foto)}" class="service-photo" alt="Foto do ${escaparHtml(tituloAcao)}">`;
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

function renderizarVazioPerfil(mensagem) {
    document.getElementById("lista_registros").innerHTML = `
        <div class="col-12">
            <div class="empty-state">
                <i class="bi bi-person-circle fs-1 d-block mb-3"></i>
                <h4 class="mb-2">Perfil indisponivel</h4>
                <p class="mb-0">${mensagem}</p>
            </div>
        </div>
    `;
}

function renderizarVazioLista(origem, mensagem) {
    let titulo = "Nenhum registro encontrado";
    let texto = mensagem || "Esta conta ainda nao publicou nenhum item.";

    if (origem === "prestador") {
        titulo = "Nenhum servico cadastrado";
        texto = mensagem || "Esta conta ainda nao publicou servicos.";
    } else if (origem === "contratante") {
        titulo = "Nenhum chamado cadastrado";
        texto = mensagem || "Esta conta ainda nao publicou chamados.";
    }

    return `
        <div class="col-12">
            <div class="empty-state">
                <i class="bi bi-briefcase fs-1 d-block mb-3"></i>
                <h4 class="mb-2">${titulo}</h4>
                <p class="mb-0">${texto}</p>
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

function escaparHtml(valor) {
    const elemento = document.createElement("span");
    elemento.textContent = valor;
    return elemento.innerHTML;
}
