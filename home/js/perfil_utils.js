// Monta a URL publica do perfil a partir do ID do usuario.
function urlPerfilUsuario(idUsuario) {
    const id = Number(idUsuario);
    if (!id) {
        return "#";
    }
    const pathSegments = window.location.pathname.split('/');
    const rootPath = pathSegments.length > 1 ? pathSegments.slice(0, 2).join('/') : '';
    return `${rootPath}/home/html/perfil.html?id=${id}`;
}

// Escapa texto antes de inserir em HTML gerado por template string.
function escaparHtmlPerfil(valor) {
    const elemento = document.createElement("span");
    elemento.textContent = valor ?? "";
    return elemento.innerHTML;
}

// Gera o botao/link reutilizavel que aponta para a pagina de perfil.
function linkPerfilUsuario(idUsuario, nomeExibicao, textoBotao) {
    const id = Number(idUsuario);
    const nome = nomeExibicao || "Usuario";
    const texto = textoBotao || `Ver perfil de ${nome}`;

    if (!id) {
        return `<span class="text-secondary small">${escaparHtmlPerfil(nome)}</span>`;
    }

    return `
        <a href="${urlPerfilUsuario(id)}" class="profile-link-btn">
            <i class="bi bi-person-circle me-1"></i>${escaparHtmlPerfil(texto)}
        </a>
    `;
}

// Aplica o link de perfil ja renderizado em um elemento existente da tela.
function definirLinkPerfilNoElemento(elementoId, idUsuario, nomeExibicao, textoBotao) {
    const elemento = document.getElementById(elementoId);
    if (!elemento) {
        return;
    }
    elemento.innerHTML = linkPerfilUsuario(idUsuario, nomeExibicao, textoBotao);
}
